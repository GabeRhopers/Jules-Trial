// BTAC before/after loop (4:5, 1080x1350, 10 s): the client's two clean photos, unchanged; only the text
// boxes and the logo are drawn on top, placed exactly as in the client's text mockups.
//   0.0-4.2  before (cold) + "Keep the cold out" slides in from the left, words rise
//   4.2-5.4  soft wipe to after (warm)
//   5.6-9.3  "of your workout" slides in from the right
//   9.3-10   box slides out and the picture returns to "before", so the GIF loops seamlessly
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";

const DIR = "stories/btac-before-after";
const BLUE = "#1B3DAF"; // measured from the client's mockup boxes
const FONT = "BTAC Open Sans";
loadFont({ family: FONT, url: staticFile(`${DIR}/OpenSans-700.woff2`), weight: "700" });

export const BTAC_BA = { width: 1080, height: 1350, fps: 30, durationSec: 10 };

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Text box flush to a screen edge: the box slides in from its edge, then the words rise one by one */
const EdgeBox: React.FC<{ text: string; side: "left" | "right"; x0: number; x1: number; y0: number; y1: number; inAt: number; outAt: number; t: number; dx?: number; dy?: number; size?: number }> = ({ text, side, x0, x1, y0, y1, inAt, outAt, t, dx = 0, dy = 0, size = 59 }) => {
  const w = x1 - x0;
  const pin = interpolate(t, [inAt, inAt + 0.55], [0, 1], { ...clamp, easing: ease });
  const pout = interpolate(t, [outAt, outAt + 0.45], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const shift = (1 - pin + pout) * (w + 20) * (side === "left" ? -1 : 1);
  const words = text.split(" ");
  return (
    <div style={{ position: "absolute", left: x0, top: y0, width: w, height: y1 - y0, backgroundColor: BLUE, transform: `translateX(${shift}px)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, color: "#FFFFFF", whiteSpace: "nowrap", letterSpacing: "-0.005em", display: "flex", gap: "0.27em", transform: `translate(${dx}px, ${dy}px)` }}>
        {words.map((wd, i) => {
          const at = inAt + 0.3 + i * 0.12;
          const p = interpolate(t, [at, at + 0.4], [0, 1], { ...clamp, easing: ease });
          return (
            <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 26}px)` }}>
              {wd}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const BtacBeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W } = useVideoConfig();
  const t = frame / fps;
  // wipe before -> after (left to right, soft edge); fade back to before at the very end for the loop
  const wipe = interpolate(t, [4.2, 5.4], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const back = interpolate(t, [9.45, 10], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const edge = -120 + wipe * (W + 240);
  const feather = 120;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img src={staticFile(`${DIR}/before.webp`)} style={{ position: "absolute", width: "100%", height: "100%" }} />
      <AbsoluteFill
        style={{
          opacity: 1 - back,
          maskImage: `linear-gradient(90deg, #000 ${edge - feather / 2}px, transparent ${edge + feather / 2}px)`,
          WebkitMaskImage: `linear-gradient(90deg, #000 ${edge - feather / 2}px, transparent ${edge + feather / 2}px)`,
        }}
      >
        <Img src={staticFile(`${DIR}/after.webp`)} style={{ position: "absolute", width: "100%", height: "100%" }} />
      </AbsoluteFill>
      {/* a thin light line rides the wipe edge */}
      {wipe > 0 && wipe < 1 ? <div style={{ position: "absolute", top: 0, bottom: 0, left: edge - 2, width: 4, background: "rgba(255,255,255,0.75)", boxShadow: "0 0 18px rgba(255,255,255,0.6)" }} /> : null}
      <EdgeBox text="Keep the cold out" side="left" x0={0} x1={576} y0={703} y1={796} inAt={0.45} outAt={3.85} t={t} dx={-4} dy={3} />
      <EdgeBox text="of your workout" side="right" x0={525} x1={1080} y0={1037} y1={1130} inAt={5.55} outAt={9.3} t={t} dx={9} dy={-1} />
      {/* BTAC logo, same place and size as in the mockups */}
      <Img src={staticFile(`${DIR}/logo.png`)} style={{ position: "absolute", left: 71.4, top: 1208.2, width: 194.9 }} />
    </AbsoluteFill>
  );
};

/**
 * 9:16 Reels version: the full photo unchanged in the center (bands filled with a blurred, slightly darkened
 * copy of the same photo), a straight cut from before to after (no transition), and both lines staying on
 * screen so they read together. Text sits inside the Reels safe zone (top 270, bottom 670, right rail). No logo.
 */
export const BTAC_BA_REEL = { width: 1080, height: 1920, fps: 30, durationSec: 6 };
const PHOTO_TOP = (1920 - 1350) / 2;
/** soft dissolve before -> after */
const MIX = [2.1, 3.0];
/** loop: dissolve back to the start at the end */
const LOOP = [5.6, 6.0];
const Photo: React.FC<{ name: string; opacity: number; dir?: string; ext?: string }> = ({ name, opacity, dir = DIR, ext = "webp" }) => {
  const src = staticFile(`${dir}/${name}.${ext}`);
  return (
    <AbsoluteFill style={{ opacity }}>
      {/* bands above and below: the same photo, blurred and darkened (the photo itself is untouched) */}
      <Img src={src} style={{ position: "absolute", left: -360, top: -60, width: 1800, height: 2040, objectFit: "cover", filter: "blur(38px) brightness(0.72)" }} />
      <Img src={src} style={{ position: "absolute", left: 0, top: PHOTO_TOP, width: 1080, height: 1350, objectFit: "cover" }} />
    </AbsoluteFill>
  );
};
export const BtacBeforeAfterReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const smooth = Easing.inOut(Easing.sin);
  const after = interpolate(t, MIX, [0, 1], { ...clamp, easing: smooth }) * (1 - interpolate(t, LOOP, [0, 1], { ...clamp, easing: smooth }));
  const textOut = interpolate(t, LOOP, [1, 0], { ...clamp, easing: smooth });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo name="before" opacity={1} />
      <Photo name="after" opacity={after} />
      <AbsoluteFill style={{ opacity: textOut }}>
        <EdgeBox text="Keep the cold out" side="left" x0={0} x1={576} y0={900} y1={993} inAt={0.3} outAt={99} t={t} dx={-4} dy={3} />
        <EdgeBox text="of your workout" side="right" x0={525} x1={1080} y0={1013} y1={1106} inAt={2.8} outAt={99} t={t} dx={9} dy={-1} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Football set: plain white text with underlined words (as in the client's mockups) ----------

const FOOT_DIR = "stories/btac-football";
/** A centered line of white text; words rise one by one and marked words get an underline that draws in */
const PlainLine: React.FC<{ words: [string, boolean][]; y: number; at: number; t: number }> = ({ words, y, at, t }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", gap: "0.27em", fontFamily: FONT, fontWeight: 700, fontSize: 60, color: "#FFFFFF", whiteSpace: "nowrap" }}>
    {words.map(([w, under], i) => {
      const a = at + i * 0.13;
      const p = interpolate(t, [a, a + 0.45], [0, 1], { ...clamp, easing: ease });
      const u = interpolate(t, [a + 0.35, a + 0.8], [0, 1], { ...clamp, easing: ease });
      return (
        <span key={i} style={{ position: "relative", display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 26}px)` }}>
          {w}
          {under ? <span style={{ position: "absolute", left: 0, bottom: 4, height: 4, width: `${u * 100}%`, backgroundColor: "#FFFFFF" }} /> : null}
        </span>
      );
    })}
  </div>
);

export const BtacFootballReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const smooth = Easing.inOut(Easing.sin);
  const after = interpolate(t, MIX, [0, 1], { ...clamp, easing: smooth }) * (1 - interpolate(t, LOOP, [0, 1], { ...clamp, easing: smooth }));
  const textOut = interpolate(t, LOOP, [1, 0], { ...clamp, easing: smooth });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo name="before" opacity={1} dir={FOOT_DIR} />
      <Photo name="after" opacity={after} dir={FOOT_DIR} />
      <AbsoluteFill style={{ opacity: textOut }}>
        <PlainLine words={[["Football", false], ["is", false], ["better", true], ["when", false]]} y={995} at={0.3} t={t} />
        <PlainLine words={[["the", false], ["room", false], ["feels", true], ["right", true]]} y={1075} at={2.8} t={t} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Garage set: blue boxes, as in the client's mockups (photos 1122x1402, shown at full width) ----------
const GARAGE_DIR = "stories/btac-garage";
export const BtacGarageReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const smooth = Easing.inOut(Easing.sin);
  const after = interpolate(t, MIX, [0, 1], { ...clamp, easing: smooth }) * (1 - interpolate(t, LOOP, [0, 1], { ...clamp, easing: smooth }));
  const textOut = interpolate(t, LOOP, [1, 0], { ...clamp, easing: smooth });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo name="before" opacity={1} dir={GARAGE_DIR} ext="jpg" />
      <Photo name="after" opacity={after} dir={GARAGE_DIR} ext="jpg" />
      <AbsoluteFill style={{ opacity: textOut }}>
        <EdgeBox text="Make your garage" side="left" x0={0} x1={570} y0={PHOTO_TOP + 324} y1={PHOTO_TOP + 407} inAt={0.3} outAt={99} t={t} dx={-3} dy={-9} />
        <EdgeBox text="usable all winter." side="left" x0={0} x1={575} y0={1160} y1={1241} inAt={2.8} outAt={99} t={t} dx={-1} dy={-9} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Family set: plain white centered lines with a soft shadow (as in the client's mockups) ----------
const FAMILY_DIR = "stories/btac-family";
/** Centered block of lines around cx; words rise one by one */
const PlainBlock: React.FC<{ lines: string[]; cx: number; y: number; at: number; t: number }> = ({ lines, cx, y, at, t }) => {
  let k = 0;
  return (
    <div style={{ position: "absolute", left: cx - 300, width: 600, top: y, fontFamily: FONT, fontWeight: 700, fontSize: 62, lineHeight: "57px", color: "#FFFFFF", textAlign: "center", textShadow: "0 2px 14px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.35)" }}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {line.split(" ").map((w, wi) => {
            const a = at + k++ * 0.13;
            const p = interpolate(t, [a, a + 0.45], [0, 1], { ...clamp, easing: ease });
            return (
              <span key={wi} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 24}px)`, marginRight: wi < line.split(" ").length - 1 ? "0.27em" : 0 }}>
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const BtacFamilyReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const smooth = Easing.inOut(Easing.sin);
  const after = interpolate(t, MIX, [0, 1], { ...clamp, easing: smooth }) * (1 - interpolate(t, LOOP, [0, 1], { ...clamp, easing: smooth }));
  const textOut = interpolate(t, LOOP, [1, 0], { ...clamp, easing: smooth });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo name="before" opacity={1} dir={FAMILY_DIR} />
      <Photo name="after" opacity={after} dir={FAMILY_DIR} />
      <AbsoluteFill style={{ opacity: textOut }}>
        <PlainBlock lines={["Comfort", "belongs..."]} cx={790} y={918} at={0.3} t={t} />
        <PlainBlock lines={["...in every", "room."]} cx={790} y={1048} at={2.8} t={t} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Home office set: both lines stacked at the right, raised from the mockup so the second line clears
// the Reels caption area and the right button rail
const OFFICE_DIR = "stories/btac-office";
export const BtacOfficeReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const smooth = Easing.inOut(Easing.sin);
  const after = interpolate(t, MIX, [0, 1], { ...clamp, easing: smooth }) * (1 - interpolate(t, LOOP, [0, 1], { ...clamp, easing: smooth }));
  const textOut = interpolate(t, LOOP, [1, 0], { ...clamp, easing: smooth });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo name="before" opacity={1} dir={OFFICE_DIR} />
      <Photo name="after" opacity={after} dir={OFFICE_DIR} />
      <AbsoluteFill style={{ opacity: textOut }}>
        <PlainBlock lines={["Your home", "office should", "not have..."]} cx={785} y={952} at={0.3} t={t} />
        <PlainBlock lines={["...a winter", "dress code."]} cx={760} y={1138} at={2.8} t={t} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Bedroom set: blue boxes as in the mockups (one box per line). "Wake up comfortable." moves from the
// lower right (under the Reels caption and button rail) to the lower left; second text changed by the client
// to "Get a BTAC mini split system."
const BEDROOM_DIR = "stories/btac-bedroom";
export const BtacBedroomReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const smooth = Easing.inOut(Easing.sin);
  const after = interpolate(t, MIX, [0, 1], { ...clamp, easing: smooth }) * (1 - interpolate(t, LOOP, [0, 1], { ...clamp, easing: smooth }));
  const textOut = interpolate(t, LOOP, [1, 0], { ...clamp, easing: smooth });
  const T = PHOTO_TOP;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Photo name="before" opacity={1} dir={BEDROOM_DIR} />
      <Photo name="after" opacity={after} dir={BEDROOM_DIR} />
      <AbsoluteFill style={{ opacity: textOut }}>
        <EdgeBox text="Too cold to" side="left" x0={16} x1={364} y0={T + 386} y1={T + 443} inAt={0.3} outAt={99} t={t} size={47} dx={-5} dy={-2} />
        <EdgeBox text="leave the bed?" side="left" x0={16} x1={364} y0={T + 454} y1={T + 511} inAt={0.55} outAt={99} t={t} size={47} dy={-6} />
        <EdgeBox text="Get a BTAC" side="left" x0={16} x1={442} y0={1120} y1={1177} inAt={2.8} outAt={99} t={t} size={47} dy={-2} />
        <EdgeBox text="mini split system." side="left" x0={16} x1={442} y0={1188} y1={1245} inAt={3.05} outAt={99} t={t} size={47} dy={-5} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
