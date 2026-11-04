// DTI "Horizontal Directional Drilling" explainer (v2): realistic engineering visualization, 16:9 1920x1080,
// 30 fps, 3:08. Picture: shots in ./timeline.ts over one fixed site model; sound: the original DTI narration,
// with "over the past 23 years" replaced by the "for over 30 years." pickup (public/hdd/.../pickup.wav once
// recorded; until then that phrase is silent, with no on-screen note).
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrandFonts } from "../lib/fonts";
import { getBrand } from "../lib/registry";
import narration from "../../hdd/dti-hdd-explainer/narration.json";
import { useAssets } from "./assets";
import { project, type Pose } from "./camera";
import { CREEK_ANCHORS, CreekScene } from "./Creek";
import { Scene } from "./Scene";
import { boreAt, BOUNDS, CITY_ANGLE, cityToWorld, EXIT_LOT, POTHOLE, RIG_LOT, ROAD_HALF, UTILITIES, utilityLine } from "./site";
import { ANCHORS, DURATION, headAt, pilotAt, processState, pullAt, reamAt, SHOTS, shotAt, type Shot } from "./timeline";
import { HEAD_OFF, SWIVEL_OFF } from "./tools";

export const HDD_FPS = 30;
export const HDD_DURATION_FRAMES = Math.round(DURATION * HDD_FPS);

const INK = "#1F2328";
const BLUE = "#0E4D97";
const ORANGE = "#F78228";
const GRAY = "#575A5C";
const PANEL = "rgba(255,255,255,0.95)";
/** Captions live in a fixed band at the bottom; nothing else is placed below this line */
const CAPTION_TOP = 1080 - 210;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fadeWin = (t: number, a: number, b = Infinity, inDur = 0.4, outDur = 0.35) =>
  Math.min(interpolate(t, [a, a + inDur], [0, 1], { ...clamp, easing: ease }), b === Infinity ? 1 : interpolate(t, [b - outDur, b], [1, 0], clamp));
type Fonts = { heading: string; body: string };

// ---------- captions ----------
type Page = { text: string; start: number; end: number };
const PAGES: Page[] = (() => {
  const out: Page[] = [];
  for (const n of narration.narration) {
    const words = n.words.map((w) => ({ ...w }));
    const pickup = (n as { pickup?: { text: string; start: number } }).pickup;
    if (pickup) pickup.text.split(" ").forEach((w, i) => words.push({ w, s: pickup.start + i * 0.36, e: pickup.start + (i + 1) * 0.36 }));
    let cur: typeof words = [];
    const flush = () => {
      if (!cur.length) return;
      out.push({ text: cur.map((w) => w.w).join(" "), start: cur[0].s, end: cur[cur.length - 1].e });
      cur = [];
    };
    for (const w of words) {
      const len = cur.map((x) => x.w).join(" ").length + w.w.length + 1;
      if (len > 78) flush();
      cur.push(w);
      if (/[,]$/.test(w.w) && cur.map((x) => x.w).join(" ").length > 46) flush();
    }
    flush();
  }
  return out.map((p, i) => ({ ...p, end: Math.min(p.end + 0.8, out[i + 1]?.start ?? p.end + 0.8) }));
})();
export const CAPTION_PAGES = PAGES;

const Captions: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const p = PAGES.find((x) => t >= x.start && t < x.end);
  if (!p) return null;
  const o = fadeWin(t, p.start, p.end, 0.12, 0.12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: CAPTION_TOP + 40, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ maxWidth: 1260, padding: "14px 28px", backgroundColor: "rgba(20,24,28,0.8)", borderRadius: 8, color: "#fff", fontFamily: fonts.body, fontWeight: 500, fontSize: 36, lineHeight: 1.32, textAlign: "center" }}>{p.text}</div>
    </div>
  );
};

// ---------- building blocks ----------
const Title: React.FC<{ shot: Shot; t: number; fonts: Fonts }> = ({ shot, t, fonts }) => {
  if (!shot.title) return null;
  const { number, text, at, out } = shot.title;
  const o = fadeWin(t, at, out ?? shot.end, 0.5, 0.4);
  const x = interpolate(t, [at, at + 0.6], [-18, 0], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 96, top: 64, opacity: o, transform: `translateX(${x}px)`, display: "flex", alignItems: "stretch", boxShadow: "0 6px 24px rgba(0,0,0,0.14)", borderRadius: 6, overflow: "hidden" }}>
      {number ? <div style={{ backgroundColor: BLUE, color: "#fff", fontFamily: fonts.heading, fontWeight: 700, fontSize: 44, padding: "12px 24px", display: "grid", placeItems: "center" }}>{number}</div> : null}
      <div style={{ backgroundColor: PANEL, color: INK, fontFamily: fonts.heading, fontWeight: 700, fontSize: 44, padding: "12px 28px", letterSpacing: "-0.01em", borderLeft: number ? "none" : `6px solid ${BLUE}` }}>{text}</div>
    </div>
  );
};

const Pill: React.FC<{ text: string; fonts: Fonts; accent?: boolean }> = ({ text, fonts, accent }) => (
  <div style={{ backgroundColor: PANEL, color: INK, fontFamily: fonts.body, fontWeight: 600, fontSize: 27, padding: "9px 18px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 3px 14px rgba(0,0,0,0.16)", borderLeft: `5px solid ${accent ? ORANGE : BLUE}` }}>{text}</div>
);

