// DTI "Horizontal Directional Drilling" explainer, 3D remake (16:9, 1920x1080, 30 fps, 3:08).
// Picture: the shot list in ./timeline.ts over the 3D site; sound: the original DTI narration, unchanged
// except "over the past 23 years" -> "for over 30 years" (pickup; muted and flagged until it exists).
// Props: captions (burn in captions), draft (show production flags such as PICKUP PENDING).
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrandFonts } from "../lib/fonts";
import { getBrand } from "../lib/registry";
import narration from "../../hdd/dti-hdd-explainer/narration.json";
import { project, type Pose } from "./camera";
import { CREEK_ANCHORS, CreekScene } from "./Creek";
import { Scene } from "./Scene";
import { boreAt, BOUNDS, CITY_ANGLE, ROAD_HALF, UTILITIES, utilityLine } from "./site";
import { DURATION, pilotAt, processState, SHOTS, shotAt, type Shot } from "./timeline";

export const HDD_FPS = 30;
export const HDD_DURATION_FRAMES = Math.round(DURATION * HDD_FPS);

const INK = "#1F2328";
const BLUE = "#0E4D97";
const ORANGE = "#F78228";
const GRAY = "#575A5C";
const PANEL = "rgba(255,255,255,0.94)";
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fadeWin = (t: number, a: number, b = Infinity, inDur = 0.35, outDur = 0.3) =>
  Math.min(interpolate(t, [a, a + inDur], [0, 1], { ...clamp, easing: ease }), b === Infinity ? 1 : interpolate(t, [b - outDur, b], [1, 0], clamp));

type Fonts = { heading: string; body: string };

// ---------- captions (from the narration word times) ----------

type Page = { text: string; start: number; end: number };
const PAGES: Page[] = (() => {
  const out: Page[] = [];
  for (const n of narration.narration) {
    const words = n.words.map((w) => ({ ...w }));
    const pickup = (n as { pickup?: { text: string; start: number } }).pickup;
    if (pickup) {
      // the pickup words, spread at the original pace from the cut point
      const extra = pickup.text.split(" ");
      extra.forEach((w, i) => words.push({ w, s: pickup.start + i * 0.36, e: pickup.start + (i + 1) * 0.36 }));
    }
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
  // hold each page until the next one starts (max 0.8 s after its last word)
  return out.map((p, i) => ({ ...p, end: Math.min(p.end + 0.8, out[i + 1]?.start ?? p.end + 0.8) }));
})();
export const CAPTION_PAGES = PAGES;

const Captions: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const p = PAGES.find((x) => t >= x.start && t < x.end);
  if (!p) return null;
  const o = fadeWin(t, p.start, p.end, 0.12, 0.12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ maxWidth: 1240, padding: "14px 26px", backgroundColor: "rgba(20,24,28,0.78)", borderRadius: 8, color: "#fff", fontFamily: fonts.body, fontWeight: 500, fontSize: 36, lineHeight: 1.32, textAlign: "center" }}>
        {p.text}
      </div>
    </div>
  );
};

// ---------- overlay building blocks ----------

const Title: React.FC<{ shot: Shot; t: number; fonts: Fonts }> = ({ shot, t, fonts }) => {
  if (!shot.title) return null;
  const { number, text, at, out } = shot.title;
  const o = fadeWin(t, at, out ?? shot.end, 0.5, 0.4);
  const x = interpolate(t, [at, at + 0.6], [-18, 0], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 96, top: 72, opacity: o, transform: `translateX(${x}px)`, display: "flex", alignItems: "stretch", boxShadow: "0 6px 24px rgba(0,0,0,0.12)", borderRadius: 6, overflow: "hidden" }}>
      {number ? <div style={{ backgroundColor: BLUE, color: "#fff", fontFamily: fonts.heading, fontWeight: 700, fontSize: 42, padding: "12px 22px", display: "grid", placeItems: "center" }}>{number}</div> : null}
      <div style={{ backgroundColor: PANEL, color: INK, fontFamily: fonts.heading, fontWeight: 700, fontSize: 42, padding: "12px 26px", letterSpacing: "-0.01em", borderLeft: number ? "none" : `6px solid ${BLUE}` }}>{text}</div>
    </div>
  );
};

