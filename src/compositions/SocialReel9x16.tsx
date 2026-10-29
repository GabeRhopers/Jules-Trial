import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  type CalculateMetadataFunction,
} from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { KineticCaptions } from "../components/KineticCaptions";
import { MusicBed } from "../components/MusicBed";
import { ProgressBar } from "../components/ProgressBar";
import { QcProbe } from "../components/QcProbe";
import { BrandProvider } from "../lib/brand-context";
import { useBrandFonts } from "../lib/fonts";
import { resolveVideo, type ResolvedProps } from "../lib/load-video";
import { REEL_SAFE_ZONE, reelSafeRect } from "../lib/safe-zones";
import { TRANSITION_MS } from "../lib/timeline";
import { brandTransition } from "../lib/transitions";
import { ReelScene } from "./reel/ReelScenes";

export const REEL = { width: 1080, height: 1920, fps: 30 } as const;

const SAFE = reelSafeRect(REEL.width, REEL.height);
const RAIL = {
  x: REEL.width - REEL_SAFE_ZONE.rightRail.width,
  y: REEL.height - REEL_SAFE_ZONE.rightRail.bottom,
  width: REEL_SAFE_ZONE.rightRail.width,
  height: REEL_SAFE_ZONE.rightRail.bottom,
};
/** Inner padding so text never touches the safe-zone edge */
const PAD = 25;
const CAPTION_BOTTOM = SAFE.y + SAFE.height - 10;
/** Captions are centered and kept 10 px clear of the right-side action rail */
const CAPTION_WIDTH = 2 * (RAIL.x - 10 - REEL.width / 2);

export const calculateReelMetadata: CalculateMetadataFunction<
  ResolvedProps
> = async ({ props, abortSignal }) => {
  const resolved = await resolveVideo(props, REEL.fps, abortSignal);
  return {
    durationInFrames: resolved.timeline.durationInFrames,
    props: { ...props, resolved },
  };
};

export const SocialReel9x16: React.FC<ResolvedProps> = ({
  resolved,
  showSafeZones,
  qc,
}) => {
  if (!resolved)
    throw new Error(
      "SocialReel9x16 needs calculateMetadata to resolve the video",
    );
  const { video, brand, logoSrc, timeline } = resolved;
  const fonts = useBrandFonts(brand);
  const transitionFrames = Math.round((TRANSITION_MS / 1000) * REEL.fps);
  const pointCount = video.scenes.filter(
    (s) => s.visual.kind === "point",
  ).length;
  const allWords = timeline.scenes.flatMap((s) => s.words);
  const speech = timeline.scenes.map(
    (s) =>
      [
        Math.floor((s.words[0].startMs / 1000) * REEL.fps),
        Math.ceil((s.words[s.words.length - 1].endMs / 1000) * REEL.fps),
      ] as [number, number],
  );

  return (
    <BrandProvider brand={brand} fonts={fonts} logoSrc={logoSrc}>
      <AbsoluteFill>
        <BrandBackground />

        {/* Visual layer. Each scene except the last is extended by the transition length,
          so after the overlap every scene still starts exactly when its narration starts. */}
        <AbsoluteFill
          style={{
            left: SAFE.x + PAD,
            top: SAFE.y + 70,
            width: SAFE.width - PAD * 2,
            height: 680,
          }}
        >
          <TransitionSeries>
            {timeline.scenes.flatMap((scene, i) => {
              const isLast = i === timeline.scenes.length - 1;
              const config = video.scenes[i];
              const items = [
                <TransitionSeries.Sequence
                  key={scene.id}
                  name={scene.id}
                  durationInFrames={
                    scene.durationInFrames + (isLast ? 0 : transitionFrames)
                  }
                >
                  <ReelScene
                    visual={config.visual}
                    pointCount={pointCount}
                    pointLabel={video.pointLabel ?? "Point"}
                  />
                </TransitionSeries.Sequence>,
              ];
              if (!isLast) {
                items.push(
                  <TransitionSeries.Transition
                    key={`${scene.id}-transition`}
                    presentation={brandTransition(brand)}
                    timing={linearTiming({
                      durationInFrames: transitionFrames,
                    })}
                  />,
                );
              }
              return items;
            })}
          </TransitionSeries>
        </AbsoluteFill>

        {/* Narration: one audio file per scene, placed on the global timeline */}
        {timeline.scenes.map((scene) => (
          <Sequence
            key={`audio-${scene.id}`}
            name={`voice ${scene.id}`}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
            layout="none"
          >
            <Audio src={staticFile(scene.audio)} />
          </Sequence>
        ))}
        {brand.music ? <MusicBed file={brand.music} speech={speech} /> : null}

        <KineticCaptions
          words={allWords}
          style={{
            position: "absolute",
            left: (REEL.width - CAPTION_WIDTH) / 2,
            width: CAPTION_WIDTH,
            bottom: REEL.height - CAPTION_BOTTOM,
          }}
        />

        <ProgressBar
          color={brand.colors.accent}
          style={{
            position: "absolute",
            left: SAFE.x + PAD,
            top: SAFE.y + 16,
            width: SAFE.width - PAD * 2,
          }}
        />

        {showSafeZones ? <SafeZoneGuides /> : null}
        {qc ? (
          <QcProbe safe={SAFE} keepClear={RAIL} ready={fonts.ready} />
        ) : null}
      </AbsoluteFill>
    </BrandProvider>
  );
};

/** Studio-only overlay: red = platform UI areas, cyan = safe content area. */
const SafeZoneGuides: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: SAFE.y,
        background: "rgba(255,0,0,0.25)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: SAFE.y + SAFE.height,
        width: "100%",
        bottom: 0,
        background: "rgba(255,0,0,0.25)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: RAIL.x,
        top: RAIL.y,
        width: RAIL.width,
        height: SAFE.y + SAFE.height - RAIL.y,
        background: "rgba(255,0,0,0.25)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: SAFE.x,
        top: SAFE.y,
        width: SAFE.width,
        height: SAFE.height,
        border: "3px dashed cyan",
      }}
    />
  </AbsoluteFill>
);
