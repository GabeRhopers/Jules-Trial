// Lorin® OEM total-cost story, in 9:16 and 16:9. Text, timing and images come from stories/lorin-total-cost/config.json;
// each format has its own layout (positions below), so wording and timing changes update both versions.
// Brand rules (Lorin Sales Team Playbook): Red Orange #DD4F05 used sparingly for emphasis, Navy #00263E for panels,
// Poppins Bold/Regular, logo only on white via the official animated logo file, never over photos.
import { Audio, Video } from "@remotion/media";
import { createContext, useContext, type ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { QcProbe } from "../components/QcProbe";
import { useBrandFonts } from "../lib/fonts";
import { getBrand } from "../lib/registry";
import { REEL_SAFE_ZONE, reelSafeRect } from "../lib/safe-zones";
import iconData from "../whiteboard/icons.json";
import config from "../../stories/lorin-total-cost/config.json";

export type StoryFormat = "9x16" | "16x9";
export const STORY_SIZES: Record<StoryFormat, { width: number; height: number; fps: number }> = {
  "9x16": { width: 1080, height: 1920, fps: 30 },
  "16x9": { width: 1920, height: 1080, fps: 30 },
};
/** Kept for older imports */
export const STORY_SIZE = STORY_SIZES["9x16"];
const SAFE_TALL = reelSafeRect(1080, 1920);
const RAIL = { x: 1080 - REEL_SAFE_ZONE.rightRail.width, y: 1920 - REEL_SAFE_ZONE.rightRail.bottom, width: REEL_SAFE_ZONE.rightRail.width, height: REEL_SAFE_ZONE.rightRail.bottom };
/** 16:9 title-safe area: 90% of the frame */
const SAFE_WIDE = { x: 96, y: 54, width: 1728, height: 972 };

const FormatContext = createContext<StoryFormat>("9x16");
const useWide = () => useContext(FormatContext) === "16x9";
/** Pick the value for the current format */
const useV = () => {
  const wide = useWide();
  return <T,>(tall: T, wideValue: T): T => (wide ? wideValue : tall);
};
/** Masked wipe between scenes */
const WIPE = 0.6;

const ORANGE = "#DD4F05";
const NAVY = "#00263E";
const ICONS = (iconData as unknown as { icons: Record<string, string[]> }).icons;
const C = config;

const SCENES = ["open", "factors", "steps", "compare", "proof", "end"] as const;
export const storyDurationSec = SCENES.reduce((t, s) => t + C[s].dur, 0);
const sceneStart = (name: (typeof SCENES)[number]) => SCENES.slice(0, SCENES.indexOf(name)).reduce((t, s) => t + C[s].dur, 0);

type Fonts = { heading: string; body: string };
const ease = Easing.bezier(0.22, 1, 0.36, 1);

// ---------- building blocks ----------

/** Photo filling the frame, with a slow, eased pan and zoom (focus points are fractions of the image). */
const PannedImage: React.FC<{
  src: string;
  durSec: number;
  pan: { fromX: number; toX: number; focusY: number; zoomFrom: number; zoomTo: number };
  height?: number;
  width?: number;
  x?: number;
  imgW: number;
  imgH: number;
}> = ({ src, durSec, pan, height, width, x = 0, imgW, imgH }) => {
  const frame = useCurrentFrame();
  const { fps, width: FW, height: FH } = useVideoConfig();
  const W = width ?? FW - x;
  height = height ?? FH;
  const p = interpolate(frame, [0, durSec * fps], [0, 1], { easing: Easing.inOut(Easing.sin), extrapolateRight: "clamp" });
  const zoom = interpolate(p, [0, 1], [pan.zoomFrom, pan.zoomTo]);
  const cover = Math.max(W / imgW, height / imgH) * zoom;
  const w = imgW * cover;
  const h = imgH * cover;
  const fx = interpolate(p, [0, 1], [pan.fromX, pan.toX]);
  const left = Math.min(0, Math.max(W - w, W / 2 - fx * w));
  const top = Math.min(0, Math.max(height - h, height / 2 - pan.focusY * h));
  return (
    <div style={{ position: "absolute", left: x, top: 0, width: W, height, overflow: "hidden" }}>
      <Img src={staticFile(`${C.imageDir}/${src}`)} style={{ position: "absolute", left, top, width: w, height: h }} />
    </div>
  );
};

/** Text that slides up out of a mask, line by line; slides up and out at `out`. */
const Reveal: React.FC<{
  text: string;
  atSec: number;
  outSec?: number;
  size: number;
  color: string;
  weight?: 400 | 700;
  align?: "left" | "center";
  font: string;
  lineHeight?: number;
  qc?: string;
}> = ({ text, atSec, outSec, size, color, weight = 700, align = "left", font, lineHeight = 1.16, qc = "text" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split("\n");
  const settled = frame >= (atSec + 0.7 + lines.length * 0.08) * fps && (outSec === undefined || frame < outSec * fps);
  return (
    <div data-qc={settled ? qc : undefined} style={{ fontFamily: font, fontWeight: weight, fontSize: size, lineHeight, color, textAlign: align, letterSpacing: "-0.01em" }}>
      {lines.map((line, i) => {
        const inP = interpolate(frame, [(atSec + i * 0.08) * fps, (atSec + i * 0.08 + 0.6) * fps], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const outP = outSec === undefined ? 0 : interpolate(frame, [(outSec + i * 0.04) * fps, (outSec + i * 0.04 + 0.4) * fps], [0, 1], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: size * 0.08, marginBottom: -size * 0.08 }}>
            <div style={{ transform: `translateY(${(1 - inP) * 105 - outP * 105}%)`, whiteSpace: "nowrap" }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

/** A short Red Orange rule that draws in, used as a quiet emphasis mark. */
const Rule: React.FC<{ atSec: number; width?: number; color?: string }> = ({ atSec, width = 96, color = ORANGE }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + 0.5) * fps], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ width: width * p, height: 6, backgroundColor: color }} />;
};

const Icon: React.FC<{ name: string; size: number; color: string; stroke?: number }> = ({ name, size, color, stroke = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {(ICONS[name] ?? []).map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

/** Next scene wipes in from the right behind a thin Red Orange edge (a masked transition). */
const Wipe: React.FC<{ children: ReactNode; first?: boolean }> = ({ children, first }) => {
  const frame = useCurrentFrame();
  const { fps, width: W } = useVideoConfig();
  if (first) return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = interpolate(frame, [0, WIPE * fps], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" });
  const edge = W * (1 - p);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${edge}px)` }}>{children}</AbsoluteFill>
      {p < 1 ? <div style={{ position: "absolute", top: 0, bottom: 0, left: edge - 4, width: 8, backgroundColor: ORANGE }} /> : null}
    </AbsoluteFill>
  );
};

const Tick: React.FC<{ atSec: number; volume?: number; file?: string }> = ({ atSec, volume = 0.35, file = "tick.mp3" }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round(atSec * fps)} layout="none" name={`${file} @${atSec.toFixed(2)}`}>
      <Audio src={staticFile(`sfx/${file}`)} volume={volume} />
    </Sequence>
  );
};

/** Navy scrim from the bottom, so white text reads on any photo */
const Scrim: React.FC<{ from?: number; strength?: number; angle?: number }> = ({ from = 0.38, strength = 0.92, angle = 180 }) => (
  <AbsoluteFill
    style={{ background: `linear-gradient(${angle}deg, rgba(0,38,62,0) ${from * 100}%, rgba(0,38,62,${strength * 0.75}) ${(from + 0.2) * 100}%, rgba(0,38,62,${strength}) 100%)` }}
  />
);

// ---------- scenes ----------

const Open: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.open;
  const v = useV();
  const x = v(90, 150);
  const y = v(900, 600);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <PannedImage src={s.image} durSec={s.dur + WIPE} pan={v(s.pan, { ...s.pan, fromX: 0.56, toX: 0.44 })} imgW={3612} imgH={2400} />
      {v(<Scrim from={0.4} />, <Scrim from={0.35} angle={270} strength={0.9} />)}
      <div style={{ position: "absolute", left: x, top: y - 40 }}>
        <Rule atSec={0.45} />
      </div>
      <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column", gap: 10 }}>
        {s.lines.slice(0, 2).map((l, i) => (
          <Reveal key={i} text={l.text} atSec={l.at} outSec={l.out} size={v(92, 100)} color={l.accent ? ORANGE : "#FFFFFF"} font={fonts.heading} />
        ))}
      </div>
      <div style={{ position: "absolute", left: x, top: y }}>
        <Reveal text={s.lines[2].text} atSec={s.lines[2].at} size={v(92, 100)} color="#FFFFFF" font={fonts.heading} />
      </div>
      {s.lines.map((l, i) => ("sound" in l && l.sound ? <Tick key={i} atSec={l.at + 0.15} file={`${l.sound}.mp3`} volume={0.7} /> : <Tick key={i} atSec={l.at + 0.1} volume={0.25} />))}
    </AbsoluteFill>
  );
};

const Factors: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = C.factors;
  const v = useV();
  const wide = useWide();
  // 16:9: the plant on the left, a Navy analysis panel on the right
  const px = v(90, 1100);
  const barW = v(900, 700);
  const segW = barW / s.items.length;
  const titleY = v(700, 250);
  const barY = v(905, 520);
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <PannedImage src={s.image} durSec={s.dur + WIPE} pan={v(s.pan, { ...s.pan, fromX: 0.45, toX: 0.5, focusY: 0.5 })} imgW={2500} imgH={1875} width={wide ? 1180 : undefined} />
      {wide ? (
        <div style={{ position: "absolute", left: 1000, top: 0, width: 920, height: 1080, background: `linear-gradient(90deg, rgba(0,38,62,0) 0%, ${NAVY} 18%)` }} />
      ) : (
        <Scrim from={0.18} strength={0.95} />
      )}
      <div style={{ position: "absolute", left: px, top: titleY }}>
        <Reveal text={s.title.text} atSec={s.title.at} outSec={s.title.out} size={v(74, 72)} color="#FFFFFF" font={fonts.heading} />
      </div>
      <div style={{ position: "absolute", left: px, top: titleY }}>
        <Reveal text={s.closing.text} atSec={s.closing.at} size={v(56, 52)} color="#FFFFFF" font={fonts.heading} />
      </div>
      {/* Finished cost as one bar: the material price is only its first segment */}
      <div style={{ position: "absolute", left: px, top: barY, width: barW, height: 22, display: "flex", gap: 4 }}>
        {s.items.map((_, i) => {
          const p = spring({ frame: frame - (s.itemsAt + i * s.itemGap) * fps, fps, config: { damping: 200, mass: 0.5 } });
          return <div key={i} style={{ width: segW - 4, height: 22, backgroundColor: i === 0 ? ORANGE : "rgba(255,255,255,0.85)", transform: `scaleX(${p})`, transformOrigin: "left" }} />;
        })}
      </div>
      <div data-qc="factor-list" style={{ position: "absolute", left: px, top: barY + 55, width: v(820, 700), display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 26, columnGap: 30 }}>
        {s.items.map((item, i) => {
          const at = s.itemsAt + i * s.itemGap;
          const p = interpolate(frame, [at * fps, (at + 0.45) * fps], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 18, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
              <div style={{ width: 14, height: 14, backgroundColor: i === 0 ? ORANGE : "#FFFFFF" }} />
              <span style={{ fontFamily: fonts.body, fontWeight: i === 0 ? 700 : 400, fontSize: v(44, 40), color: "#FFFFFF" }}>{item}</span>
            </div>
          );
        })}
      </div>
      {s.items.map((_, i) => (
        <Tick key={i} atSec={s.itemsAt + i * s.itemGap} />
      ))}
    </AbsoluteFill>
  );
};

/** Process line that grows as extra steps get inserted between the base steps. */
const Steps: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = C.steps;
  const t = frame / fps;
  // Order of all nodes once every extra step is inserted
  const order: { label: string; icon: string; extra: boolean; at: number }[] = s.base.map((b) => ({ ...b, extra: false, at: 0 }));
  for (const e of s.extra) {
    const idx = order.findIndex((n) => n.label === e.after);
    order.splice(idx + 1, 0, { label: e.label, icon: e.icon, extra: true, at: e.at });
  }
  const v = useV();
  const wide = useWide();
  // Spine: tall = vertical from y 610 to 1200 at x 150; wide = horizontal from x 190 to 1730 at y 640
  const top = v(610, 205);
  const bottom = v(1200, 1715);
  // Visible count over time (smooth), and each node's eased "presence" (0 to 1)
  const presence = (n: (typeof order)[number]) => (n.extra ? interpolate(t, [n.at, n.at + 0.6], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1);
  const total = order.reduce((sum, n) => sum + presence(n), 0);
  let acc = 0;
  const positions = order.map((n) => {
    const pres = presence(n);
    const y = top + (total > 1 ? (acc / (total - 1)) * (bottom - top) : 0);
    acc += pres;
    return { n, pres, y };
  });
  const lineIn = interpolate(t, [0.3, 1.2], [0, 1], { easing: ease, extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {/* Engineering grid */}
      <AbsoluteFill
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div style={{ position: "absolute", left: v(90, 150), top: v(300, 150) }}>
        <Reveal text={s.title.text} atSec={s.title.at} outSec={s.title.out} size={76} color="#FFFFFF" font={fonts.heading} />
      </div>
      {s.extra.map((e, i) => {
        const next = i + 1 < s.extra.length ? s.extra[i + 1].at - 0.25 : s.closing.at - 0.3;
        return (
          <div key={i} style={{ position: "absolute", left: v(90, 150), top: v(300, 150) }}>
            <Reveal text={wide ? e.line.replace("\n", " ") : e.line} atSec={e.at} outSec={next} size={i === 0 ? v(60, 64) : 76} color={i === 0 ? "#FFFFFF" : ORANGE} font={fonts.heading} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: v(90, 150), top: v(300, 150) }}>
        <Reveal text={s.closing.text} atSec={s.closing.at} size={76} color="#FFFFFF" font={fonts.heading} />
      </div>
      {/* Spine */}
      {wide ? (
        <div style={{ position: "absolute", top: 640, left: top, height: 3, width: (bottom - top) * lineIn, backgroundColor: "rgba(255,255,255,0.35)" }} />
      ) : (
        <div style={{ position: "absolute", left: 150, top, width: 3, height: (bottom - top) * lineIn, backgroundColor: "rgba(255,255,255,0.35)" }} />
      )}
      {positions.map(({ n, pres, y }) => {
        const o = n.extra ? pres : interpolate(t, [0.5, 1.1], [0, 1], { extrapolateRight: "clamp" });
        if (wide) {
          // Node on the line, label centered under it (two lines max)
          return (
            <div key={n.label} data-qc={o > 0.98 ? "step" : undefined} style={{ position: "absolute", left: y - 100, top: 640 - 32, width: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: o, transform: `scale(${0.7 + 0.3 * o})`, transformOrigin: "100px 32px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, display: "grid", placeItems: "center", backgroundColor: n.extra ? ORANGE : NAVY, border: n.extra ? "none" : "2px solid rgba(255,255,255,0.8)" }}>
                <Icon name={n.icon} size={34} color="#FFFFFF" />
              </div>
              <span style={{ fontFamily: fonts.body, fontWeight: n.extra ? 700 : 400, fontSize: 28, lineHeight: 1.2, textAlign: "center", color: n.extra ? "#FFFFFF" : "rgba(255,255,255,0.85)" }}>{n.label}</span>
            </div>
          );
        }
        return (
          <div key={n.label} data-qc={o > 0.98 ? "step" : undefined} style={{ position: "absolute", left: 150 - 32, top: y - 32, display: "flex", alignItems: "center", gap: 28, opacity: o, transform: `scale(${0.7 + 0.3 * o})`, transformOrigin: "32px 32px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                display: "grid",
                placeItems: "center",
                backgroundColor: n.extra ? ORANGE : NAVY,
                border: n.extra ? "none" : "2px solid rgba(255,255,255,0.8)",
              }}
            >
              <Icon name={n.icon} size={34} color="#FFFFFF" />
            </div>
            <span style={{ fontFamily: fonts.body, fontWeight: n.extra ? 700 : 400, fontSize: 40, color: n.extra ? "#FFFFFF" : "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>{n.label}</span>
          </div>
        );
      })}
      {s.extra.map((e, i) => (
        <Tick key={i} atSec={e.at + 0.05} volume={0.4} />
      ))}
    </AbsoluteFill>
  );
};

const Compare: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = C.compare;
  const t = frame / fps;
  const checksOut = s.title.out;
  const v = useV();
  const wide = useWide();
  // tall: photo on top (640 px), analysis below. wide: photo on the left (860 px), analysis on the right.
  const L = v(
    { tx: 90, titleY: 700, checksY: 850, concl: [690, 828], labelY: 900, barA: 120, barB: 560, baseY: 1235, rule: 100, ruleW: 880 },
    { tx: 960, titleY: 120, checksY: 280, concl: [110, 248], labelY: 440, barA: 990, barB: 1400, baseY: 960, rule: 960, ruleW: 860 },
  );
  const seg = v(44, 56);
  const matH = v(64, 80);
  const barsIn = (i: number) => interpolate(t, [s.barsAt + 0.4 + i * 0.32, s.barsAt + 0.4 + i * 0.32 + 0.4], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelsIn = interpolate(t, [s.barsAt, s.barsAt + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const baseY = L.baseY;
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {/* Split: the real component on top, the analysis below */}
      {wide ? (
        <>
          <PannedImage src={s.image} durSec={s.dur + WIPE} pan={{ fromX: 0.4, toX: 0.5, focusY: 0.5, zoomFrom: 1.0, zoomTo: 1.06 }} width={860} imgW={1179} imgH={783} />
          <div style={{ position: "absolute", left: 860, top: 0, width: 6, height: 1080, backgroundColor: ORANGE }} />
        </>
      ) : (
        <>
          <PannedImage src={s.image} durSec={s.dur + WIPE} pan={{ fromX: 0.45, toX: 0.55, focusY: 0.5, zoomFrom: 1.0, zoomTo: 1.06 }} height={640} imgW={1179} imgH={783} />
          <div style={{ position: "absolute", left: 0, top: 640, width: 1080, height: 6, backgroundColor: ORANGE }} />
        </>
      )}
      <div style={{ position: "absolute", left: L.tx, top: L.titleY }}>
        <Reveal text={s.title.text} atSec={s.title.at} outSec={s.title.out} size={64} color={NAVY} font={fonts.heading} />
      </div>
      <div style={{ position: "absolute", left: L.tx, top: L.checksY, display: "flex", flexDirection: "column", gap: 26 }}>
        {s.checks.map((c, i) => {
          const p = interpolate(t, [c.at, c.at + 0.45], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const out = interpolate(t, [checksOut, checksOut + 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} data-qc={p > 0.98 && out === 0 ? "check" : undefined} style={{ display: "flex", alignItems: "center", gap: 22, opacity: p * (1 - out), transform: `translateX(${(1 - p) * -24}px)` }}>
              <Icon name="check" size={46} color={ORANGE} stroke={2.6} />
              <span style={{ fontFamily: fonts.body, fontWeight: 400, fontSize: 48, color: "#111" }}>{c.text}</span>
            </div>
          );
        })}
      </div>
      {s.conclusion.map((c, i) => (
        <div key={i} style={{ position: "absolute", left: L.tx, top: L.concl[i] }}>
          <Reveal text={c.text} atSec={c.at} size={56} color={c.accent ? ORANGE : NAVY} font={fonts.heading} />
        </div>
      ))}
      {/* Understated comparison: no numbers, only what each figure includes */}
      <div style={{ opacity: labelsIn }}>
        <div data-qc={labelsIn > 0.98 ? "bar-label" : undefined} style={{ position: "absolute", left: L.barA, top: L.labelY, width: 330, fontFamily: fonts.body, fontSize: 26, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
          {s.barLabels.material}
        </div>
        <div data-qc={labelsIn > 0.98 ? "bar-label" : undefined} style={{ position: "absolute", left: L.barB, top: L.labelY, width: v(440, 400), fontFamily: fonts.body, fontSize: 26, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
          {s.barLabels.finished}
        </div>
        {/* Left: material price alone */}
        <div style={{ position: "absolute", left: L.barA, top: baseY - matH * barsIn(0), width: 300, height: matH * barsIn(0), backgroundColor: ORANGE }} />
        {/* Right: the same material, plus every process cost */}
        <div style={{ position: "absolute", left: L.barB, top: baseY - matH * barsIn(0), width: 300, height: matH * barsIn(0), backgroundColor: ORANGE }} />
        {s.segments.map((label, i) => {
          const p = barsIn(i + 1);
          const y = baseY - matH - (i + 1) * seg;
          return (
            <div key={label} style={{ position: "absolute", left: L.barB, top: y + seg * (1 - p), width: 300, height: seg * p - 3, backgroundColor: NAVY, opacity: 0.55 + 0.09 * i, display: "flex", alignItems: "center", paddingLeft: 18, overflow: "hidden" }}>
              <span style={{ fontFamily: fonts.body, fontSize: v(24, 26), color: "#FFFFFF", opacity: p }}>{label}</span>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: L.rule, top: baseY, width: L.ruleW, height: 2, backgroundColor: "#00263E55" }} />
      </div>
      {s.checks.map((c, i) => (
        <Tick key={`c${i}`} atSec={c.at} volume={0.3} />
      ))}
      {s.segments.map((_, i) => (
        <Tick key={`s${i}`} atSec={s.barsAt + 0.4 + (i + 1) * 0.32} volume={0.28} />
      ))}
    </AbsoluteFill>
  );
};

const Finishes: React.FC<{ images: string[]; durSec: number }> = ({ images, durSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useV();
  // A soft highlight sweeps across all four samples, like light moving over metal
  const sweep = interpolate(frame, [0, durSec * fps], [-0.4, 1.4]);
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <div style={{ position: "absolute", left: v(0, 860), top: 0, width: v(1080, 1060), height: v(1040, 1080), display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 6 }}>
        {images.map((img, i) => {
          const p = interpolate(frame, [i * 3, i * 3 + 14], [0, 1], { easing: ease, extrapolateRight: "clamp" });
          return (
            <div key={img} style={{ position: "relative", overflow: "hidden", opacity: p }}>
              <Img src={staticFile(`${C.imageDir}/${img}`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.42 - 0.06 * p})`, transformOrigin: "80% 85%" }} />
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(115deg, rgba(255,255,255,0) ${sweep * 100 - 18}%, rgba(255,255,255,0.22) ${sweep * 100}%, rgba(255,255,255,0) ${sweep * 100 + 18}%)`,
            mixBlendMode: "screen",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Proof: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.proof;
  const { fps } = useVideoConfig();
  const v = useV();
  const wide = useWide();
  const beats = s.beats;
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {beats.map((b, i) => {
        const start = b.at;
        const end = i + 1 < beats.length ? beats[i + 1].at : s.dur;
        const dur = end - start;
        const sizes: Record<string, [number, number]> = { "copper-profiles.jpg": [3200, 2400] };
        return (
          <Sequence key={i} from={Math.round(start * fps)} durationInFrames={Math.round((dur + (i + 1 < beats.length ? WIPE : 0)) * fps)} layout="none">
            <Wipe first={i === 0}>
              {b.kind === "finishes" ? (
                <Finishes images={b.images ?? []} durSec={dur + WIPE} />
              ) : (
                <AbsoluteFill>
                  <PannedImage src={b.image!} durSec={dur + WIPE} pan={b.pan!} imgW={sizes[b.image!][0]} imgH={sizes[b.image!][1]} x={wide ? 860 : 0} />
                </AbsoluteFill>
              )}
              {/* Navy callout panel for the line: below the image (tall) or beside it (wide) */}
              {wide ? (
                <div style={{ position: "absolute", left: 0, top: 0, width: 860, height: 1080, backgroundColor: NAVY }} />
              ) : (
                <div style={{ position: "absolute", left: 0, top: 1040, width: 1080, height: 880, backgroundColor: NAVY }} />
              )}
              <div style={{ position: "absolute", left: v(90, 110), top: v(1070, 430) }}>
                <Reveal text={b.text} atSec={0.35} size={b.kind === "finishes" ? v(50, 46) : v(66, 64)} color={"accent" in b && b.accent ? ORANGE : "#FFFFFF"} font={fonts.heading} />
              </div>
            </Wipe>
            {i > 0 ? <Tick atSec={0} file="whoosh.mp3" volume={0.35} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Logo only: the official animated logo, unaltered, on white. */
const End: React.FC<{ fonts: Fonts }> = () => {
  const s = C.end;
  const frame = useCurrentFrame();
  const { fps, width: W } = useVideoConfig();
  const v = useV();
  const logoWidth = v(s.logoWidth, 1000);
  const logoCenterY = v(s.logoCenterY, 540);
  const scale = logoWidth / s.logoBox.width;
  const videoW = s.logoBox.sourceWidth * scale;
  const videoH = videoW * (9 / 16);
  const logoCx = (s.logoBox.x + s.logoBox.width / 2) * scale;
  const logoCy = (s.logoBox.y + s.logoBox.height / 2) * scale;
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {/* Official animated logo, unaltered, on white (its own background is pure white, so the frame edge is invisible) */}
      <div data-qc={frame > 2.6 * fps ? "logo" : undefined} style={{ position: "absolute", left: W / 2 - logoWidth / 2, top: logoCenterY - (s.logoBox.height * scale) / 2, width: logoWidth, height: s.logoBox.height * scale }} />
      <div style={{ position: "absolute", left: W / 2 - logoCx, top: logoCenterY - logoCy, width: videoW, height: videoH, opacity: fadeIn }}>
        <Video src={staticFile(s.logoVideo)} muted style={{ width: "100%", height: "100%" }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- the whole story ----------

export const LorinTotalCost: React.FC<{ qc?: boolean; format?: StoryFormat }> = ({ qc, format = "9x16" }) => {
  const brand = getBrand(C.brand);
  const fonts = useBrandFonts(brand);
  const { fps, durationInFrames } = useVideoConfig();
  const components = { open: Open, factors: Factors, steps: Steps, compare: Compare, proof: Proof, end: End };
  const endStart = sceneStart("end");
  return (
    <FormatContext.Provider value={format}>
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SCENES.map((name, i) => {
        const Comp = components[name];
        const from = Math.round(sceneStart(name) * fps);
        const dur = Math.round((C[name].dur + (i < SCENES.length - 1 ? WIPE : 0)) * fps);
        return (
          <Sequence key={name} from={from} durationInFrames={dur} name={name}>
            <Wipe first={i === 0}>
              <Comp fonts={fonts} />
            </Wipe>
            {i > 0 ? <Tick atSec={0} file="whoosh.mp3" volume={0.5} /> : null}
          </Sequence>
        );
      })}
      {C.music ? (
        <Audio
          src={staticFile(`music/${C.music}`)}
          volume={(f) => interpolate(f, [0, fps * 1.5, endStart * fps, durationInFrames - fps * 1.2, durationInFrames], [0, 0.2, 0.24, 0.24, 0], { extrapolateRight: "clamp" })}
        />
      ) : null}
      {/* Soft chime as the logo animation completes */}
      <Tick atSec={endStart + C.end.soundAt} file="chime.mp3" volume={0.55} />
      {qc ? <QcProbe safe={format === "16x9" ? SAFE_WIDE : SAFE_TALL} keepClear={format === "16x9" ? undefined : RAIL} ready={fonts.ready} /> : null}
    </AbsoluteFill>
    </FormatContext.Provider>
  );
};
