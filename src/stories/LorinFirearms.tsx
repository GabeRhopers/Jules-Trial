// Lorin® firearms story "3 details that say premium." (Color, Sheen, Context), in 9:16 and 16:9.
// Text, timing and images come from stories/lorin-firearms/config.json; each format has its own layout below.
// Look: dark, controlled directional light, slow macro moves, restrained text reveals, small technical labels.
// Brand rules (Lorin Sales Team Playbook): Red Orange #DD4F05 only for small accents, Navy #00263E, black,
// Poppins Bold/Regular, the official animated logo unaltered on white, never over a photo or gradient.
// Content rules (brief): no firing, ammunition, tactical action or operation; no specs, numbers or claims.
import { Audio, Video } from "@remotion/media";
import { createContext, useContext, type ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { QcProbe } from "../components/QcProbe";
import { useBrandFonts } from "../lib/fonts";
import { getBrand } from "../lib/registry";
import { REEL_SAFE_ZONE, reelSafeRect } from "../lib/safe-zones";
import config from "../../stories/lorin-firearms/config.json";

export type FirearmsFormat = "9x16" | "16x9";
export const FIREARMS_SIZES: Record<FirearmsFormat, { width: number; height: number; fps: number }> = {
  "9x16": { width: 1080, height: 1920, fps: 30 },
  "16x9": { width: 1920, height: 1080, fps: 30 },
};
const SAFE_TALL = reelSafeRect(1080, 1920);
const RAIL = { x: 1080 - REEL_SAFE_ZONE.rightRail.width, y: 1920 - REEL_SAFE_ZONE.rightRail.bottom, width: REEL_SAFE_ZONE.rightRail.width, height: REEL_SAFE_ZONE.rightRail.bottom };
const SAFE_WIDE = { x: 96, y: 54, width: 1728, height: 972 };

const FormatContext = createContext<FirearmsFormat>("9x16");
const useWide = () => useContext(FormatContext) === "16x9";
const useV = () => {
  const wide = useWide();
  return <T,>(tall: T, wideValue: T): T => (wide ? wideValue : tall);
};

const ORANGE = "#DD4F05";
const NAVY = "#00263E";
const INK = "#0B0B0C";
/** Cross-dissolve between scenes (restrained, no wipes) */
const FADE = 0.5;
const C = config;

const SCENES = ["open", "color", "sheen", "context", "reference", "brief", "end"] as const;
type SceneName = (typeof SCENES)[number];
export const firearmsDurationSec = SCENES.reduce((t, s) => t + C[s].dur, 0);
const sceneStart = (name: SceneName) => SCENES.slice(0, SCENES.indexOf(name)).reduce((t, s) => t + C[s].dur, 0);

type Fonts = { heading: string; body: string };
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const footageOf = (s: unknown) => (s as { footage?: string | null }).footage ?? null;

// ---------- building blocks ----------

/** Text that rises out of a mask, line by line ("\n" splits lines). */
const Reveal: React.FC<{ text: string; atSec: number; size: number; color: string; weight?: 400 | 700; align?: "left" | "center"; font: string; lineHeight?: number; qc?: string }> = ({
  text,
  atSec,
  size,
  color,
  weight = 700,
  align = "left",
  font,
  lineHeight = 1.14,
  qc = "text",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = text.split("\n");
  const settled = frame >= (atSec + 0.8 + lines.length * 0.1) * fps;
  return (
    <div data-qc={settled ? qc : undefined} style={{ fontFamily: font, fontWeight: weight, fontSize: size, lineHeight, color, textAlign: align, letterSpacing: weight === 700 ? "-0.015em" : "0" }}>
      {lines.map((line, i) => {
        const p = interpolate(frame, [(atSec + i * 0.1) * fps, (atSec + i * 0.1 + 0.8) * fps], [0, 1], { easing: ease, ...clamp });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: size * 0.1, marginBottom: -size * 0.1 }}>
            <div style={{ transform: `translateY(${(1 - p) * 100}%)`, opacity: 0.2 + 0.8 * p, whiteSpace: "nowrap" }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Small letter-spaced technical label that fades in */
const Label: React.FC<{ text: string; atSec: number; font: string; size?: number; color?: string; qc?: string; spacing?: number }> = ({ text, atSec, font, size = 24, color = "rgba(255,255,255,0.72)", qc = "label", spacing = 0.18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + 0.6) * fps], [0, 1], { easing: ease, ...clamp });
  return (
    <div data-qc={p > 0.98 ? qc : undefined} style={{ fontFamily: font, fontWeight: 400, fontSize: size, letterSpacing: `${spacing}em`, textTransform: "uppercase", color, opacity: p, transform: `translateY(${(1 - p) * 8}px)`, whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

/** "1 / COLOR" with a thin rule that draws out to the right */
const SectionLabel: React.FC<{ number: string; label: string; font: string; width: number }> = ({ number, label, font, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0.1 * fps, 0.7 * fps], [0, 1], { easing: ease, ...clamp });
  const line = interpolate(frame, [0.3 * fps, 1.3 * fps], [0, 1], { easing: ease, ...clamp });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, width }}>
      <div data-qc={p > 0.98 ? "section-label" : undefined} style={{ fontFamily: font, fontSize: 28, letterSpacing: "0.2em", color: "rgba(255,255,255,0.85)", opacity: p, whiteSpace: "nowrap" }}>
        <span style={{ color: ORANGE, fontWeight: 700 }}>{number}</span>
        <span style={{ opacity: 0.55 }}> / </span>
        {label}
      </div>
      <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.25)", transform: `scaleX(${line})`, transformOrigin: "left" }} />
    </div>
  );
};

/**
 * A Lorin finish swatch photo, cropped to its clean surface (the sample clip in the top-left corner is
 * left out), covering the box. `drift` slowly moves the crop for a macro feel.
 */
const Swatch: React.FC<{ image: string; w: number; h: number; drift?: number; filter?: string; style?: React.CSSProperties }> = ({ image, w, h, drift = 0, filter, style }) => {
  const SRC = { w: 800, h: 640, sx: 250, sy: 0 };
  const sw = SRC.w - SRC.sx;
  const sh = SRC.h - SRC.sy;
  const scale = Math.max(w / sw, h / sh) * 1.06;
  const extraX = sw * scale - w;
  const extraY = sh * scale - h;
  const left = -SRC.sx * scale - extraX * (0.5 + 0.45 * drift);
  const top = -SRC.sy * scale - extraY * 0.5;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", ...style }}>
      <Img src={staticFile(`${C.imageDir}/${image}`)} style={{ position: "absolute", left, top, width: SRC.w * scale, height: SRC.h * scale, filter }} />
    </div>
  );
};

/** A soft band of light moving across a surface (progress -0.4 → 1.4 crosses it once) */
const Sweep: React.FC<{ progress: number; strength?: number; angle?: number; width?: number }> = ({ progress, strength = 0.28, angle = 112, width = 16 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(${angle}deg, rgba(255,255,255,0) ${progress * 100 - width}%, rgba(255,255,255,${strength}) ${progress * 100}%, rgba(255,255,255,0) ${progress * 100 + width}%)`,
      mixBlendMode: "screen",
      pointerEvents: "none",
    }}
  />
);

/** Lorin-supplied or licensed footage (mp4) or photo, covering its box. */
const Footage: React.FC<{ file: string; w: number; h: number }> = ({ file, w, h }) => {
  const src = staticFile(`${C.imageDir}/${file}`);
  const style: React.CSSProperties = { width: w, height: h, objectFit: "cover" };
  return <div style={{ width: w, height: h, overflow: "hidden" }}>{/\.(mp4|mov|webm)$/i.test(file) ? <Video src={src} muted style={style} /> : <Img src={src} style={style} />}</div>;
};

/** Drawn material textures for the Context comparison (placeholders until Lorin supplies real samples) */
const MaterialTexture: React.FC<{ kind: string; w: number; h: number; id: string }> = ({ kind, w, h, id }) => {
  if (kind === "Polymer")
    return (
      <svg width={w} height={h}>
        <filter id={`${id}-n`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0 0.62  0 0 0 0.09 0" />
        </filter>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#262628" />
          <stop offset="1" stopColor="#141415" />
        </linearGradient>
        <rect width={w} height={h} fill={`url(#${id}-g)`} />
        <rect width={w} height={h} filter={`url(#${id}-n)`} />
      </svg>
    );
  if (kind === "Steel")
    return (
      <svg width={w} height={h}>
        <filter id={`${id}-n`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.003 0.8" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.85  0 0 0 0 0.86  0 0 0 0 0.88  0 0 0 0.16 0" />
        </filter>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#3c3f43" />
          <stop offset="0.55" stopColor="#575b60" />
          <stop offset="1" stopColor="#2e3033" />
        </linearGradient>
        <rect width={w} height={h} fill={`url(#${id}-g)`} />
        <rect width={w} height={h} filter={`url(#${id}-n)`} />
      </svg>
    );
  // Grip texture: fine diamond knurl
  return (
    <svg width={w} height={h}>
      <pattern id={`${id}-p`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="16" height="16" fill="#1c1c1e" />
        <rect x="2" y="2" width="12" height="12" fill="#2a2a2d" />
        <rect x="2" y="2" width="12" height="2" fill="#3a3a3e" />
      </pattern>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.45" />
      </linearGradient>
      <rect width={w} height={h} fill={`url(#${id}-p)`} />
      <rect width={w} height={h} fill={`url(#${id}-g)`} />
    </svg>
  );
};

/** Dark backdrop with a soft directional light from the top left */
const DarkStage: React.FC<{ children?: ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: INK, background: `radial-gradient(ellipse 90% 60% at 18% 8%, #23262b 0%, #111214 45%, ${INK} 100%)` }}>{children}</AbsoluteFill>
);

const Sfx: React.FC<{ atSec: number; file: string; volume: number }> = ({ atSec, file, volume }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round(atSec * fps)} layout="none" name={`${file} @${atSec.toFixed(2)}`}>
      <Audio src={staticFile(`sfx/${file}`)} volume={volume} />
    </Sequence>
  );
};

/** Text column used by the three detail scenes: section label, headline, body */
const DetailText: React.FC<{ fonts: Fonts; s: { number: string; label: string; headline: { text: string; at: number }; body: { text: string; at: number } } }> = ({ fonts, s }) => {
  const v = useV();
  return (
    <div style={{ position: "absolute", left: v(90, 150), top: 300, display: "flex", flexDirection: "column" }}>
      <SectionLabel number={s.number} label={s.label} font={fonts.body} width={v(900, 700)} />
      <div style={{ height: v(40, 44) }} />
      <Reveal text={s.headline.text} atSec={s.headline.at} size={v(80, 72)} color="#FFFFFF" font={fonts.heading} />
      <div style={{ height: v(34, 34) }} />
      <Reveal text={s.body.text} atSec={s.body.at} size={v(40, 36)} weight={400} color="rgba(255,255,255,0.8)" font={fonts.body} lineHeight={1.3} />
    </div>
  );
};

/** Box for the visual of the detail scenes: below the text (tall) or to the right (wide) */
const useVisualBox = () => {
  const v = useV();
  return v({ x: 90, y: 760, w: 900, h: 820 }, { x: 1000, y: 190, w: 770, h: 700 });
};

// ---------- scenes ----------

const Open: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.open;
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const v = useV();
  const wide = useWide();
  const t = frame / fps;
  // Macro surface: rack focus in, slow drift, one light sweep
  const focus = interpolate(t, [0, 1.2], [10, 0], { easing: ease, ...clamp });
  const drift = interpolate(t, [0, s.dur + FADE], [0, 1], clamp);
  const sweep = interpolate(t, [0.4, 2.8], [-0.4, 1.4], { easing: Easing.inOut(Easing.sin), ...clamp });
  const slab = v({ x: 0, y: 0, w: W, h: 1000 }, { x: 760, y: 0, w: W - 760, h: H });
  const footage = footageOf(s);
  // The surface dissolves into the stage where the text sits (a mask, so there is no visible edge)
  const mask = wide ? "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 25%, black 55%)" : "linear-gradient(0deg, transparent 0%, rgba(0,0,0,0.5) 30%, black 65%)";
  return (
    <DarkStage>
      <div style={{ position: "absolute", left: slab.x, top: slab.y, width: slab.w, height: slab.h, overflow: "hidden", maskImage: mask, WebkitMaskImage: mask }}>
        <div style={{ position: "absolute", inset: 0, filter: `blur(${focus}px)`, transform: `scale(${1.04 + 0.04 * drift})`, transformOrigin: "60% 40%" }}>
          {footage ? <Footage file={footage} w={slab.w} h={slab.h} /> : <Swatch image={s.image} w={slab.w} h={slab.h} drift={drift} filter="brightness(0.62) contrast(1.15)" />}
          <Sweep progress={sweep} strength={0.24} />
        </div>
      </div>
      <div style={{ position: "absolute", left: v(90, 150), top: v(780, 330) }}>
        <Reveal text={s.headline.text} atSec={s.headline.at} size={v(100, 100)} color="#FFFFFF" font={fonts.heading} qc="headline" />
        <div style={{ height: v(34, 34) }} />
        <Label text={C.credential} atSec={s.credentialAt} font={fonts.body} size={v(24, 22)} qc="credential" />
        <div style={{ height: v(40, 48) }} />
        <div style={{ display: "flex", gap: 34 }}>
          {s.words.map((w, i) => {
            const at = s.wordsAt + i * s.wordGap;
            const p = interpolate(t, [at, at + 0.6], [0, 1], { easing: ease, ...clamp });
            return (
              <div key={w} data-qc={p > 0.98 ? "word" : undefined} style={{ display: "flex", alignItems: "center", gap: 14, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
                <div style={{ width: 8, height: 8, backgroundColor: ORANGE }} />
                <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: v(40, 38), color: "#FFFFFF" }}>{w}</span>
              </div>
            );
          })}
        </div>
      </div>
      {s.words.map((_, i) => (
        <Sfx key={i} atSec={s.wordsAt + i * s.wordGap} file="tick.mp3" volume={0.22} />
      ))}
    </DarkStage>
  );
};

