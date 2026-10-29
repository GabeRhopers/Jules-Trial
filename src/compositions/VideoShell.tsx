import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import type { ReactNode } from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { KineticCaptions } from "../components/KineticCaptions";
import { MusicBed } from "../components/MusicBed";
import { ProgressBar } from "../components/ProgressBar";
import { QcProbe } from "../components/QcProbe";
import { BrandProvider } from "../lib/brand-context";
import { useBrandFonts } from "../lib/fonts";
import type { ResolvedProps } from "../lib/load-video";
import type { Rect } from "../lib/safe-zones";
import { TRANSITION_MS, type TimedScene } from "../lib/timeline";
import { brandTransition } from "../lib/transitions";
import type { SceneConfig, VideoConfig } from "../lib/types";

export type ShellLayout = {
  width: number;
  height: number;
  fps: number;
  /** Every text element must stay inside this rectangle (checked by QC) */
  safe: Rect;
  /** Area that must stay clear (e.g. the Reels action rail) */
  keepClear?: Rect;
  /** Where scene foregrounds are laid out */
  sceneArea: Rect;
  captions: {
    left: number;
    width: number;
    /** Distance from the bottom edge of the frame */
    bottom: number;
    /** Multiplier on the brand's caption size, so captions fit each format */
    scale: number;
    maxWordsPerPage: number;
  };
  /** Progress bar position, or null for none */
  progress: Rect | null;
};

export type SceneRenderArgs = {
  config: SceneConfig;
  scene: TimedScene;
  video: VideoConfig;
  pointCount: number;
  pointLabel: string;
  brollAvailable: string[];
};

type Props = ResolvedProps & {
  layout: ShellLayout;
  /** Draws one scene. Scenes get the full frame (for full-bleed B-roll) and should place text inside layout.sceneArea. */
  renderScene: (args: SceneRenderArgs) => ReactNode;
};

/**
 * Shared frame for every format: brand + fonts, background, narration-timed scenes with brand
 * transitions, per-scene voice tracks, ducked music, kinetic captions, progress bar, QC probe.
 */
export const VideoShell: React.FC<Props> = ({ resolved, showSafeZones, qc, layout, renderScene }) => {
  if (!resolved) throw new Error("This composition needs calculateMetadata to resolve the video");
  const { video, brand, logoSrc, timeline, music, brollAvailable } = resolved;
  const fonts = useBrandFonts(brand);
  const transitionFrames = Math.round((TRANSITION_MS / 1000) * layout.fps);
  const pointCount = video.scenes.filter((s) => s.visual.kind === "point").length;
  const pointLabel = video.pointLabel ?? "Point";
  const allWords = timeline.scenes.flatMap((s) => s.words);
  const speech = timeline.scenes.map(
    (s) => [Math.floor((s.words[0].startMs / 1000) * layout.fps), Math.ceil((s.words[s.words.length - 1].endMs / 1000) * layout.fps)] as [number, number],
  );
  const { captions, safe, keepClear } = layout;

  return (
    <BrandProvider brand={brand} fonts={fonts} logoSrc={logoSrc}>
      <AbsoluteFill>
        <BrandBackground />

        {/* Each scene except the last is extended by the transition length, so after the
            overlap every scene still starts exactly when its narration starts. */}
        <TransitionSeries>
          {timeline.scenes.flatMap((scene, i) => {
            const isLast = i === timeline.scenes.length - 1;
            const items = [
              <TransitionSeries.Sequence key={scene.id} name={scene.id} durationInFrames={scene.durationInFrames + (isLast ? 0 : transitionFrames)}>
                {renderScene({ config: video.scenes[i], scene, video, pointCount, pointLabel, brollAvailable })}
              </TransitionSeries.Sequence>,
            ];
            if (!isLast) {
              items.push(
                <TransitionSeries.Transition
                  key={`${scene.id}-transition`}
                  presentation={brandTransition(brand)}
                  timing={linearTiming({ durationInFrames: transitionFrames })}
                />,
              );
            }
            return items;
          })}
        </TransitionSeries>

        {timeline.scenes.map((scene) => (
          <Sequence key={`audio-${scene.id}`} name={`voice ${scene.id}`} from={scene.startFrame} durationInFrames={scene.durationInFrames} layout="none">
            <Audio src={staticFile(scene.audio)} />
          </Sequence>
        ))}
        {music ? <MusicBed file={music} speech={speech} /> : null}

        <KineticCaptions
          words={allWords}
          scale={captions.scale}
          maxWordsPerPage={captions.maxWordsPerPage}
          style={{ position: "absolute", left: captions.left, width: captions.width, bottom: captions.bottom }}
        />

        {layout.progress ? (
          <ProgressBar
            color={brand.colors.accent}
            style={{ position: "absolute", left: layout.progress.x, top: layout.progress.y, width: layout.progress.width }}
            height={layout.progress.height}
          />
        ) : null}

        {showSafeZones ? <SafeZoneGuides layout={layout} /> : null}
        {qc ? <QcProbe safe={safe} keepClear={keepClear} ready={fonts.ready} /> : null}
      </AbsoluteFill>
    </BrandProvider>
  );
};

/** Places scene text inside the layout's scene area, vertically centered. */
export const SceneArea: React.FC<{ rect: Rect; align?: "center" | "end"; children: ReactNode }> = ({ rect, align = "center", children }) => (
  <div
    style={{
      position: "absolute",
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      display: "flex",
      flexDirection: "column",
      justifyContent: align === "center" ? "center" : "flex-end",
    }}
  >
    {children}
  </div>
);

/** Studio-only overlay: red = outside the safe area / keep-clear zones, cyan = safe area, yellow = scene area. */
const SafeZoneGuides: React.FC<{ layout: ShellLayout }> = ({ layout }) => {
  const { safe, keepClear, sceneArea, width } = layout;
  const red = "rgba(255,0,0,0.25)";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width, height: safe.y, background: red }} />
      <div style={{ position: "absolute", left: 0, top: safe.y + safe.height, width, bottom: 0, background: red }} />
      <div style={{ position: "absolute", left: 0, top: safe.y, width: safe.x, height: safe.height, background: red }} />
      <div style={{ position: "absolute", left: safe.x + safe.width, top: safe.y, right: 0, height: safe.height, background: red }} />
      {keepClear ? (
        <div style={{ position: "absolute", left: keepClear.x, top: keepClear.y, width: keepClear.width, height: Math.max(0, safe.y + safe.height - keepClear.y), background: red }} />
      ) : null}
      <div style={{ position: "absolute", left: safe.x, top: safe.y, width: safe.width, height: safe.height, border: "3px dashed cyan" }} />
      <div style={{ position: "absolute", left: sceneArea.x, top: sceneArea.y, width: sceneArea.width, height: sceneArea.height, border: "2px dashed yellow" }} />
    </AbsoluteFill>
  );
};