/** A label with a leader line to its 3D anchor, kept inside the frame and above the caption band */
const Callout: React.FC<{ text: string; ax: number; ay: number; dx: number; dy: number; o: number; fonts: Fonts; W: number; accent?: boolean }> = ({ text, ax, ay, dx, dy, o, fonts, W, accent }) => {
  const estW = text.length * 14.5 + 46;
  const align = dx < 0 ? 1 : dx === 0 ? 0.5 : 0;
  const lx = Math.min(W - 70 - estW * (1 - align), Math.max(70 + estW * align, ax + dx));
  const ly = Math.min(CAPTION_TOP - 40, Math.max(170, ay + dy));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={ax} y1={ay} x2={lx} y2={ly} stroke="rgba(31,35,40,0.75)" strokeWidth={2} />
        <circle cx={ax} cy={ay} r={7} fill={accent ? ORANGE : BLUE} stroke="#fff" strokeWidth={2.5} />
      </svg>
      <div style={{ position: "absolute", left: lx, top: ly, transform: `translate(${-align * 100}%, -50%)` }}>
        <Pill text={text} fonts={fonts} accent={accent} />
      </div>
    </div>
  );
};

const Labels: React.FC<{ shot: Shot; t: number; pose: Pose; W: number; H: number; fonts: Fonts }> = ({ shot, t, pose, W, H, fonts }) => (
  <>
    {(shot.labels ?? []).map((l, i) => {
      const o = fadeWin(t, l.at, l.out ?? shot.end);
      if (o <= 0) return null;
      const a = typeof l.anchor === "function" ? l.anchor(t) : l.anchor;
      const p = project(pose, a, W, H);
      if (!p.visible) return null;
      return <Callout key={i} text={l.text} ax={p.x} ay={p.y} dx={l.dx ?? 0} dy={l.dy ?? -70} o={o} fonts={fonts} W={W} accent={l.accent} />;
    })}
  </>
);

const Card: React.FC<{ x: number; y: number; w: number; title: string; o: number; fonts: Fonts; children: React.ReactNode; note?: string }> = ({ x, y, w, title, o, fonts, children, note }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, opacity: o, transform: `translateY(${(1 - o) * 10}px)`, backgroundColor: PANEL, borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", padding: "18px 22px", fontFamily: fonts.body, color: INK }}>
    <div style={{ fontWeight: 700, fontSize: 21, letterSpacing: "0.08em", textTransform: "uppercase", color: GRAY, marginBottom: 12 }}>{title}</div>
    {children}
    {note ? <div style={{ marginTop: 12, fontSize: 18, lineHeight: 1.35, color: GRAY }}>{note}</div> : null}
  </div>
);