const ColorScene: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.color;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const box = useVisualBox();
  const v = useV();
  const footage = footageOf(s);
  const n = C.swatches.length;
  const gap = 14;
  const tileW = (box.w - gap * (n - 1)) / n;
  const pick = interpolate(t, [s.pickAt, s.pickAt + 0.7], [0, 1], { easing: ease, ...clamp });
  const sweep = interpolate(t, [0.6, s.dur], [-0.4, 1.4], clamp);
  return (
    <DarkStage>
      <DetailText fonts={fonts} s={s} />
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }}>
        {footage ? (
          <Footage file={footage} w={box.w} h={box.h} />
        ) : (
          C.swatches.map((sw, i) => {
            const at = s.tilesAt + i * 0.12;
            const p = interpolate(t, [at, at + 0.8], [0, 1], { easing: ease, ...clamp });
            const chosen = i === s.pick;
            const dim = chosen ? 1 : 1 - 0.55 * pick;
            return (
              <div key={sw.image} style={{ position: "absolute", left: i * (tileW + gap), top: (1 - p) * 40, width: tileW, height: box.h, opacity: p * dim }}>
                <Swatch image={sw.image} w={tileW} h={box.h} drift={0.3} />
                <Sweep progress={sweep - i * 0.06} strength={0.16} />
                {/* Labels sit on a dark band so they read on light finishes too */}
                <div style={{ position: "absolute", left: 0, top: 0, width: tileW, height: 64, background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0))" }} />
                <div style={{ position: "absolute", left: 16, top: 18 }}>
                  <Label text={sw.label} atSec={at + 0.3} font={fonts.body} size={v(22, 18)} spacing={0.08} color="#FFFFFF" qc="swatch-label" />
                </div>
                {chosen ? <div style={{ position: "absolute", inset: 0, border: `3px solid ${ORANGE}`, opacity: pick }} /> : null}
              </div>
            );
          })
        )}
      </div>
      <Sfx atSec={s.pickAt + 0.1} file="tick.mp3" volume={0.3} />
    </DarkStage>
  );
};

