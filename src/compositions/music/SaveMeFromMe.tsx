// "Save Me From Me" music video (MVP). 1920x1080, story from videos/save-me-from-me/beat-sheet.md.
// Footage: the two 5 s AI clips, split into 6 shots, slowed 4x with RIFE (public/broll/save-me-from-me, git-ignored).
import { loadFont } from "@remotion/fonts";
import { Audio } from "@remotion/media";
import { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, Freeze, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { getBrandAsset } from "../../lib/registry";
import { CrackLayer, Shards } from "./Cracks";
import { BAR, BEAT, CUE, FPS, gradeAt, hitPulse, hitsIn, SONG_SECONDS, sec, crackLevel } from "./timing";

export const SAVE_ME_DURATION = Math.ceil(SONG_SECONDS * FPS);
const DIR = "broll/save-me-from-me";
const SRC_W = 768;
const SRC_H = 1344;

type Clip = "kitchenA" | "kitchenB" | "mirrorA" | "mirrorB" | "crackA" | "crackB";
/** A picture: a slowed clip (optionally reversed or frozen) or a still plate. Times are seconds in the source. */
type Pic = { clip?: Clip; rev?: boolean; plate?: "kitchenA-empty" | "bathroom-empty"; from?: number; rate?: number; hold?: number };
type Shot = {
  start: number;
  end: number;
  layout: "window" | "full" | "split";
  pic: Pic;
  right?: Pic;
  /** Focus point (0 to 1 of the source) and zoom range, for full-frame shots */
  fx?: number;
  fy?: number;
  zoom?: [number, number];
  /** Crack network drawn over this shot: impact point on screen and style */
  crack?: { x: number; y: number; style: "glass" | "wall"; seed: number };
};

const MIRROR_FACE = { x: 960, y: 420 };

// Fast cuts for chorus 2: every 2 beats, cycling through all shots
const chorus2: Shot[] = (() => {
  const cycle: Pic[] = [
    { clip: "crackA", from: 4 }, { clip: "kitchenB", from: 3 }, { clip: "crackB", from: 5 }, { clip: "mirrorA", from: 3.5 },
    { plate: "kitchenA-empty" }, { clip: "crackB", from: 2 }, { clip: "kitchenA", from: 5 }, { plate: "bathroom-empty" },
  ];
  const out: Shot[] = [];
  let t = CUE.CH2;
  let i = 0;
  while (t < CUE.transition - 0.01) {
    const end = Math.min(t + BEAT * 2, CUE.transition);
    const pic = cycle[i % cycle.length];
    const full = pic.plate !== undefined || i % 3 === 1;
    out.push({ start: t, end, layout: full ? "full" : "window", pic: { ...pic, rate: 0.6 }, fx: 0.5, fy: 0.42, zoom: [1.15, 1.3], crack: { x: 300 + ((i * 523) % 1300), y: 260 + ((i * 337) % 560), style: pic.plate ? "wall" : "glass", seed: 40 + i } });
    t = end;
    i++;
  }
  return out;
})();

const SHOTS: Shot[] = [
  // Intro: kitchen details, no face
  { start: 0, end: 6, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.25, fy: 0.07, zoom: [1.35, 1.5] },
  { start: 6, end: 12, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.12, fy: 0.68, zoom: [1.6, 1.75] },
  { start: 12, end: CUE.drums_in, layout: "full", pic: { clip: "kitchenA", from: 0, rate: 0.5 }, fx: 0.27, fy: 0.35, zoom: [1.55, 1.7] },
  // Drums in, then verse 1 in the kitchen
  { start: CUE.drums_in, end: CUE.V1, layout: "window", pic: { clip: "kitchenA", from: 0, rate: 0.83 } },
  { start: CUE.V1, end: 29.9, layout: "window", pic: { clip: "kitchenB", from: 0, rate: 0.5 } },
  { start: 29.9, end: 29.9 + 2 / FPS, layout: "window", pic: { clip: "crackB", hold: 0.2 } },
  { start: 29.9 + 2 / FPS, end: CUE.PC1, layout: "window", pic: { clip: "kitchenB", from: 1.05, rate: 0.62 } },
  // Pre-chorus 1: to the bathroom
  { start: CUE.PC1, end: 43.5, layout: "window", pic: { clip: "mirrorA", from: 0, rate: 0.45 } },
  { start: 43.5, end: CUE.CH1, layout: "window", pic: { clip: "mirrorB", from: 0, rate: 0.37 } },
  // Chorus 1: me vs me, then the first crack
  { start: CUE.CH1, end: CUE.from_me_1, layout: "split", pic: { clip: "mirrorA", from: 3, rate: 0.28 }, right: { clip: "crackA", from: 0, rate: 0.12 } },
  { start: CUE.from_me_1, end: CUE.from_me_2, layout: "window", pic: { clip: "crackA", from: 1.1, rate: 0.42 }, crack: { ...MIRROR_FACE, style: "glass", seed: 1 } },
  { start: CUE.from_me_2, end: CUE.break, layout: "window", pic: { clip: "crackB", from: 3, rate: 0.55 }, crack: { ...MIRROR_FACE, style: "glass", seed: 2 } },
  // Instrumental break: the cracks spread through the house
  { start: CUE.break, end: CUE.break + BAR * 2, layout: "full", pic: { plate: "bathroom-empty" }, fx: 0.62, fy: 0.4, zoom: [1.0, 1.12], crack: { x: 1100, y: 380, style: "glass", seed: 3 } },
  { start: CUE.break + BAR * 2, end: CUE.break + BAR * 4, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.55, fy: 0.3, zoom: [1.0, 1.1], crack: { x: 1400, y: 300, style: "wall", seed: 4 } },
  { start: CUE.break + BAR * 4, end: CUE.break + BAR * 6, layout: "window", pic: { clip: "crackA", from: 3.5, rate: 0.25 }, crack: { ...MIRROR_FACE, style: "glass", seed: 5 } },
  { start: CUE.break + BAR * 6, end: CUE.V2, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.25, fy: 0.12, zoom: [1.3, 1.45], crack: { x: 700, y: 200, style: "wall", seed: 6 } },
  // Verse 2: flaws surrounding her, walls break, the glass shatters
  { start: CUE.V2, end: CUE.walls, layout: "window", pic: { clip: "mirrorA", from: 0, rate: 0.41 }, crack: { x: 960, y: 540, style: "wall", seed: 7 } },
  { start: CUE.walls, end: 125.1, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.5, fy: 0.35, zoom: [1.05, 1.15], crack: { x: 1500, y: 420, style: "wall", seed: 8 } },
  { start: 125.1, end: CUE.PC2, layout: "full", pic: { clip: "kitchenA", from: 6, rate: 0.4 }, fx: 0.27, fy: 0.35, zoom: [1.55, 1.6], crack: { x: 690, y: 520, style: "glass", seed: 9 } },
  // Pre-chorus 2: no escape, the angry face flashes
  { start: CUE.PC2, end: 133.4, layout: "window", pic: { clip: "kitchenB", from: 0, rate: 0.5 }, crack: { x: 400, y: 800, style: "wall", seed: 10 } },
  { start: 133.4, end: 133.4 + 3 / FPS, layout: "window", pic: { clip: "crackA", hold: 0.3 } },
  { start: 133.4 + 3 / FPS, end: 137.9, layout: "window", pic: { clip: "kitchenB", from: 3.1, rate: 0.5 }, crack: { x: 400, y: 800, style: "wall", seed: 10 } },
  { start: 137.9, end: 137.9 + 3 / FPS, layout: "window", pic: { clip: "crackB", hold: 0.3 } },
  { start: 137.9 + 3 / FPS, end: CUE.CH2, layout: "full", pic: { plate: "bathroom-empty" }, fx: 0.62, fy: 0.45, zoom: [1.1, 1.25], crack: { x: 1100, y: 380, style: "glass", seed: 3 } },
  ...chorus2,
  // Transition: frozen
  { start: CUE.transition, end: CUE.bridge, layout: "window", pic: { clip: "crackB", hold: 7.1 }, crack: { ...MIRROR_FACE, style: "glass", seed: 2 } },
  // Bridge: a light, face to face
  { start: CUE.bridge, end: 182.5, layout: "window", pic: { clip: "crackB", hold: 7.1 }, crack: { ...MIRROR_FACE, style: "glass", seed: 2 } },
  { start: 182.5, end: CUE.instr2, layout: "window", pic: { clip: "mirrorA", hold: 1.2 }, crack: { x: 960, y: 540, style: "wall", seed: 7 } },
  // Instrumental 2 and final chorus: everything rewinds, one step per drum hit
  { start: CUE.instr2, end: CUE.instr2 + BAR * 2, layout: "window", pic: { clip: "crackB", rev: true, from: 0, rate: 0.6 }, crack: { ...MIRROR_FACE, style: "glass", seed: 2 } },
  { start: CUE.instr2 + BAR * 2, end: CUE.instr2 + BAR * 4, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.5, fy: 0.35, zoom: [1.15, 1.05], crack: { x: 1500, y: 420, style: "wall", seed: 8 } },
  { start: CUE.instr2 + BAR * 4, end: CUE.instr2 + BAR * 6, layout: "full", pic: { plate: "bathroom-empty" }, fx: 0.62, fy: 0.4, zoom: [1.12, 1.0], crack: { x: 1100, y: 380, style: "glass", seed: 3 } },
  { start: CUE.instr2 + BAR * 6, end: CUE.FC, layout: "window", pic: { clip: "crackA", rev: true, from: 0, rate: 0.5 }, crack: { ...MIRROR_FACE, style: "glass", seed: 1 } },
  { start: CUE.FC, end: CUE.FC + BAR * 3, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.25, fy: 0.12, zoom: [1.45, 1.3], crack: { x: 700, y: 200, style: "wall", seed: 6 } },
  { start: CUE.FC + BAR * 3, end: CUE.FC + BAR * 6, layout: "window", pic: { clip: "mirrorA", rev: true, from: 0, rate: 0.35 }, crack: { x: 960, y: 540, style: "wall", seed: 7 } },
  { start: CUE.FC + BAR * 6, end: CUE.vocals_end, layout: "window", pic: { clip: "crackA", rev: true, from: 2.5, rate: 0.3 }, crack: { ...MIRROR_FACE, style: "glass", seed: 1 } },
  // Calm: warm kitchen, the lamp, fade out
  { start: CUE.vocals_end, end: CUE.tail + BAR * 2, layout: "window", pic: { clip: "kitchenB", rev: true, from: 0, rate: 0.45 } },
  { start: CUE.tail + BAR * 2, end: CUE.fade, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.5, fy: 0.3, zoom: [1.0, 1.08] },
  { start: CUE.fade, end: SONG_SECONDS, layout: "full", pic: { plate: "kitchenA-empty" }, fx: 0.25, fy: 0.07, zoom: [1.5, 1.35] },
];

/** The picture itself, sized to width x height (source aspect kept by the parent). */
const PicView: React.FC<{ pic: Pic; width: number; height: number; style?: React.CSSProperties }> = ({ pic, width, height, style }) => {
  const s: React.CSSProperties = { width, height, objectFit: "cover", display: "block", ...style };
  if (pic.plate) return <Img src={staticFile(`${DIR}/plates/${pic.plate}.png`)} style={s} />;
  const src = staticFile(`${DIR}/clips/${pic.clip}${pic.rev ? "-rev" : ""}.mp4`);
  if (pic.hold !== undefined) {
    return (
      <Freeze frame={0}>
        <OffthreadVideo src={src} muted trimBefore={Math.round(pic.hold * FPS)} style={s} />
      </Freeze>
    );
  }
  return <OffthreadVideo src={src} muted trimBefore={Math.round((pic.from ?? 0) * FPS)} playbackRate={pic.rate ?? 1} style={s} />;
};

/** Portrait footage in a tall window, over a blurred, darkened copy of itself filling the frame. */
const WindowShot: React.FC<{ pic: Pic; progress: number }> = ({ pic, progress }) => {
  const winW = Math.round((1080 * SRC_W) / SRC_H);
  const push = interpolate(progress, [0, 1], [1, 1.06]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#05060a" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 480, height: 270, overflow: "hidden", transform: "scale(4)", transformOrigin: "0 0", filter: "blur(5px) brightness(0.32) saturate(0.7)" }}>
        <div style={{ position: "absolute", top: -285 }}>
          <PicView pic={pic} width={480} height={840} />
        </div>
      </div>
      <div style={{ position: "absolute", left: (1920 - winW) / 2, top: 0, width: winW, height: 1080, overflow: "hidden", boxShadow: "0 0 120px 40px rgba(0,0,0,0.85)" }}>
        <div style={{ transform: `scale(${push})`, transformOrigin: "50% 40%" }}>
          <PicView pic={pic} width={winW} height={1080} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Source cropped to fill 1920x1080 around a focus point, with a slow zoom. */
const FullShot: React.FC<{ pic: Pic; progress: number; fx: number; fy: number; zoom: [number, number] }> = ({ pic, progress, fx, fy, zoom }) => {
  const scale = (1920 / SRC_W) * interpolate(progress, [0, 1], zoom);
  const w = SRC_W * scale;
  const h = SRC_H * scale;
  const left = Math.min(0, Math.max(1920 - w, 960 - fx * w));
  const top = Math.min(0, Math.max(1080 - h, 540 - fy * h));
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#05060a" }}>
      <div style={{ position: "absolute", left, top }}>
        <PicView pic={pic} width={w} height={h} />
      </div>
    </AbsoluteFill>
  );
};

/** Me vs me: the real Alisson on the left, the reflection on the right. */
const SplitShot: React.FC<{ left: Pic; right: Pic }> = ({ left, right }) => {
  const h = (960 * SRC_H) / SRC_W;
  return (
    <AbsoluteFill style={{ backgroundColor: "#05060a" }}>
      {[left, right].map((pic, i) => (
        <div key={i} style={{ position: "absolute", left: i * 960, top: 0, width: 960, height: 1080, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -(h - 1080) * 0.3 }}>
            <PicView pic={pic} width={960} height={h} />
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 958, top: 0, width: 4, height: 1080, background: "linear-gradient(#ffffff00, #ffffffcc, #ffffff00)" }} />
    </AbsoluteFill>
  );
};

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const len = Math.max(1, sec(shot.end) - sec(shot.start));
  const progress = frame / len;
  if (shot.layout === "split") return <SplitShot left={shot.pic} right={shot.right ?? shot.pic} />;
  if (shot.layout === "full") return <FullShot pic={shot.pic} progress={progress} fx={shot.fx ?? 0.5} fy={shot.fy ?? 0.4} zoom={shot.zoom ?? [1, 1.05]} />;
  return <WindowShot pic={shot.pic} progress={progress} />;
};

/** Cracks over the current shot (drawn at the song-wide crack level), plus the shards. */
const Breakage: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const shot = SHOTS.find((s) => t >= s.start && t < s.end);
  const level = crackLevel(t);
  const { glow } = gradeAt(t);
  const freeze = t >= CUE.transition && t < CUE.instr2;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {shot?.crack ? <CrackLayer seed={shot.crack.seed} ox={shot.crack.x} oy={shot.crack.y} level={level} style={shot.crack.style} glow={glow} /> : null}
      <Shards t={t} bursts={hitsIn(CUE.CH2, CUE.transition)} ox={960} oy={460} seed={11} freezeAt={freeze ? CUE.transition : undefined} />
      <Shards t={t} bursts={[125.3]} ox={690} oy={520} seed={12} count={22} />
      <Shards t={t} bursts={hitsIn(CUE.instr2, CUE.FC)} ox={960} oy={460} seed={13} direction={-1} count={6} />
    </AbsoluteFill>
  );
};

