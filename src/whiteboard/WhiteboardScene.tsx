import { evolvePath, getPointAtLength } from "@remotion/paths";
import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";
import type { Rect } from "../lib/safe-zones";
import type { TimedScene } from "../lib/timeline";
import type { SceneVisual } from "../lib/types";
import { layoutWhiteboard, type Point, type Stroke, type WhiteboardSizes } from "./geometry";
import { Marker } from "./Marker";
import { MAX_GROUP_MS, PEN_LIFT_PX, PEN_SPEED, resolveWhiteboardStyle } from "./style";
import { scheduleGroups, strokeWindows } from "./timing";

type Props = {
  visual: Extract<SceneVisual, { kind: "whiteboard" }>;
  sceneId: string;
  scene: TimedScene;
  area: Rect;
  sizes: WhiteboardSizes;
};

type TimedStroke = Stroke & { startMs: number; endMs: number };

/** Gaps shorter than this keep the marker on the board; longer gaps send it out of frame */
const STAY_MS = 700;
const MOVE_MS = 320;

/**
 * Whiteboard scene: paper background, a handwritten title, then icons, labels, arrows and circles drawn
 * stroke by stroke while a marker follows the pen tip. Each item starts on its cue word in the narration.
 */
export const WhiteboardScene: React.FC<Props> = ({ visual, sceneId, scene, area, sizes }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { brand } = useBrand();
  const style = resolveWhiteboardStyle(brand);

  const { strokes, bounds, rushed } = useMemo(() => {
    const { groups, bounds } = layoutWhiteboard({
      sceneId,
      title: visual.title,
      layout: visual.layout ?? "flow",
      items: visual.items,
      area,
      sizes,
      font: style.font,
      ink: style.ink,
      highlight: style.highlight,
    });
    // Narration words relative to this scene's start
    const offsetMs = (scene.startFrame / fps) * 1000;
    const words = scene.words.map((w) => ({ ...w, startMs: w.startMs - offsetMs, endMs: w.endMs - offsetMs }));
    const sceneMs = (scene.durationInFrames / fps) * 1000;
    const pxPerMs = (PEN_SPEED[brand.style.motion] * (height / 1080)) / 1000;
    const lift = PEN_LIFT_PX * (height / 1080);
    const windows = scheduleGroups(
      groups.map((g) => {
        const raw = g.strokes.reduce((sum, s) => sum + s.length + lift, 0) / pxPerMs;
        return { cue: g.cue, fixedMs: g.isTitle ? 150 : undefined, naturalMs: Math.min(raw, g.isTitle ? MAX_GROUP_MS.title : MAX_GROUP_MS.item) };
      }),
      words,
      sceneMs,
      sceneId,
    );
    const timed: TimedStroke[] = groups.flatMap((g, i) => {
      const spans = strokeWindows(
        g.strokes.map((s) => s.length),
        windows[i],
        lift,
      );
      return g.strokes.map((s, k) => ({ ...s, startMs: spans[k][0], endMs: spans[k][1] }));
    });
    return { strokes: timed, bounds, rushed: windows.filter((w) => w.compressed).length };
  }, [visual, sceneId, scene, area, sizes, style.font, style.ink, style.highlight, brand.style.motion, fps, height]);

  const t = (frame / fps) * 1000;
  const tip = markerPosition(strokes, t, { x: width * 1.08, y: height * 1.15 });

  return (
    <AbsoluteFill style={{ backgroundColor: style.paper }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.6) 0%, rgba(0,0,0,0.06) 100%)" }} />
      <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
        {strokes.map((s, i) => {
          if (t <= s.startMs) return null;
          const p = s.endMs > s.startMs ? Math.min(1, (t - s.startMs) / (s.endMs - s.startMs)) : 1;
          const evo = p < 1 ? evolvePath(p, s.d) : null;
          return (
            <path
              key={i}
              d={s.d}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={evo?.strokeDasharray}
              strokeDashoffset={evo?.strokeDashoffset}
            />
          );
        })}
      </svg>
      {/* Quality check: everything drawn must stay in the safe zone and clear of captions */}
      <div
        data-qc="whiteboard"
        data-qc-note={rushed > 0 ? `whiteboard scene "${sceneId}": ${rushed} drawing(s) sped up because cue words are too close together` : undefined}
        style={{ position: "absolute", left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height, pointerEvents: "none" }}
      />
      {tip ? <Marker tip={tip} frameHeight={height} ink={style.ink} brandId={brand.id} hand={style.hand} /> : null}
    </AbsoluteFill>
  );
};

const ease = Easing.inOut(Easing.cubic);
const lerp = (a: Point, b: Point, p: number): Point => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });

/**
 * Where the pen tip is at time t: on the stroke being drawn; gliding between strokes during short pen
 * lifts; moving out of frame (to `rest`) during longer pauses. null = out of frame, not rendered.
 */
export const markerPosition = (strokes: TimedStroke[], t: number, rest: Point): Point | null => {
  const k = strokes.findIndex((s) => t >= s.startMs && t < s.endMs);
  if (k >= 0) {
    const s = strokes[k];
    return getPointAtLength(s.d, s.length * ((t - s.startMs) / (s.endMs - s.startMs)));
  }
  const prev = strokes.findLast((s) => s.endMs <= t);
  const next = strokes.find((s) => s.startMs > t);
  if (prev && next && next.startMs - prev.endMs <= STAY_MS) {
    const p = interpolate(t, [prev.endMs, next.startMs], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return lerp(prev.to, next.from, p);
  }
  if (next && next.startMs - t < MOVE_MS) {
    return lerp(rest, next.from, ease(1 - (next.startMs - t) / MOVE_MS));
  }
  if (prev && t - prev.endMs < MOVE_MS) {
    return lerp(prev.to, rest, ease((t - prev.endMs) / MOVE_MS));
  }
  return null;
};