const SheenScene: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.sheen;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const box = useVisualBox();
  const v = useV();
  const footage = footageOf(s);
  const n = s.lights.length;
  const gap = 14;
  const stripW = (box.w - gap * (n - 1)) / n;
  return (
    <DarkStage>
      <DetailText fonts={fonts} s={s} />
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }}>
        {footage ? (
          <Footage file={footage} w={box.w} h={box.h} />
        ) : (
          s.lights.map((l, i) => {
            const at = s.lightsAt + i * 0.35;
            const p = interpolate(t, [at, at + 0.9], [0, 1], { easing: ease, ...clamp });
            // Each strip: the same finish under a different light, with its own slow highlight
            const sweep = interpolate(t, [at, s.dur + FADE], [-0.3, 1.2], clamp);
            return (
              <div key={l.label} style={{ position: "absolute", left: i * (stripW + gap), top: 0, width: stripW, height: box.h, opacity: p, clipPath: `inset(${(1 - p) * 100}% 0 0 0)` }}>
                <Swatch image={s.image} w={stripW} h={box.h} drift={0.2 + i * 0.3} filter={l.filter} />
                <Sweep progress={sweep} strength={l.glow} angle={160} width={22} />
                <div style={{ position: "absolute", left: 0, top: 0, width: stripW, height: 70, background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0))" }} />
                <div style={{ position: "absolute", left: 16, top: 20 }}>
                  <Label text={l.label} atSec={at + 0.4} font={fonts.body} size={v(22, 18)} spacing={0.1} color="#FFFFFF" qc="light-label" />
                </div>
              </div>
            );
          })
        )}
      </div>
      {s.lights.map((_, i) => (
        <Sfx key={i} atSec={s.lightsAt + i * 0.35 + 0.2} file="tick.mp3" volume={0.18} />
      ))}
    </DarkStage>
  );
};