const Pill: React.FC<{ text: string; fonts: Fonts; accent?: boolean; small?: boolean }> = ({ text, fonts, accent, small }) => (
  <div style={{ backgroundColor: PANEL, color: INK, fontFamily: fonts.body, fontWeight: 600, fontSize: small ? 21 : 24, padding: small ? "6px 12px" : "8px 16px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 3px 12px rgba(0,0,0,0.14)", borderLeft: `4px solid ${accent ? ORANGE : BLUE}` }}>
    {text}
  </div>
);

const Labels: React.FC<{ shot: Shot; t: number; pose: Pose; W: number; H: number; fonts: Fonts }> = ({ shot, t, pose, W, H, fonts }) => (
  <>
    {(shot.labels ?? []).map((l, i) => {
      const o = fadeWin(t, l.at, l.out ?? shot.end);
      if (o <= 0) return null;
      const a = typeof l.anchor === "function" ? l.anchor(t) : l.anchor;
      const p = project(pose, a, W, H);
      if (!p.visible) return null;
      // keep the label inside the frame (estimated width from the text)
      const estW = l.text.length * 13.5 + 40;
      const align = (l.dx ?? 0) < 0 ? 1 : (l.dx ?? 0) === 0 ? 0.5 : 0;
      const lx = Math.min(W - 60 - estW * (1 - align), Math.max(60 + estW * align, p.x + (l.dx ?? 0)));
      const ly = Math.min(H - 220, Math.max(160, p.y + (l.dy ?? -60)));
      return (
        <div key={i} style={{ position: "absolute", inset: 0, opacity: o }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <line x1={p.x} y1={p.y} x2={lx} y2={ly} stroke="rgba(31,35,40,0.7)" strokeWidth={1.5} />
            <circle cx={p.x} cy={p.y} r={5.5} fill={l.accent ? ORANGE : BLUE} stroke="#fff" strokeWidth={2} />
          </svg>
          <div style={{ position: "absolute", left: lx, top: ly, transform: `translate(${(l.dx ?? 0) < 0 ? "-100%" : (l.dx ?? 0) === 0 ? "-50%" : "0"}, -50%)` }}>
            <Pill text={l.text} fonts={fonts} accent={l.accent} />
          </div>
        </div>
      );
    })}
  </>
);

const Card: React.FC<{ x: number; y: number; w: number; title: string; o: number; fonts: Fonts; children: React.ReactNode; note?: string }> = ({ x, y, w, title, o, fonts, children, note }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, opacity: o, transform: `translateY(${(1 - o) * 10}px)`, backgroundColor: PANEL, borderRadius: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.14)", padding: "16px 20px", fontFamily: fonts.body, color: INK }}>
    <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase", color: GRAY, marginBottom: 12 }}>{title}</div>
    {children}
    {note ? <div style={{ marginTop: 12, fontSize: 16, color: GRAY }}>{note}</div> : null}
  </div>
);