const Link: React.FC<{ a: { x: number; y: number }; b: { x: number; y: number }; label?: string; o: number; fonts: Fonts; W: number; dashed?: boolean; curve?: number }> = ({ a, b, label, o, fonts, W, dashed = true, curve = 0 }) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - curve;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={W} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${a.x} ${a.y} Q ${mx} ${my - curve} ${b.x} ${b.y}`} fill="none" stroke={BLUE} strokeWidth={3.5} strokeDasharray={dashed ? "12 9" : undefined} />
        <circle cx={a.x} cy={a.y} r={7} fill={BLUE} stroke="#fff" strokeWidth={2.5} />
        <circle cx={b.x} cy={b.y} r={7} fill={BLUE} stroke="#fff" strokeWidth={2.5} />
      </svg>
      {label ? (
        <div style={{ position: "absolute", left: Math.min(W - 420, Math.max(420, mx)), top: Math.max(170, my - curve - 22), transform: "translate(-50%, -100%)" }}>
          <Pill text={label} fonts={fonts} />
        </div>
      ) : null}
    </div>
  );
};

const Chips: React.FC<{ title: string; items: [string, number][]; t: number; out: number; fonts: Fonts; x: number; y: number; note?: string }> = ({ title, items, t, out, fonts, x, y, note }) => {
  const o = fadeWin(t, items[0][1] - 0.3, out);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o, fontFamily: fonts.body }}>
      <div style={{ fontWeight: 700, fontSize: 21, letterSpacing: "0.08em", textTransform: "uppercase", color: GRAY, backgroundColor: PANEL, display: "inline-block", padding: "6px 14px", borderRadius: 6, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", maxWidth: 900 }}>
        {items.map(([name, at]) => {
          const q = fadeWin(t, at, out, 0.3, 0.3);
          return (
            <div key={name} style={{ opacity: q, transform: `translateY(${(1 - q) * 8}px)`, backgroundColor: PANEL, borderRadius: 22, padding: "8px 20px", fontWeight: 600, fontSize: 27, color: INK, boxShadow: "0 3px 12px rgba(0,0,0,0.14)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: BLUE, display: "inline-block" }} />
              {name}
            </div>
          );
        })}
      </div>
      {note ? <div style={{ marginTop: 10, fontSize: 19, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", opacity: fadeWin(t, items[items.length - 1][1] + 0.5, out) }}>{note}</div> : null}
    </div>
  );
};

// ---------- overlays ----------
const legendRow = (sw: React.ReactNode, text: string, fonts: Fonts) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 21, fontFamily: fonts.body, margin: "6px 0" }}>
    <svg width={56} height={16}>{sw}</svg>
    {text}
  </div>
);
const Legend: React.FC<{ o: number; fonts: Fonts; installed: boolean; y?: number }> = ({ o, fonts, installed, y = 470 }) => (
  <Card x={1380} y={y} w={460} title="Legend" o={o} fonts={fonts} note="Ground conditions and depths are illustrative.">
    {legendRow(
      <>
        {["#2f6fb6", "#3f8a52", "#e07a26", "#c43a2f", "#e0b420"].map((c, i) => (
          <circle key={c} cx={7 + i * 10.5} cy={8} r={5} fill={c} />
        ))}
      </>,
      "Existing utilities (APWA colors)",
      fonts,
    )}
    {legendRow(<line x1={2} y1={8} x2={54} y2={8} stroke="#9aa0a6" strokeWidth={4} strokeDasharray="8 5" />, "Proposed alignment", fonts)}
    {legendRow(<line x1={2} y1={8} x2={54} y2={8} stroke="#8a7a64" strokeWidth={4} />, "Drilled bore", fonts)}
    {installed ? legendRow(<line x1={2} y1={8} x2={54} y2={8} stroke="#2b2d30" strokeWidth={7} />, "Installed product pipe", fonts) : null}
  </Card>
);

/** Small persistent orientation bar for section and close-up views: entry (rig) left, exit right */
const Orientation: React.FC<{ t: number; fonts: Fonts; o: number }> = ({ t, fonts, o }) => {
  const u = pullAt(t) ?? reamAt(t) ?? pilotAt(t) ?? (t > 105 ? 1 : null);
  return (
    <div style={{ position: "absolute", right: 96, top: 64, width: 470, opacity: o, backgroundColor: PANEL, borderRadius: 6, padding: "10px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontFamily: fonts.body }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, letterSpacing: "0.06em", color: GRAY }}>
        <span>◄ ENTRY · RIG</span>
        <span>EXIT · PIPE STAGING ►</span>
      </div>
      <svg width={438} height={22} style={{ marginTop: 6 }}>
        <path d="M 6 6 Q 219 30 432 6" fill="none" stroke="#b9bdc1" strokeWidth={3} />
        {u !== null ? <circle cx={6 + u * 426} cy={6 + 24 * (1 - Math.pow(2 * u - 1, 2)) * 0.5} r={7} fill={ORANGE} stroke="#fff" strokeWidth={2} /> : null}
      </svg>
    </div>
  );
};

/** Illustrative plan and profile sheet (relates site information to the crossing) */
const PlanSheet: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 32.2, 35.2);
  if (o <= 0) return null;
  const w = 600;
  const h = 210;
  const sx = (x: number) => ((x + BOUNDS.x) / (2 * BOUNDS.x)) * w;
  const sz = (z: number) => ((z + BOUNDS.z) / (2 * BOUNDS.z)) * h;
  const deg = (-CITY_ANGLE * 180) / Math.PI;
  const py = (y: number) => 18 + (-y / 7) * 150;
  return (
    <Card x={1200} y={170} w={w + 44} title="Plan and profile (illustrative)" o={o} fonts={fonts}>
      <svg width={w} height={h} style={{ background: "#f3f5f7", borderRadius: 4 }}>
        <defs>
          <clipPath id="ps">
            <rect width={w} height={h} />
          </clipPath>
        </defs>
        <g clipPath="url(#ps)">
          <g transform={`translate(${w / 2} ${h / 2}) rotate(${deg})`}>
            <rect x={-ROAD_HALF * (w / 140)} y={-500} width={ROAD_HALF * 2 * (w / 140)} height={1000} fill="#d5d8db" />
            <rect x={-500} y={-ROAD_HALF * (h / 90)} width={1000} height={ROAD_HALF * 2 * (h / 90)} fill="#d5d8db" />
          </g>
          {UTILITIES.map((u) => {
            const { point, dir } = utilityLine(u);
            return <line key={u.id} x1={sx(point[0] - dir[0] * 200)} y1={sz(point[1] - dir[1] * 200)} x2={sx(point[0] + dir[0] * 200)} y2={sz(point[1] + dir[1] * 200)} stroke={u.color} strokeWidth={1.8} />;
          })}
          <line x1={sx(-38)} y1={sz(0)} x2={sx(38)} y2={sz(0)} stroke={INK} strokeWidth={2.5} strokeDasharray="9 6" />
          <rect x={sx(RIG_LOT.x0)} y={sz(RIG_LOT.z0)} width={sx(RIG_LOT.x1) - sx(RIG_LOT.x0)} height={sz(RIG_LOT.z1) - sz(RIG_LOT.z0)} fill="none" stroke={BLUE} strokeWidth={2} />
          <rect x={sx(EXIT_LOT.x0)} y={sz(EXIT_LOT.z0)} width={sx(EXIT_LOT.x1) - sx(EXIT_LOT.x0)} height={sz(EXIT_LOT.z1) - sz(EXIT_LOT.z0)} fill="none" stroke={BLUE} strokeWidth={2} />
          <text x={sx(RIG_LOT.x0) + 4} y={sz(RIG_LOT.z0) - 6} fontSize={14} fontFamily={fonts.body} fill={INK}>Entry / rig</text>
          <text x={sx(EXIT_LOT.x0) + 4} y={sz(EXIT_LOT.z0) - 6} fontSize={14} fontFamily={fonts.body} fill={INK}>Exit / staging</text>
        </g>
      </svg>
      <svg width={w} height={190} style={{ background: "#f3f5f7", borderRadius: 4, marginTop: 10 }}>
        <line x1={0} y1={18} x2={w} y2={18} stroke="#8a8f94" strokeWidth={2} />
        <text x={6} y={14} fontSize={13} fontFamily={fonts.body} fill={GRAY}>Ground surface</text>
        {UTILITIES.filter((u) => Math.abs(utilityLine(u).crossX) < 40).map((u) => (
          <circle key={u.id} cx={sx(utilityLine(u).crossX)} cy={py(u.depth)} r={Math.max(3, u.radius * 18)} fill={u.color} />
        ))}
        <path
          d={Array.from({ length: 41 })
            .map((_, i) => {
              const p = boreAt(i / 40).p;
              return `${i ? "L" : "M"} ${sx(p.x)} ${py(p.y)}`;
            })
            .join(" ")}
          fill="none"
          stroke={INK}
          strokeWidth={2.5}
          strokeDasharray="9 6"
        />
        <text x={sx(0) - 60} y={py(-5.1) + 24} fontSize={14} fontFamily={fonts.body} fill={INK}>Proposed bore profile</text>
      </svg>
    </Card>
  );
};

const FluidCircuit: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 53.3, 57.4);
  if (o <= 0) return null;
  const step = (txt: string, color: string, at: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: fadeWin(t, at, 57.4, 0.3, 0.3) }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <span style={{ fontSize: 22 }}>{txt}</span>
    </div>
  );
  return (
    <Card x={1330} y={190} w={500} title="Drilling fluid circuit (simplified)" o={o} fonts={fonts} note="Returns are collected in the pit and pumped back to the recycling system.">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {step("Recycling system → mud pump", "#7fa7c9", 53.5)}
        {step("Pumped down the drill string to the bit", "#7fa7c9", 54.0)}
        {step("Returns carry cuttings back along the bore", "#c9b28c", 54.7)}
        {step("Collected in the entry pit", "#c9b28c", 55.3)}
        {step("Pumped to the recycling system", "#c9b28c", 55.9)}
      </div>
    </Card>
  );
};

const LocatorDisplay: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 73.0, 86.6);
  if (o <= 0) return null;
  const u = pilotAt(t) ?? 0;
  const { p, tan } = boreAt(u);
  const depthFrac = Math.min(1, -p.y / 6.5);
  const pitch = Math.atan2(tan.y, tan.x);
  return (
    <Card x={1290} y={300} w={540} title="Walkover locator (illustrative)" o={o} fonts={fonts} note="Depth and pitch are measured from the sonde's signal and interpreted by the locator. Locating the drill head is separate from verifying existing utilities.">
      <div style={{ display: "flex", gap: 26 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 26, marginBottom: 8 }}>Depth</div>
          <svg width={210} height={150}>
            <line x1={20} y1={8} x2={140} y2={8} stroke={GRAY} strokeWidth={2} />
            <text x={146} y={13} fontSize={16} fill={GRAY} fontFamily={fonts.body}>Surface</text>
            <rect x={64} y={8} width={30} height={136} rx={4} fill="#e6e8ea" />
            <rect x={64} y={8} width={30} height={136 * depthFrac} rx={4} fill={BLUE} />
            <circle cx={79} cy={8 + 136 * depthFrac} r={8} fill={ORANGE} stroke="#fff" strokeWidth={2} />
            <text x={104} y={14 + 136 * depthFrac} fontSize={17} fill={INK} fontFamily={fonts.body}>Sonde</text>
          </svg>
        </div>
        <div style={{ flex: 1, opacity: fadeWin(t, 73.6) }}>
          <div style={{ fontWeight: 700, fontSize: 26, marginBottom: 8 }}>Pitch</div>
          <svg width={210} height={150}>
            <line x1={10} y1={75} x2={200} y2={75} stroke="#c9ccd0" strokeWidth={2} strokeDasharray="6 6" />
            <text x={10} y={64} fontSize={15} fill={GRAY} fontFamily={fonts.body}>Level</text>
            <g transform={`translate(105 75) rotate(${(-pitch * 180) / Math.PI})`}>
              <line x1={-80} y1={0} x2={80} y2={0} stroke={INK} strokeWidth={5} strokeLinecap="round" />
              <polygon points="82,0 66,-9 66,9" fill={ORANGE} />
            </g>
          </svg>
        </div>
      </div>
    </Card>
  );
};

const Steering: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 89.6, 98.4);
  if (o <= 0) return null;
  const lit = (at: number) => Math.max(fadeWin(t, at, at + 1.6, 0.2, 0.5), fadeWin(t, 93.6) * 0.55);
  const arrow = (x: number, y: number, rot: number, on: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <polygon points="0,-15 14,7 -14,7" fill={on > 0.05 ? ORANGE : "#d4d7da"} opacity={0.35 + 0.65 * on} />
    </g>
  );
  const head = (pilotAt(t) ?? 0) * 220;
  return (
    <Card x={96} y={330} w={560} title="Steering (gradual corrections)" o={o} fonts={fonts} note="The bit's slanted face is turned to steer. The drilled path behind it does not move.">
      <div style={{ display: "flex", gap: 22 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 21, marginBottom: 6 }}>Profile: up / down</div>
          <svg width={230} height={130}>
            <path d="M 10 30 Q 115 110 220 30" fill="none" stroke="#c9ccd0" strokeWidth={3} strokeDasharray="7 5" />
            {arrow(115, 30, 0, lit(90.7))}
            {arrow(115, 110, 180, lit(91.32))}
            <text x={136} y={36} fontSize={18} fill={INK} fontFamily={fonts.body}>Up</text>
            <text x={136} y={112} fontSize={18} fill={INK} fontFamily={fonts.body}>Down</text>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 21, marginBottom: 6 }}>Plan: right / left</div>
          <svg width={240} height={130}>
            <rect x={6} y={46} width={228} height={38} fill="#eef0f2" rx={4} />
            <line x1={10} y1={65} x2={230} y2={65} stroke="#9aa0a6" strokeWidth={3} strokeDasharray="7 5" />
            <line x1={10} y1={65} x2={10 + head} y2={65} stroke="#8a7a64" strokeWidth={4} />
            <circle cx={10 + head} cy={65} r={7} fill={ORANGE} stroke="#fff" strokeWidth={2} />
            {arrow(10 + head, 26, 0, lit(92.78))}
            {arrow(10 + head, 104, 180, lit(92.1))}
            <text x={22 + head} y={30} fontSize={18} fill={INK} fontFamily={fonts.body}>Left</text>
            <text x={22 + head} y={112} fontSize={18} fill={INK} fontFamily={fonts.body}>Right</text>
          </svg>
        </div>
      </div>
    </Card>
  );
};

const Sizing: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 110.6, 118.7);
  if (o <= 0) return null;
  const pipe = fadeWin(t, 116.2);
  const big = fadeWin(t, 114.6);
  const R = 120;
  return (
    <Card x={1230} y={180} w={600} title="Sizing example (from the narration)" o={o} fonts={fonts} note="An example only. Bore and pipe sizes are set for each project.">
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width={260} height={260}>
          <circle cx={130} cy={130} r={R} fill="#e6d8c6" stroke="#9b8466" strokeWidth={3} opacity={big} />
          <circle cx={130} cy={130} r={R / 1.5} fill="#2b2d30" opacity={pipe} />
          <circle cx={130} cy={130} r={R / 1.5 - 9} fill="#4a4d50" opacity={pipe} />
          <circle cx={130} cy={130} r={30} fill="none" stroke={BLUE} strokeWidth={4} strokeDasharray="7 5" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 23, lineHeight: 1.3 }}>
          <div>
            <b style={{ color: BLUE }}>Pilot bore</b>
            <br />4-inch drill bit (typical mid-size rig)
          </div>
          <div style={{ opacity: pipe }}>
            <b>Product pipe</b>
            <br />outside diameter
          </div>
          <div style={{ opacity: big }}>
            <b style={{ color: "#8a6a4a" }}>Enlarged bore</b>
            <br />about 1.5 × the pipe size
          </div>
        </div>
      </div>
    </Card>
  );
};

const Overlays: React.FC<{ shot: Shot; t: number; pose: Pose; W: number; H: number; fonts: Fonts }> = ({ shot, t, pose, W, H, fonts }) => {
  const ov = shot.overlays ?? [];
  const pr = (p: [number, number, number]) => project(pose, p, W, H);
  const out: React.ReactNode[] = [];
  const has = (k: (typeof ov)[number]) => ov.includes(k);
  if (has("obstacles")) out.push(<Chips key="ob" title="HDD passes beneath obstacles" items={[["Roads", 7.88], ["Buildings", 8.46], ["Wetlands", 9.06]]} t={t} out={10.3} fonts={fonts} x={96} y={170} />);
  if (has("applications"))
    out.push(<Chips key="ap" title="Typical HDD applications" items={[["Water", 13.22], ["Sewer", 13.78], ["Fiber", 14.38], ["Electric", 14.94], ["Gas", 15.92]]} t={t} out={17.0} fonts={fonts} x={96} y={170} note="This crossing installs one conduit; HDD is used for each of these." />);
  if (has("legend")) {
    const win = shot.id === "S03" ? [17.2, 21.9] : shot.id === "S05" ? [40.6, 42.6] : [171.6, 179.2];
    out.push(<Legend key="lg" o={fadeWin(t, win[0], win[1])} fonts={fonts} installed={shot.id === "S15"} y={shot.id === "S05" ? 420 : 470} />);
  }
  if (has("orientation")) out.push(<Orientation key="or" t={t} fonts={fonts} o={fadeWin(t, shot.start + 0.4, shot.end + 0.2)} />);
  if (has("workzone")) {
    const o = fadeWin(t, 26.8, 31.4, 0.6, 0.4);
    if (o > 0) {
      const pts = [pr([RIG_LOT.x0, 0.3, RIG_LOT.z0]), pr([RIG_LOT.x1, 0.3, RIG_LOT.z0]), pr([RIG_LOT.x1, 0.3, RIG_LOT.z1]), pr([RIG_LOT.x0, 0.3, RIG_LOT.z1])];
      out.push(
        <svg key="wz" width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o }}>
          <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(14,77,151,0.10)" stroke={BLUE} strokeWidth={3} />
        </svg>,
      );
      const p = pr([-49, 0.3, -10]);
      out.push(<Callout key="wzl" text="Work area set back from traffic lanes and business entrances" ax={p.x} ay={p.y} dx={0} dy={-80} o={o} fonts={fonts} W={W} />);
    }
  }
  if (has("planSheet")) out.push(<PlanSheet key="ps" t={t} fonts={fonts} />);
  if (has("separation")) {
    const o = fadeWin(t, 40.6, 42.6);
    if (o > 0) {
      const sewer = UTILITIES.find((u) => u.id === "sewer")!;
      const x = utilityLine(sewer).crossX;
      const u = (x + 37.6) / 75.2;
      const a = pr([x, sewer.depth - sewer.radius, 0.1]);
      const b = pr([x, boreAt(u).p.y + 0.12, 0.1]);
      out.push(
        <div key="sep" style={{ position: "absolute", inset: 0, opacity: o }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <line x1={a.x} y1={a.y + 5} x2={b.x} y2={b.y - 5} stroke={INK} strokeWidth={2.5} />
            <polygon points={`${a.x},${a.y} ${a.x - 8},${a.y + 14} ${a.x + 8},${a.y + 14}`} fill={INK} />
            <polygon points={`${b.x},${b.y} ${b.x - 8},${b.y - 14} ${b.x + 8},${b.y - 14}`} fill={INK} />
          </svg>
          <div style={{ position: "absolute", left: a.x + 28, top: (a.y + b.y) / 2, transform: "translateY(-50%)" }}>
            <Pill text="Separation set by the project design" fonts={fonts} />
          </div>
        </div>,
      );
    }
  }
  if (has("fluidCircuit")) out.push(<FluidCircuit key="fc" t={t} fonts={fonts} />);
  if (has("radio")) out.push(<Link key="rd" a={pr(ANCHORS.locator(t))} b={pr(ANCHORS.operator)} label="Radio communication" o={fadeWin(t, 59.3, 64.2)} fonts={fonts} W={W} curve={60} />);
  if (has("locator")) out.push(<LocatorDisplay key="ld" t={t} fonts={fonts} />);
  if (has("track")) {
    const win = shot.id === "S08" ? [72.9, 80.6] : [98.9, 104.4];
    const o = fadeWin(t, win[0], win[1]);
    if (o > 0) {
      const h = headAt(t);
      out.push(<Link key="tr" a={pr([h.x, h.y, 0.2])} b={pr([ANCHORS.locator(t)[0], 1.0, -1.5])} o={o} fonts={fonts} W={W} />);
    }
  }
  if (has("relay")) out.push(<Link key="rl" a={pr(ANCHORS.locator(t))} b={pr(ANCHORS.operator)} label="Steering direction relayed to the operator" o={fadeWin(t, 81.8, 86.8)} fonts={fonts} W={W} curve={70} />);
  if (has("steer")) out.push(<Steering key="st" t={t} fonts={fonts} />);
  if (has("sizing")) out.push(<Sizing key="sz" t={t} fonts={fonts} />);
  if (has("trailing")) {
    const o = fadeWin(t, 129.0, 132.0);
    const r = reamAt(t) ?? 1;
    if (o > 0) {
      const p = pr([boreAt(Math.min(0.99, r + 0.06)).p.x, boreAt(Math.min(0.99, r + 0.06)).p.y, 0.1]);
      out.push(<Callout key="tl" text="Rods added behind the reamer" ax={p.x} ay={p.y} dx={40} dy={-100} o={o} fonts={fonts} W={W} />);
    }
  }
  if (has("accessZones")) {
    const o = fadeWin(t, 133.0, 143.6, 0.6, 0.4);
    if (o > 0) {
      out.push(
        <svg key="az" width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o }}>
          {[RIG_LOT, EXIT_LOT].map((l, i) => {
            const pts = [pr([l.x0, 0.3, l.z0]), pr([l.x1, 0.3, l.z0]), pr([l.x1, 0.3, l.z1]), pr([l.x0, 0.3, l.z1])];
            return <polygon key={i} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(14,77,151,0.10)" stroke={BLUE} strokeWidth={3} />;
          })}
        </svg>,
      );
      const a = pr([-49, 0.3, 10]);
      const b = pr([51, 0.3, 7]);
      const [rx, rz] = cityToWorld(0, 30);
      const c = pr([rx, 0.3, rz]);
      out.push(<Callout key="az1" text="Localized work area" ax={a.x} ay={a.y} dx={0} dy={90} o={o} fonts={fonts} W={W} />);
      out.push(<Callout key="az2" text="Localized work area" ax={b.x} ay={b.y} dx={0} dy={90} o={o} fonts={fonts} W={W} />);
      out.push(<Callout key="az3" text="Lanes, sidewalks and entrances open" ax={c.x} ay={c.y} dx={0} dy={-90} o={fadeWin(t, 134.4, 143.6)} fonts={fonts} W={W} />);
    }
  }
  if (has("swivel")) {
    const o = fadeWin(t, 144.9, 150.6);
    if (o > 0) {
      const u = pullAt(t) ?? 1;
      const p = pr([boreAt(Math.min(1, u + SWIVEL_OFF / 76)).p.x, boreAt(Math.min(1, u + SWIVEL_OFF / 76)).p.y, 0.1]);
      out.push(<Callout key="sw" text="Swivel: the reamer turns, the pipe does not" ax={p.x} ay={p.y} dx={40} dy={190} o={fadeWin(t, 144.9, 150.6)} fonts={fonts} W={W} accent />);
    }
  }
  if (has("pullArrow")) {
    const o = fadeWin(t, 147.1, 150.6);
    if (o > 0) {
      const u = pullAt(t) ?? 1;
      const a = pr([boreAt(Math.min(1, u + HEAD_OFF / 76)).p.x, boreAt(Math.min(1, u + HEAD_OFF / 76)).p.y + 0.6, 0.1]);
      const b = pr([boreAt(Math.max(0, u - 0.08)).p.x, boreAt(Math.max(0, u - 0.08)).p.y + 0.6, 0.1]);
      out.push(
        <div key="pa" style={{ position: "absolute", inset: 0, opacity: o }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <marker id="ah" markerWidth={10} markerHeight={10} refX={6} refY={5} orient="auto">
                <polygon points="0,0 10,5 0,10" fill={BLUE} />
              </marker>
            </defs>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={BLUE} strokeWidth={5} markerEnd="url(#ah)" />
          </svg>
          <div style={{ position: "absolute", left: (a.x + b.x) / 2, top: Math.max(170, Math.min(a.y, b.y) - 70), transform: "translate(-50%, -100%)" }}>
            <Pill text="Pulled toward the rig" fonts={fonts} />
          </div>
        </div>,
      );
    }
  }
  if (has("benefits")) {
    const rows: [string, number][] = [
      ["Less Disruption to Businesses", 155.8],
      ["Less Traffic Disruption", 158.7],
      ["Less Surface Restoration", 160.7],
    ];
    out.push(
      <div key="bn" style={{ position: "absolute", left: 96, top: 64, display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(([text, at]) => {
          const o = fadeWin(t, at, shot.end - 0.1, 0.4, 0.4);
          return (
            <div key={text} style={{ opacity: o, transform: `translateX(${(1 - o) * -14}px)`, display: "flex", alignItems: "center", gap: 14, backgroundColor: PANEL, padding: "12px 22px", borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,0.12)", fontFamily: fonts.heading, fontWeight: 700, fontSize: 34, color: INK }}>
              <svg width={28} height={28} viewBox="0 0 24 24">
                <path d="M5 12l5 5l10 -10" fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {text}
            </div>
          );
        })}
      </div>,
    );
  }
  if (has("restoration")) {
    const o = fadeWin(t, 161.0, 162.8, 0.5, 0.2);
    if (o > 0) {
      const strip = [pr([-38, 0.25, -1.4]), pr([38, 0.25, -1.4]), pr([38, 0.25, 1.4]), pr([-38, 0.25, 1.4])];
      out.push(
        <svg key="rs" width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o }}>
          <defs>
            <pattern id="hatch" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={10} stroke="#6b6f73" strokeWidth={3} />
            </pattern>
          </defs>
          <polygon points={strip.map((p) => `${p.x},${p.y}`).join(" ")} fill="url(#hatch)" stroke="#6b6f73" strokeWidth={2} strokeDasharray="8 6" opacity={0.8} />
        </svg>,
      );
      const p = pr([10, 0.3, 1.4]);
      out.push(<Callout key="rsl" text="Open-cut trench footprint (comparison)" ax={p.x} ay={p.y} dx={40} dy={110} o={o} fonts={fonts} W={W} />);
    }
  }
  if (has("years")) {
    const o = fadeWin(t, 175.9, 179.3, 0.6, 0.3);
    out.push(
      <div key="yr" style={{ position: "absolute", left: 96, top: 64, opacity: o, transform: `translateY(${(1 - o) * 8}px)`, backgroundColor: PANEL, borderLeft: `6px solid ${BLUE}`, borderRadius: 6, padding: "14px 24px", boxShadow: "0 6px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 36, color: INK }}>Directional Technologies, Inc.</div>
        <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 27, color: GRAY, marginTop: 4 }}>Installing conduit by directional drilling for over 30 years</div>
      </div>,
    );
  }
  return <>{out}</>;
};

// ---------- creek and end card ----------
const CreekLabels: React.FC<{ t: number; pose: Pose; W: number; H: number; fonts: Fonts }> = ({ t, pose, W, H, fonts }) => {
  const title = fadeWin(t, 163.2, 170.6, 0.5, 0.4);
  const items: [string, [number, number, number], number, number, number][] = [
    ["Stream channel and banks", CREEK_ANCHORS.channel, 165.4, -50, -110],
    ["Work areas outside the stream corridor", CREEK_ANCHORS.workArea, 166.3, 50, -100],
    ["Pipe installed beneath the channel", CREEK_ANCHORS.conduit, 167.7, 60, 90],
  ];
  return (
    <>
      <div style={{ position: "absolute", left: 96, top: 64, opacity: title, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 21, letterSpacing: "0.08em", textTransform: "uppercase", color: GRAY, backgroundColor: PANEL, padding: "6px 14px", borderRadius: 6, alignSelf: "flex-start" }}>Application example</div>
        <div style={{ backgroundColor: PANEL, borderLeft: `6px solid ${BLUE}`, borderRadius: 6, padding: "12px 26px", fontFamily: fonts.heading, fontWeight: 700, fontSize: 42, color: INK, boxShadow: "0 6px 24px rgba(0,0,0,0.12)" }}>Wetland, Stream and River Crossings</div>
      </div>
      {items.map(([text, a, at, dx, dy]) => {
        const p = project(pose, a, W, H);
        return <Callout key={text} text={text} ax={p.x} ay={p.y} dx={dx} dy={dy} o={fadeWin(t, at, 170.6)} fonts={fonts} W={W} />;
      })}
    </>
  );
};

export const CONTACT = { phones: ["203-294-9200", "877-788-4479"], email: "drilling@directionaltech.com", web: "directionaltech.com" };

const EndCard: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const s = 179.4;
  const logo = fadeWin(t, s + 0.3, Infinity, 0.8);
  const line = fadeWin(t, s + 1.1, Infinity, 0.6);
  const cta = fadeWin(t, s + 1.8, Infinity, 0.7);
  const contact = fadeWin(t, s + 2.6, Infinity, 0.7);
  return (
    <AbsoluteFill style={{ backgroundColor: "#F4F5F6", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -60 }}>
        <Img src={staticFile("hdd/dti-hdd-explainer/dti-logo.png")} style={{ width: 780, opacity: logo, transform: `translateY(${(1 - logo) * 12}px)` }} />
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 18, opacity: line }}>
          <div style={{ width: 46, height: 3, backgroundColor: ORANGE }} />
          <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 28, letterSpacing: "0.16em", textTransform: "uppercase", color: GRAY }}>HDD Expertise Since 1992</div>
          <div style={{ width: 46, height: 3, backgroundColor: ORANGE }} />
        </div>
        <div style={{ marginTop: 46, fontFamily: fonts.heading, fontWeight: 700, fontSize: 60, color: BLUE, opacity: cta, transform: `translateY(${(1 - cta) * 10}px)` }}>Discuss Your Next HDD Project</div>
        <div style={{ marginTop: 34, fontFamily: fonts.body, fontWeight: 500, fontSize: 30, color: INK, opacity: contact, textAlign: "center", lineHeight: 1.6 }}>
          {CONTACT.phones.join("   ·   ")}
          <br />
          {CONTACT.email}   ·   {CONTACT.web}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- composition ----------
type PickupInfo = { pickup: { start: number; file?: string }; originalEnding: { start: number; end: number } };
const PICKUP = narration.narration.find((n) => "pickup" in n) as unknown as PickupInfo;

export const DtiHddExplainer: React.FC<{ captions?: boolean; pickupFile?: string | null }> = ({ captions = false, pickupFile = null }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const fonts = useBrandFonts(getBrand("dti"));
  const a = useAssets();
  const shot = shotAt(t);
  const pose = shot.keys(t);
  // the site animates on a 30 fps clock whatever the output frame rate (the animatic renders at 15 fps)
  const base = processState(t, Math.round(t * 30));
  const state = { ...base, ...(shot.look ? shot.look(t) : {}) };
  const scene = shot.scene ?? "site";
  const boundaries = SHOTS.filter((s, i) => i > 0 && (s.scene ?? "site") !== (SHOTS[i - 1].scene ?? "site")).map((s) => s.start);
  const dip = Math.max(0, ...boundaries.map((b) => 1 - Math.min(1, Math.abs(t - b) / 0.35)));
  // original narration, muted from "over the past 23 years" to the end of that sentence; the pickup plays there
  const cutA = PICKUP.originalEnding.start;
  const cutB = PICKUP.originalEnding.end + 0.25;
  if (!a) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#e7eaed" }}>
      {scene === "site" ? <Scene width={W} height={H} pose={pose} state={state} a={a} /> : null}
      {scene === "creek" ? <CreekScene width={W} height={H} pose={pose} a={a} t={t} /> : null}
      {scene === "site" ? (
        <>
          <Labels shot={shot} t={t} pose={pose} W={W} H={H} fonts={fonts} />
          <Overlays shot={shot} t={t} pose={pose} W={W} H={H} fonts={fonts} />
        </>
      ) : null}
      {scene === "creek" ? <CreekLabels t={t} pose={pose} W={W} H={H} fonts={fonts} /> : null}
      {scene === "endcard" ? <EndCard t={t} fonts={fonts} /> : null}
      <Title shot={shot} t={t} fonts={fonts} />
      {captions ? <Captions t={t} fonts={fonts} /> : null}
      <AbsoluteFill style={{ backgroundColor: "#e7eaed", opacity: dip, pointerEvents: "none" }} />
      <Audio src={staticFile(narration.audio)} volume={(f) => interpolate(f / fps, [cutA - 0.03, cutA, cutB, cutB + 0.03], [1, 0, 0, 1], clamp)} />
      {pickupFile ? (
        <Sequence from={Math.round(PICKUP.pickup.start * fps)} layout="none" name="pickup: for over 30 years">
          <Audio src={staticFile(pickupFile)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/** Captions alone on a transparent frame, laid over the clean render for the captioned version */
export const DtiHddCaptionLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = useBrandFonts(getBrand("dti"));
  return (
    <AbsoluteFill>
      <Captions t={frame / fps} fonts={fonts} />
    </AbsoluteFill>
  );
};
export { POTHOLE };