const ContextScene: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.context;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const box = useVisualBox();
  const v = useV();
  const footage = footageOf(s);
  // 2x2 material board: starts gently split apart, then joins into one combination
  const join = interpolate(t, [s.joinAt, s.joinAt + 1.0], [0, 1], { easing: Easing.inOut(Easing.cubic), ...clamp });
  const gap = interpolate(join, [0, 1], [44, 4]);
  const tiles = [{ kind: "anodized", label: s.anodized.label }, ...s.materials.map((m) => ({ kind: m, label: m }))];
  const cellW = (box.w - 4) / 2;
  const cellH = (box.h - 4) / 2;
  const sweep = interpolate(t, [s.joinAt + 0.6, s.dur + FADE], [-0.4, 1.4], clamp);
  return (
    <DarkStage>
      <DetailText fonts={fonts} s={s} />
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }}>
        {footage ? (
          <Footage file={footage} w={box.w} h={box.h} />
        ) : (
          <>
            {tiles.map((tile, i) => {
              const col = i % 2;
              const row = Math.floor(i / 2);
              const at = s.tilesAt + i * 0.15;
              const p = interpolate(t, [at, at + 0.8], [0, 1], { easing: ease, ...clamp });
              const w = cellW - (gap - 4) / 2;
              const h = cellH - (gap - 4) / 2;
              const x = col * (w + gap);
              const y = row * (h + gap);
              const anod = tile.kind === "anodized";
              return (
                <div key={tile.kind} style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
                  {anod ? <Swatch image={s.anodized.image} w={w} h={h} drift={0.4} /> : <MaterialTexture kind={tile.kind} w={w} h={h} id={`mat${i}`} />}
                  <div style={{ position: "absolute", left: 0, top: 0, width: w, height: 70, background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0))" }} />
                  <div style={{ position: "absolute", left: 18, top: 20, display: "flex", alignItems: "center", gap: 10 }}>
                    {anod ? <div style={{ width: 8, height: 8, backgroundColor: ORANGE, opacity: p }} /> : null}
                    <Label text={tile.label} atSec={at + 0.35} font={fonts.body} size={v(22, 18)} spacing={0.1} color="#FFFFFF" qc="material-label" />
                  </div>
                </div>
              );
            })}
            {/* Once joined, one light passes over the whole combination */}
            <div style={{ position: "absolute", inset: 0, opacity: join }}>
              <Sweep progress={sweep} strength={0.18} angle={120} />
            </div>
          </>
        )}
      </div>
      <Sfx atSec={s.joinAt + 0.3} file="pop.mp3" volume={0.18} />
    </DarkStage>
  );
};