/** Walkover locator display: depth and pitch indicators, illustrative only (no project values) */
const LocatorDisplay: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 73.0, 86.6);
  if (o <= 0) return null;
  const u = pilotAt(t) ?? 0;
  const { p, tan } = boreAt(u);
  const depthFrac = Math.min(1, -p.y / 6);
  const pitch = Math.atan2(tan.y, tan.x);
  const pitchOn = fadeWin(t, 73.6);
  return (
    <Card x={1400} y={600} w={420} title="Locator display" o={o} fonts={fonts} note="Illustrative display. No project data.">
      <div style={{ display: "flex", gap: 28 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Depth</div>
          <svg width={150} height={110}>
            <rect x={56} y={4} width={22} height={100} rx={3} fill="#e6e8ea" />
            <rect x={56} y={4} width={22} height={100 * depthFrac} rx={3} fill={BLUE} />
            <line x1={40} y1={4} x2={94} y2={4} stroke={GRAY} strokeWidth={2} />
            <text x={100} y={10} fontSize={14} fill={GRAY} fontFamily={fonts.body}>Surface</text>
          </svg>
        </div>
        <div style={{ flex: 1, opacity: pitchOn }}>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Pitch</div>
          <svg width={150} height={110}>
            <line x1={10} y1={55} x2={140} y2={55} stroke="#c9ccd0" strokeWidth={2} strokeDasharray="5 5" />
            <g transform={`translate(75 55) rotate(${(-pitch * 180) / Math.PI})`}>
              <line x1={-55} y1={0} x2={55} y2={0} stroke={INK} strokeWidth={4} strokeLinecap="round" />
              <polygon points="55,0 43,-7 43,7" fill={ORANGE} />
            </g>
          </svg>
        </div>
      </div>
    </Card>
  );
};

/** Plan view inset: the route under the intersection and the head position */
const PlanInset: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 88.0, 98.6);
  if (o <= 0) return null;
  const w = 440;
  const h = 260;
  const sx = (x: number) => ((x + BOUNDS.x) / (2 * BOUNDS.x)) * w;
  const sz = (z: number) => ((z + BOUNDS.z) / (2 * BOUNDS.z)) * h;
  const u = pilotAt(t) ?? 0;
  const head = boreAt(u).p;
  const deg = (-CITY_ANGLE * 180) / Math.PI;
  return (
    <Card x={1384} y={72} w={w + 40} title="Plan view" o={o} fonts={fonts}>
      <svg width={w} height={h} style={{ borderRadius: 6, background: "#eef0f1" }}>
        <defs>
          <clipPath id="pv">
            <rect width={w} height={h} />
          </clipPath>
        </defs>
        <g clipPath="url(#pv)">
          <g transform={`translate(${w / 2} ${h / 2}) rotate(${deg})`}>
            <rect x={-ROAD_HALF * (w / 120)} y={-400} width={ROAD_HALF * 2 * (w / 120)} height={800} fill="#c3c6c9" />
            <rect x={-400} y={-ROAD_HALF * (h / 80)} width={800} height={ROAD_HALF * 2 * (h / 80)} fill="#c3c6c9" />
          </g>
          {UTILITIES.map((ut) => {
            const { point, dir } = utilityLine(ut);
            const L = 200;
            return <line key={ut.id} x1={sx(point[0] - dir[0] * L)} y1={sz(point[1] - dir[1] * L)} x2={sx(point[0] + dir[0] * L)} y2={sz(point[1] + dir[1] * L)} stroke={ut.color} strokeWidth={1.6} opacity={0.8} />;
          })}
          <line x1={sx(-38)} y1={sz(0)} x2={sx(38)} y2={sz(0)} stroke="#ffffff" strokeWidth={4} strokeDasharray="8 6" />
          <line x1={sx(-38)} y1={sz(0)} x2={sx(head.x)} y2={sz(0)} stroke={BLUE} strokeWidth={4} />
          <circle cx={sx(head.x)} cy={sz(0)} r={7} fill={ORANGE} stroke="#fff" strokeWidth={2} />
          <text x={sx(-38) - 6} y={sz(0) + 26} fontSize={15} fill={INK} fontFamily={fonts.body}>Entry</text>
          <text x={sx(38) - 22} y={sz(0) + 26} fontSize={15} fill={INK} fontFamily={fonts.body}>Exit</text>
        </g>
      </svg>
    </Card>
  );
};