/** Color grade, glow on hits, warm bridge light, vignette and film grain. */
const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const { cold, warm, glow } = gradeAt(t);
  const pulse = hitPulse(t);
  const flicker = t > CUE.PC1 + 10 && t < CUE.CH1 ? (Math.sin(t * 37) > 0.6 ? 0.35 : 0) : 0;
  const bridgeLight = interpolate(t, [CUE.bridge, 178.5, CUE.instr2, CUE.FC], [0, 0.45, 0.6, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeIn = interpolate(t, [0, 3.5], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(t, [SONG_SECONDS - 7, SONG_SECONDS - 1.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: "#1d3c78", mixBlendMode: "soft-light", opacity: 0.55 * cold }} />
      <AbsoluteFill style={{ backgroundColor: "#ff9a4a", mixBlendMode: "soft-light", opacity: 0.6 * warm }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #ff3d9a 0%, #7a1fd1 45%, transparent 75%)", mixBlendMode: "screen", opacity: 0.32 * glow }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 10%, #ffd59a 0%, #ff9a4a 30%, transparent 70%)", mixBlendMode: "screen", opacity: bridgeLight }} />
      <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: 0.08 * pulse * (t > CUE.from_me_1 && t < CUE.transition ? 1 : 0) }} />
      <AbsoluteFill style={{ backgroundColor: "#000000", opacity: flicker }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />
      <Img src={staticFile(`${DIR}/grain/g${frame % 6}.png`)} style={{ position: "absolute", width: 1920, height: 1080, mixBlendMode: "overlay", opacity: 0.22 }} />
      <AbsoluteFill style={{ backgroundColor: "#000000", opacity: Math.max(fadeIn, fadeOut) }} />
    </AbsoluteFill>
  );
};

const Title: React.FC<{ font: string }> = ({ font }) => {
  const t = useCurrentFrame() / FPS;
  const show = (a: number, b: number) => interpolate(t, [a, a + 1.2, b - 1.2, b], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const o = Math.max(show(7, 15.5), show(SONG_SECONDS - 11, SONG_SECONDS - 2.5));
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ fontFamily: font, fontWeight: 700, fontSize: 64, letterSpacing: "0.42em", color: "#f4f1ff", textShadow: "0 0 30px rgba(255,61,154,0.6)", paddingLeft: "0.42em" }}>
        SAVE ME FROM ME
      </div>
    </AbsoluteFill>
  );
};

export const SaveMeFromMe: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading title font"));
  useEffect(() => {
    loadFont({ family: "Poppins", url: getBrandAsset("demo-home-services", "fonts/Poppins-700.woff2"), weight: "700" })
      .then(() => continueRender(handle))
      .catch((e) => cancelRender(e));
  }, [handle]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SHOTS.map((shot, i) => (
        <Sequence key={i} from={sec(shot.start)} durationInFrames={Math.max(1, sec(shot.end) - sec(shot.start))} layout="none">
          <ShotView shot={shot} />
        </Sequence>
      ))}
      <Breakage />
      <Grade />
      <Title font="Poppins" />
      <Audio src={staticFile("audio/save-me-from-me/song.mp3")} />
    </AbsoluteFill>
  );
};