const ReferenceScene: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.reference;
  const card = s.card;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const v = useV();
  const box = v({ x: 190, y: 720, w: 700, h: 500 }, { x: 1080, y: 230, w: 640, h: 560 });
  const imgH = v(270, 330);
  const p = interpolate(t, [card.at, card.at + 0.9], [0, 1], { easing: ease, ...clamp });
  const sweep = interpolate(t, [card.at + 0.4, s.dur], [-0.4, 1.4], clamp);
  return (
    <DarkStage>
      <div style={{ position: "absolute", left: v(90, 150), top: v(300, 340) }}>
        <Reveal text={s.headline.text} atSec={s.headline.at} size={v(80, 72)} color="#FFFFFF" font={fonts.heading} />
        <div style={{ height: 34 }} />
        <Reveal text={s.body.text} atSec={s.body.at} size={v(40, 36)} weight={400} color="rgba(255,255,255,0.8)" font={fonts.body} lineHeight={1.3} />
      </div>
      {/* Appearance reference card: the approved look, and what it covers */}
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, backgroundColor: "#F4F4F2", opacity: p, transform: `translateY(${(1 - p) * 36}px)`, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "relative", margin: 18, width: box.w - 36, height: imgH, overflow: "hidden" }}>
          <Swatch image={card.image} w={box.w - 36} h={imgH} drift={0.5} />
          <Sweep progress={sweep} strength={0.2} />
        </div>
        <div style={{ position: "absolute", left: 40, top: imgH + 50 }}>
          <Label text={card.title} atSec={card.at + 0.4} font={fonts.body} size={v(22, 20)} color={NAVY} spacing={0.2} qc="card-title" />
        </div>
        <div style={{ position: "absolute", left: 40, top: imgH + v(100, 110), display: "flex", gap: v(34, 30) }}>
          {card.checks.map((c, i) => {
            const at = card.checksAt + i * card.checkGap;
            const q = interpolate(t, [at, at + 0.5], [0, 1], { easing: ease, ...clamp });
            return (
              <div key={c} data-qc={q > 0.98 ? "check" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, opacity: q }}>
                <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5l10 -10" strokeDasharray={24} strokeDashoffset={24 * (1 - q)} />
                </svg>
                <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: v(32, 30), color: NAVY }}>{c}</span>
              </div>
            );
          })}
        </div>
      </div>
      {card.checks.map((_, i) => (
        <Sfx key={i} atSec={card.checksAt + i * card.checkGap} file="tick.mp3" volume={0.25} />
      ))}
    </DarkStage>
  );
};