/** Steering: the four directions named in the narration, lit as they are spoken */
const Steering: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 89.6, 98.4);
  if (o <= 0) return null;
  const dirs: [string, number, number, number][] = [
    ["Up", 90.7, 0, -1],
    ["Down", 91.32, 0, 1],
    ["Right", 92.1, 1, 0],
    ["Left", 92.78, -1, 0],
  ];
  const all = fadeWin(t, 93.6);
  return (
    <Card x={96} y={600} w={330} title="Steering" o={o} fonts={fonts} note={all > 0.5 ? "Gradual corrections, combined as needed" : undefined}>
      <svg width={290} height={170}>
        <circle cx={145} cy={85} r={30} fill="none" stroke="#c9ccd0" strokeWidth={2} />
        <circle cx={145} cy={85} r={6} fill={INK} />
        {dirs.map(([name, at, dx, dy]) => {
          const on = Math.max(fadeWin(t, at, at + 1.6, 0.2, 0.5), all * 0.6);
          const cx = 145 + dx * 62;
          const cy = 85 + dy * 54;
          const rot = dx === 1 ? 90 : dx === -1 ? -90 : dy === 1 ? 180 : 0;
          return (
            <g key={name}>
              <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
                <polygon points="0,-14 13,6 -13,6" fill={on > 0.05 ? ORANGE : "#d4d7da"} opacity={0.35 + 0.65 * on} />
              </g>
              <text x={cx + dx * 34} y={cy + dy * 28 + 6} textAnchor={dx === 1 ? "start" : dx === -1 ? "end" : "middle"} fontSize={18} fontWeight={600} fill={INK} fontFamily={fonts.body} opacity={0.45 + 0.55 * on}>
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
};

/** Diameter comparison, as examples from the narration */
const Diameters: React.FC<{ t: number; fonts: Fonts }> = ({ t, fonts }) => {
  const o = fadeWin(t, 110.6, 118.7);
  if (o <= 0) return null;
  const big = fadeWin(t, 114.6);
  return (
    <Card x={1320} y={250} w={500} title="Sizing (example)" o={o} fonts={fonts} note="Examples from the narration. Sizes are set for each project.">
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width={190} height={190}>
          <circle cx={95} cy={95} r={90} fill="#e9ddcf" stroke="#b39a7e" strokeWidth={2} opacity={big} />
          <circle cx={95} cy={95} r={60} fill="#2b2d30" opacity={fadeWin(t, 116.3)} />
          <circle cx={95} cy={95} r={22} fill="none" stroke={BLUE} strokeWidth={3} strokeDasharray="5 4" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 21 }}>
          <div>
            <b style={{ color: BLUE }}>Pilot bore</b>
            <br />4-inch drill bit (typical mid-size rig)
          </div>
          <div style={{ opacity: fadeWin(t, 116.3) }}>
            <b>Conduit</b>
          </div>
          <div style={{ opacity: big }}>
            <b style={{ color: "#8a6a4a" }}>Enlarged bore</b>
            <br />about 1.5 × the conduit size (typical)
          </div>
        </div>
      </div>
    </Card>
  );
};

const LinkLine: React.FC<{ a: { x: number; y: number }; b: { x: number; y: number }; label?: string; o: number; fonts: Fonts; W: number; H: number; dashed?: boolean; curve?: number }> = ({ a, b, label, o, fonts, W, H, dashed = true, curve = 0 }) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - curve;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${a.x} ${a.y} Q ${mx} ${my - curve} ${b.x} ${b.y}`} fill="none" stroke={BLUE} strokeWidth={3} strokeDasharray={dashed ? "10 8" : undefined} />
        <circle cx={a.x} cy={a.y} r={6} fill={BLUE} stroke="#fff" strokeWidth={2} />
        <circle cx={b.x} cy={b.y} r={6} fill={BLUE} stroke="#fff" strokeWidth={2} />
      </svg>
      {label ? (
        <div style={{ position: "absolute", left: mx, top: my - curve - 20, transform: "translate(-50%, -100%)" }}>
          <Pill text={label} fonts={fonts} />
        </div>
      ) : null}
    </div>
  );
};

const Overlays: React.FC<{ shot: Shot; t: number; pose: Pose; W: number; H: number; fonts: Fonts }> = ({ shot, t, pose, W, H, fonts }) => {
  const ov = shot.overlays ?? [];
  const pr = (p: [number, number, number]) => project(pose, p, W, H);
  const out: React.ReactNode[] = [];
  const head = () => boreAt(pilotAt(t) ?? 0).p;
  if (ov.includes("radio")) {
    const o = fadeWin(t, 59.3, 64.2);
    const loc = boreAt(Math.min(0.985, (pilotAt(t) ?? 0) + 0.004)).p;
    out.push(<LinkLine key="radio" a={pr([-47.6, 3.2, 1.55])} b={pr([loc.x, 1.9, -1.2])} label="Radio communication" o={o} fonts={fonts} W={W} H={H} curve={60} />);
  }
  if (ov.includes("track")) {
    const wins = shot.id === "S07" ? [[72.9, 80.6]] : [[98.9, 107.4]];
    for (const [a, b] of wins) {
      const o = fadeWin(t, a, b);
      if (o > 0) {
        const h = head();
        out.push(<LinkLine key={`tr${a}`} a={pr([h.x, h.y, 0.2])} b={pr([boreAt(Math.min(0.985, (pilotAt(t) ?? 0) + 0.004)).p.x, 1.2, -1.2])} o={o} fonts={fonts} W={W} H={H} />);
      }
    }
    if (shot.id === "S07") {
      const o = fadeWin(t, 81.6, 86.6);
      const loc = boreAt(Math.min(0.985, (pilotAt(t) ?? 0) + 0.004)).p;
      out.push(<LinkLine key="steerlink" a={pr([loc.x, 1.9, -1.2])} b={pr([-47.6, 3.2, 1.55])} label="Steering directions to the operator" o={o} fonts={fonts} W={W} H={H} curve={70} />);
    }
  }
  if (ov.includes("workzone")) {
    const wins = shot.id === "S04" ? [26.6, 31.4] : [133.0, 143.6];
    const o = fadeWin(t, wins[0], wins[1], 0.6, 0.4);
    if (o > 0) {
      const lots: [number, number, number, number][] = shot.id === "S04" ? [[-58, -33, -9, 9]] : [[-58, -33, -9, 9], [33, 58, -6, 6]];
      out.push(
        <svg key="wz" width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o }}>
          {lots.map(([x0, x1, z0, z1], i) => {
            const pts = [pr([x0, 0.3, z0]), pr([x1, 0.3, z0]), pr([x1, 0.3, z1]), pr([x0, 0.3, z1])];
            return <polygon key={i} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(14,77,151,0.10)" stroke={BLUE} strokeWidth={2.5} />;
          })}
        </svg>,
      );
      const p = pr(shot.id === "S04" ? [-45, 0.3, -9] : [0, 1, -30]);
      out.push(
        <div key="wzl" style={{ position: "absolute", left: p.x, top: p.y + 30, transform: "translate(-50%, 0)", opacity: o }}>
          <Pill text={shot.id === "S04" ? "Work area set back from traffic and business access" : "Localized work zones"} fonts={fonts} />
        </div>,
      );
    }
  }
  if (ov.includes("clearance")) {
    const o = fadeWin(t, 39.4, 42.2);
    if (o > 0) {
      const sewer = UTILITIES.find((u) => u.id === "sewer")!;
      const x = utilityLine(sewer).crossX;
      const pathY = boreAt((x + 38) / 76).p.y;
      const a = pr([x, sewer.depth - sewer.radius, 0.1]);
      const b = pr([x, pathY + 0.15, 0.1]);
      out.push(
        <div key="cl" style={{ position: "absolute", inset: 0, opacity: o }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <line x1={a.x} y1={a.y + 4} x2={b.x} y2={b.y - 4} stroke={INK} strokeWidth={2} />
            <polygon points={`${a.x},${a.y} ${a.x - 7},${a.y + 12} ${a.x + 7},${a.y + 12}`} fill={INK} />
            <polygon points={`${b.x},${b.y} ${b.x - 7},${b.y - 12} ${b.x + 7},${b.y - 12}`} fill={INK} />
          </svg>
          <div style={{ position: "absolute", left: a.x + 24, top: (a.y + b.y) / 2, transform: "translateY(-50%)" }}>
            <Pill text="Clearance below existing utilities" fonts={fonts} />
          </div>
        </div>,
      );
    }
  }
  if (ov.includes("benefits")) {
    const rows: [string, number][] = [
      ["Less Disruption to Businesses", 155.8],
      ["Less Traffic Disruption", 158.7],
      ["Less Surface Restoration", 160.7],
    ];
    out.push(
      <div key="bn" style={{ position: "absolute", left: 96, top: 72, display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(([text, at]) => {
          const o = fadeWin(t, at, shot.end - 0.1, 0.4, 0.4);
          return (
            <div key={text} style={{ opacity: o, transform: `translateX(${(1 - o) * -14}px)`, display: "flex", alignItems: "center", gap: 14, backgroundColor: PANEL, padding: "10px 20px", borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,0.12)", fontFamily: fonts.heading, fontWeight: 700, fontSize: 32, color: INK }}>
              <svg width={26} height={26} viewBox="0 0 24 24">
                <path d="M5 12l5 5l10 -10" fill="none" stroke={BLUE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {text}
            </div>
          );
        })}
      </div>,
    );
  }
  if (ov.includes("years")) {
    const o = fadeWin(t, 175.9, 179.3, 0.6, 0.3);
    out.push(
      <div key="yr" style={{ position: "absolute", left: 96, top: 72, opacity: o, transform: `translateY(${(1 - o) * 8}px)`, backgroundColor: PANEL, borderLeft: `6px solid ${BLUE}`, borderRadius: 6, padding: "14px 24px", boxShadow: "0 6px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 34, color: INK }}>Directional Technologies, Inc.</div>
        <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 26, color: GRAY, marginTop: 4 }}>Installing conduit by directional drilling for over 30 years</div>
      </div>,
    );
  }
  out.push(<LocatorDisplay key="loc" t={t} fonts={fonts} />);
  if (ov.includes("planInset")) out.push(<PlanInset key="pi" t={t} fonts={fonts} />);
  if (ov.includes("steer")) out.push(<Steering key="st" t={t} fonts={fonts} />);
  if (ov.includes("diameters")) out.push(<Diameters key="dm" t={t} fonts={fonts} />);
  return <>{out}</>;
};

// ---------- creek and end card ----------

const CreekLabels: React.FC<{ t: number; pose: Pose; W: number; H: number; fonts: Fonts }> = ({ t, pose, W, H, fonts }) => {
  const title = fadeWin(t, 163.3, 170.6, 0.5, 0.4);
  const items: [string, [number, number, number], number, number, number][] = [
    ["Stream and wetland", CREEK_ANCHORS.channel, 165.4, -40, -90],
    ["Conduit beneath the channel", CREEK_ANCHORS.conduit, 166.4, 60, 70],
  ];
  return (
    <>
      <div style={{ position: "absolute", left: 96, top: 72, opacity: title, backgroundColor: PANEL, borderLeft: `6px solid ${BLUE}`, borderRadius: 6, padding: "12px 26px", fontFamily: fonts.heading, fontWeight: 700, fontSize: 40, color: INK, boxShadow: "0 6px 24px rgba(0,0,0,0.12)" }}>
        Wetland, Stream and River Crossings
      </div>
      {items.map(([text, a, at, dx, dy]) => {
        const o = fadeWin(t, at, 170.6);
        const p = project(pose, a, W, H);
        return (
          <div key={text} style={{ position: "absolute", inset: 0, opacity: o }}>
            <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
              <line x1={p.x} y1={p.y} x2={p.x + dx} y2={p.y + dy} stroke="rgba(31,35,40,0.7)" strokeWidth={1.5} />
              <circle cx={p.x} cy={p.y} r={5.5} fill={BLUE} stroke="#fff" strokeWidth={2} />
            </svg>
            <div style={{ position: "absolute", left: p.x + dx, top: p.y + dy, transform: `translate(${dx < 0 ? "-100%" : "0"}, -50%)` }}>
              <Pill text={text} fonts={fonts} />
            </div>
          </div>
        );
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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

const PICKUP = (narration.narration.find((n) => "pickup" in n) as unknown as { pickup: { start: number }; originalEnding: { start: number; end: number } } | undefined)!;

export const DtiHddExplainer: React.FC<{ captions?: boolean; draft?: boolean }> = ({ captions = false, draft = true }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const fonts = useBrandFonts(getBrand("dti"));
  const shot = shotAt(t);
  const pose = shot.keys(t);
  const base = processState(t, frame);
  const state = { ...base, ...(shot.view ? shot.view(t, base) : {}) };
  // short dip between separate scenes (site, creek, end card)
  const scene = shot.scene ?? "site";
  const boundaries = SHOTS.filter((s, i) => i > 0 && (s.scene ?? "site") !== (SHOTS[i - 1].scene ?? "site")).map((s) => s.start);
  const dip = Math.max(0, ...boundaries.map((b) => 1 - Math.min(1, Math.abs(t - b) / 0.35)));
  // original narration: muted from "over the past 23 years" until the pickup recording is added
  const cutA = PICKUP.originalEnding.start;
  const cutB = PICKUP.originalEnding.end + 0.25;
  return (
    <AbsoluteFill style={{ backgroundColor: "#e6e9ec" }}>
      {scene === "site" ? <Scene width={W} height={H} pose={pose} state={state} /> : null}
      {scene === "creek" ? <CreekScene width={W} height={H} pose={pose} /> : null}
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
      {draft && t >= cutA - 0.2 && t < cutB + 0.4 ? (
        <div style={{ position: "absolute", right: 96, top: 72, border: "3px solid #c62828", backgroundColor: "rgba(255,255,255,0.95)", color: "#c62828", fontFamily: fonts.body, fontWeight: 700, fontSize: 22, padding: "10px 16px", borderRadius: 6 }}>
          PICKUP PENDING: “for over 30 years.” (original “23 years” removed)
        </div>
      ) : null}
      <AbsoluteFill style={{ backgroundColor: "#e6e9ec", opacity: dip, pointerEvents: "none" }} />
      <Audio
        src={staticFile(narration.audio)}
        volume={(f) => {
          const s = f / fps;
          return interpolate(s, [cutA - 0.03, cutA, cutB, cutB + 0.03], [1, 0, 0, 1], clamp);
        }}
      />
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