const BriefScene: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.brief;
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const v = useV();
  const footage = footageOf(s);
  const drift = interpolate(t, [0, s.dur + FADE], [0, 1], clamp);
  const sweep = interpolate(t, [0.2, s.dur + FADE], [-0.4, 1.3], { easing: Easing.inOut(Easing.sin), ...clamp });
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1.03 + 0.05 * drift})`, transformOrigin: "70% 30%" }}>
        {footage ? <Footage file={footage} w={W} h={H} /> : <Swatch image={s.image} w={W} h={H} drift={drift} filter="brightness(0.9) contrast(1.1)" />}
        <Sweep progress={sweep} strength={0.3} angle={125} width={20} />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.55))" }} />
      <div style={{ position: "absolute", left: v(90, 150), top: v(720, 360) }}>
        <Reveal text={s.headline.text} atSec={s.headline.at} size={v(92, 92)} color="#FFFFFF" font={fonts.heading} />
        <div style={{ height: 40 }} />
        <Reveal text={s.body.text} atSec={s.body.at} size={v(40, 38)} weight={400} color="rgba(255,255,255,0.85)" font={fonts.body} lineHeight={1.3} />
      </div>
    </AbsoluteFill>
  );
};

/** Final frame on white: the official animated logo (unaltered), the CTA, the supporting line and the credential. */
const End: React.FC<{ fonts: Fonts }> = ({ fonts }) => {
  const s = C.end;
  const frame = useCurrentFrame();
  const { fps, width: W } = useVideoConfig();
  const v = useV();
  const wide = useWide();
  const logoWidth = v(620, 560);
  const logoCenterY = v(560, 270);
  const scale = logoWidth / s.logoBox.width;
  const videoW = s.logoBox.sourceWidth * scale;
  const videoH = videoW * (9 / 16);
  const logoCx = (s.logoBox.x + s.logoBox.width / 2) * scale;
  const logoCy = (s.logoBox.y + s.logoBox.height / 2) * scale;
  const one = (text: string) => (wide ? text.replace("\n", " ") : text);
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      <div data-qc={frame > 2.6 * fps ? "logo" : undefined} style={{ position: "absolute", left: W / 2 - logoWidth / 2, top: logoCenterY - (s.logoBox.height * scale) / 2, width: logoWidth, height: s.logoBox.height * scale }} />
      <div style={{ position: "absolute", left: W / 2 - logoCx, top: logoCenterY - logoCy, width: videoW, height: videoH }}>
        <Video src={staticFile(s.logoVideo)} muted style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: v(790, 470), width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Reveal text={one(s.cta.text)} atSec={s.cta.at} size={v(72, 68)} color={NAVY} font={fonts.heading} align="center" qc="cta" />
        <div style={{ height: v(36, 30) }} />
        <Reveal text={s.support.text.replace("\n", wide ? " " : "\n")} atSec={s.support.at} size={v(34, 32)} weight={400} color="#2B2B2B" font={fonts.body} align="center" lineHeight={1.35} qc="support" />
        <div style={{ height: v(56, 64) }} />
        <Label text={C.credential} atSec={s.credentialAt} font={fonts.body} size={v(22, 20)} color="rgba(0,38,62,0.75)" qc="credential" />
      </div>
    </AbsoluteFill>
  );
};

// ---------- the whole story ----------

export const LorinFirearms: React.FC<{ qc?: boolean; format?: FirearmsFormat }> = ({ qc, format = "9x16" }) => {
  const brand = getBrand(C.brand);
  const fonts = useBrandFonts(brand);
  const { fps, durationInFrames } = useVideoConfig();
  const components: Record<SceneName, React.FC<{ fonts: Fonts }>> = { open: Open, color: ColorScene, sheen: SheenScene, context: ContextScene, reference: ReferenceScene, brief: BriefScene, end: End };
  const endStart = sceneStart("end");
  return (
    <FormatContext.Provider value={format}>
      <AbsoluteFill style={{ backgroundColor: INK }}>
        {SCENES.map((name, i) => {
          const Comp = components[name];
          const from = Math.round(sceneStart(name) * fps);
          const dur = Math.round((C[name].dur + (i < SCENES.length - 1 ? FADE : 0)) * fps);
          return (
            <Sequence key={name} from={from} durationInFrames={dur} name={name}>
              <FadeIn first={i === 0}>
                <Comp fonts={fonts} />
              </FadeIn>
              {i > 0 ? <Sfx atSec={0} file="whoosh.mp3" volume={0.22} /> : null}
            </Sequence>
          );
        })}
        {C.music ? (
          <Audio
            src={staticFile(`music/${C.music}`)}
            volume={(f) => interpolate(f, [0, fps * 1.5, durationInFrames - fps * 1.2, durationInFrames], [0, 0.22, 0.24, 0], { extrapolateRight: "clamp" })}
          />
        ) : null}
        <Sfx atSec={endStart + C.end.soundAt} file="chime.mp3" volume={0.5} />
        {qc ? <QcProbe safe={format === "16x9" ? SAFE_WIDE : SAFE_TALL} keepClear={format === "16x9" ? undefined : RAIL} ready={fonts.ready} /> : null}
      </AbsoluteFill>
    </FormatContext.Provider>
  );
};

const FadeIn: React.FC<{ children: ReactNode; first?: boolean }> = ({ children, first }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = first ? 1 : interpolate(frame, [0, FADE * fps], [0, 1], { easing: Easing.inOut(Easing.sin), ...clamp });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
