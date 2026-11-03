// Shot list for the DTI HDD explainer, synchronized to the original narration (word times from
// hdd/dti-hdd-explainer/narration.json). Each shot has camera keyframes and the site state over time.
// The same list drives the video, the storyboard frames and the storyboard document.
import type { Key, Pose } from "./camera";
import { poseAt } from "./camera";
import { boreAt, cityToWorld, UTILITIES, utilityLine } from "./site";
import type { WorldState } from "./World";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
/** Piecewise-linear value over (time, value) points */
const track = (t: number, pts: [number, number][]) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, va] = pts[i];
    const [b, vb] = pts[i + 1];
    if (t <= b) return va + (vb - va) * smooth((t - a) / (b - a));
  }
  return pts[pts.length - 1][1];
};

// ---------- the process over time (one continuous job) ----------
export const PILOT_START = 49.0;
export const PILOT_END = 105.0;
export const REAM_ATTACH = 119.6;
export const REAM_START = 127.3;
export const REAM_END = 142.6;
export const PULL_ATTACH = 143.9;
export const PULL_START = 146.6;
export const PULL_END = 168.0;
export const COMPLETE = 170.9;

export const pilotAt = (t: number) =>
  t < PILOT_START - 0.5 ? null : track(t, [[PILOT_START, 0], [57, 0.025], [64.2, 0.08], [87, 0.36], [PILOT_END, 1]]);
export const reamAt = (t: number) => (t < REAM_ATTACH || t >= REAM_END ? null : track(t, [[REAM_START, 1], [REAM_END, 0.004]]));
export const pullAt = (t: number) => (t < PULL_ATTACH || t >= COMPLETE ? null : track(t, [[PULL_START, 1], [PULL_END, 0.004]]));

const headPos = (t: number) => {
  const u = pilotAt(t) ?? 0;
  return boreAt(u).p;
};

/** Base state at time t; shots override the view (cut, x-ray, plan) */
export const processState = (t: number, frame: number): WorldState => {
  const pilot = pilotAt(t);
  const ream = reamAt(t);
  const pull = pullAt(t);
  const front = pull ?? ream ?? pilot ?? 0;
  return {
    frame,
    cut: 40,
    xray: 0,
    plan: 0,
    pilot: t >= COMPLETE ? 1 : pilot ?? (t >= PILOT_END ? 1 : null),
    ream,
    pull,
    equipment: t < COMPLETE - 0.4,
    sondeReveal: 0,
    locatorU: Math.min(0.985, front + 0.004),
    marks: t >= 33 && t < COMPLETE ? 1 : 0,
    signal: 0,
  };
};

// ---------- shots ----------

export type Label = {
  text: string;
  at: number;
  out?: number;
  /** world anchor, or a function of time (moving tools) */
  anchor: [number, number, number] | ((t: number) => [number, number, number]);
  /** label offset from the anchor in px */
  dx?: number;
  dy?: number;
  /** accent dot for the active tool */
  accent?: boolean;
};
export type Shot = {
  id: string;
  start: number;
  end: number;
  /** on-screen section title, e.g. "1. Pilot Bore" */
  title?: { number?: string; text: string; at: number; out?: number };
  /** storyboard: what we see */
  visual: string;
  /** storyboard: who this shot speaks to (from the brief's audience priorities) */
  personas: string[];
  /** storyboard: points for the HDD specialist review */
  review?: string;
  /** storyboard frame time (defaults to the middle) */
  board?: number;
  keys: (t: number) => Pose;
  view?: (t: number, s: WorldState) => Partial<WorldState>;
  labels?: Label[];
  /** 2D overlays drawn by the composition */
  overlays?: ("locator" | "planInset" | "diameters" | "radio" | "steer" | "track" | "workzone" | "clearance" | "benefits" | "years")[];
  scene?: "site" | "creek" | "endcard";
};

const K = (keys: Key[]) => (t: number) => poseAt(keys, t);
/** Where a utility (by id) crosses the section plane */
const util = (id: string): [number, number, number] => {
  const u = UTILITIES.find((x) => x.id === id)!;
  return [utilityLine(u).crossX, u.depth, 0.05];
};
/** The locator on the surface, above the drill head */
const locatorAnchor = (t: number): [number, number, number] => [boreAt(Math.min(0.985, (pilotAt(t) ?? 0) + 0.004)).p.x, 1.4, -1.2];
const [ux, uz] = cityToWorld(-4.6, 30);

// world anchors used by several shots
const RIG_MID: [number, number, number] = [-46.3, 2.2, 0];
const MUD: [number, number, number] = [-53.5, 2.2, -5.2];
const WATER_TRUCK: [number, number, number] = [-52, 2.6, 4.6];
const ROD_TRAILER: [number, number, number] = [-44, 1.0, 6.4];
const FENCE: [number, number, number] = [-33, 1.1, -9];
const OPERATOR: [number, number, number] = [-47.6, 2.9, 1.55];
const at = (u: number, dy = 0): [number, number, number] => {
  const p = boreAt(u).p;
  return [p.x, p.y + dy, 0.1];
};
const [bx, bz] = cityToWorld(19, -19);
const BUILDING: [number, number, number] = [bx, 14, bz];
const [rx, rz] = cityToWorld(0, 26);
const ROAD: [number, number, number] = [rx, 0.2, rz];

export const SHOTS: Shot[] = [
  {
    id: "S01",
    start: 0,
    end: 4.08,
    title: { text: "Horizontal Directional Drilling", at: 0.8, out: 9.3 },
    visual: "High aerial of a contemporary intersection: four lanes each way, signals cycling, steady traffic, ground-floor businesses. Slow push in. No narration yet (original has a silent intro).",
    personas: ["Owners and end clients"],
    keys: K([
      { t: 0, pos: [98, 84, 122], target: [0, 0, 0], fov: 33 },
      { t: 4.08, pos: [78, 62, 100], target: [0, 0, 0], fov: 34 },
    ]),
  },
  {
    id: "S02",
    start: 4.08,
    end: 10.4,
    visual: "Camera descends to street level along Main St. Short labels for roads and buildings as they are named.",
    personas: ["Owners and end clients", "Civil engineers"],
    keys: K([
      { t: 4.08, pos: [78, 62, 100], target: [0, 0, 0], fov: 34 },
      { t: 10.4, pos: [34, 12, 52], target: [-2, 1, 0], fov: 40 },
    ]),
    labels: [
      { text: "Roads", at: 7.9, out: 10.3, anchor: ROAD, dy: -60 },
      { text: "Buildings", at: 8.5, out: 10.3, anchor: BUILDING, dx: 40, dy: -40 },
    ],
  },
  {
    id: "S03",
    start: 10.4,
    end: 22.0,
    visual: "The ground opens along the crossing (cutaway between the two pits). Existing utilities appear in section, labeled as named: water, sewer, fiber, electric, gas (APWA colors). The proposed crossing is drawn in white below them. Camera rises so traffic above stays in frame.",
    personas: ["Civil engineers", "Estimators", "Owners and end clients"],
    review: "Utility depths and sizes are illustrative. Confirm the bore depth below the deepest utility reads as plausible.",
    board: 17.5,
    keys: K([
      { t: 10.4, pos: [34, 12, 52], target: [-2, 1, 0], fov: 40 },
      { t: 13.2, pos: [16, 7, 40], target: [-2, -2.2, 0], fov: 38 },
      { t: 17.0, pos: [10, 6, 36], target: [-1, -2.6, 0], fov: 38 },
      { t: 22.0, pos: [18, 16, 56], target: [0, -1.5, 0], fov: 38 },
    ]),
    view: (t) => ({ cut: 40 - 40 * smooth(ramp(t, 10.5, 12.8)), plan: smooth(ramp(t, 16.4, 19.5)) }),
    labels: [
      { text: "Water", at: 13.2, out: 21.8, anchor: util("water"), dx: -40, dy: -70 },
      { text: "Sewer", at: 13.8, out: 21.8, anchor: util("sewer"), dx: 0, dy: -95 },
      { text: "Fiber", at: 14.4, out: 21.8, anchor: util("fiber"), dx: 40, dy: -70 },
      { text: "Electric", at: 14.9, out: 21.8, anchor: util("electric"), dx: 10, dy: -130 },
      { text: "Gas", at: 15.9, out: 21.8, anchor: util("gas"), dx: -20, dy: -120 },
      { text: "Proposed crossing", at: 16.6, out: 21.8, anchor: at(0.62), dx: 60, dy: 70 },
    ],
  },
  {
    id: "S04",
    start: 22.0,
    end: 31.6,
    visual: "Surface closes. The drilling setup on the corner lot: rig, drilling fluid system, water truck, rod trailer, crew truck, fenced work area. Then the camera rises to show the lot set back from the traffic lanes and business entrances.",
    personas: ["Project managers", "Civil contractors", "Owners and end clients"],
    review: "Equipment layout and footprint: confirm a plausible mid-size rig spread.",
    board: 25.0,
    keys: K([
      { t: 22.0, pos: [18, 16, 56], target: [0, -1.5, 0], fov: 38 },
      { t: 24.0, pos: [-24, 13, 27], target: [-46, 1, 0], fov: 40 },
      { t: 26.2, pos: [-26, 12, 25], target: [-47, 1, 0], fov: 40 },
      { t: 30.6, pos: [0, 44, 62], target: [-24, 0, -2], fov: 40 },
    ]),
    view: (t) => ({ cut: 40 * smooth(ramp(t, 22.0, 23.2)) }),
    labels: [
      { text: "Drill rig", at: 22.9, out: 26.2, anchor: RIG_MID, dy: -70 },
      { text: "Drilling fluid system", at: 23.3, out: 26.2, anchor: MUD, dx: -60, dy: -60 },
      { text: "Water truck", at: 23.7, out: 26.2, anchor: WATER_TRUCK, dx: -40, dy: -70 },
      { text: "Rod trailer", at: 24.1, out: 26.2, anchor: ROD_TRAILER, dx: 30, dy: 60 },
      { text: "Protected work area", at: 24.5, out: 26.2, anchor: FENCE, dx: 50, dy: -50 },
    ],
    overlays: ["workzone"],
  },
  {
    id: "S05",
    start: 31.6,
    end: 48.1,
    title: { text: "Bore Path Planning", at: 31.8, out: 47.6 },
    visual: "Plan view with the ground made see-through: existing utilities along both streets; the planned bore path drawn as a white dashed line from the entrance pit to the exit pit (white = proposed excavation, APWA). Surface marks follow the route. Then a profile cutaway shows the planned path passing below the utilities with clearance. Camera moves to the entrance pit.",
    personas: ["Estimators", "Civil engineers", "Project managers"],
    review: "Profile shape (entry angle, depth below utilities, bend radius) and the clearance graphic. No measurements are shown.",
    board: 35.5,
    keys: K([
      { t: 31.6, pos: [0, 44, 62], target: [-24, 0, -2], fov: 40 },
      { t: 33.5, pos: [0, 110, 26], target: [0, 0, 0], fov: 42 },
      { t: 37.0, pos: [4, 104, 30], target: [0, 0, 0], fov: 42 },
      { t: 39.2, pos: [0, 2, 60], target: [0, -3, 0], fov: 36 },
      { t: 42.4, pos: [-4, 2, 56], target: [-2, -3, 0], fov: 36 },
      { t: 46.8, pos: [-33.5, 2.4, 8.5], target: [-40, -0.4, 0], fov: 36 },
    ]),
    view: (t) => ({
      xray: smooth(ramp(t, 32.0, 33.5)) * (1 - smooth(ramp(t, 37.0, 38.2))),
      plan: smooth(ramp(t, 33.6, 36.6)) * (1 - ramp(t, 46.0, 47.6)),
      cut: 40 - 40 * smooth(ramp(t, 37.0, 38.6)),
    }),
    labels: [
      { text: "Existing utilities", at: 34.0, out: 37.0, anchor: [ux, 0, uz], dx: 40, dy: -40 },
      { text: "Planned bore path", at: 35.0, out: 37.0, anchor: [20, 0, 0], dx: 30, dy: 60 },
      { text: "Entrance pit", at: 35.6, out: 37.0, anchor: [-39.3, 0, 0], dx: -40, dy: -50 },
      { text: "Exit pit", at: 35.9, out: 37.0, anchor: [39.3, 0, 0], dx: 40, dy: -50 },
    ],
    overlays: ["clearance"],
  },
  {
    id: "S06",
    start: 48.1,
    end: 64.4,
    title: { number: "1", text: "Pilot Bore", at: 48.3, out: 63.8 },
    visual: "Close on the rig front: the drill bit enters the entrance pit and the soil beyond. Drilling fluid collects in the pit (contained). Then a wider view links the rig operator and the locator by radio.",
    personas: ["Project managers", "Environmental project managers", "Civil contractors"],
    review: "Pit position relative to the rig and entry angle; fluid level shown in the pit; radio link graphic.",
    board: 55.0,
    keys: K([
      { t: 48.1, pos: [-33.5, 2.4, 8.5], target: [-40, -0.4, 0], fov: 36 },
      { t: 51.0, pos: [-32.5, 3.6, 11.5], target: [-40.2, -0.3, 0], fov: 38 },
      { t: 56.8, pos: [-33.0, 3.2, 10.5], target: [-39.6, -0.5, 0], fov: 37 },
      { t: 58.6, pos: [-22, 11, 24], target: [-43, 0.5, -1], fov: 40 },
      { t: 64.4, pos: [-20, 10, 24], target: [-42, 0.3, -1], fov: 40 },
    ]),
    labels: [
      { text: "Entrance pit", at: 52.0, out: 57.0, anchor: [-39.3, 0.1, 0.6], dx: -60, dy: -60 },
      { text: "Drilling fluid containment", at: 54.7, out: 57.0, anchor: [-39.6, -0.5, -0.4], dx: 40, dy: 60 },
      { text: "Rig operator", at: 59.0, out: 64.2, anchor: OPERATOR, dx: -40, dy: -60 },
      { text: "Locator", at: 59.2, out: 64.2, anchor: locatorAnchor, dx: 40, dy: -50 },
    ],
    overlays: ["radio"],
  },
  {
    id: "S07",
    start: 64.4,
    end: 87.0,
    visual: "Macro underground: the bit and the sonde housing; the housing turns see-through to show the sonde (transmitter). Signal rings rise to the surface, where the walkover locator receives depth and pitch (illustrative display, no project values). The locator then relays steering directions to the operator.",
    personas: ["Civil engineers", "Project managers"],
    review: "Sonde position in its housing behind the bit; locator display layout; signal graphic.",
    board: 74.5,
    keys: (t) => {
      const h = headPos(t);
      const keys: Key[] = [
        { t: 64.4, pos: [h.x + 2.4, h.y + 0.5, 3.4], target: [h.x - 0.3, h.y, 0], fov: 32 },
        { t: 71.8, pos: [h.x + 2.1, h.y + 0.4, 3.0], target: [h.x - 0.4, h.y, 0], fov: 32 },
        { t: 74.6, pos: [h.x + 5, h.y + 4.5, 15], target: [h.x, h.y + 2.4, 0], fov: 38 },
        { t: 78.4, pos: [h.x + 6, h.y + 5, 17], target: [h.x, h.y + 2.6, 0], fov: 38 },
        { t: 81.0, pos: [-12, 14, 38], target: [-33, 0, -1], fov: 40 },
        { t: 87.0, pos: [-11, 13, 37], target: [-32, 0, -1], fov: 40 },
      ];
      return poseAt(keys, t);
    },
    view: (t) => ({ cut: 0, sondeReveal: smooth(ramp(t, 65.4, 67.0)) * (1 - ramp(t, 72.0, 73.0)), signal: ramp(t, 72.9, 73.6) * (1 - ramp(t, 80.5, 81.5)) }),
    labels: [
      { text: "Sonde (transmitter)", at: 66.4, out: 72.4, anchor: (t) => at((pilotAt(t) ?? 0) - 0.007), dx: -40, dy: -90, accent: true },
      { text: "Drill bit", at: 67.6, out: 72.4, anchor: (t) => at(pilotAt(t) ?? 0), dx: 60, dy: 70 },
      { text: "Walkover locator", at: 75.9, out: 80.4, anchor: locatorAnchor, dx: 50, dy: -50 },
    ],
    overlays: ["locator", "track"],
  },
  {
    id: "S08",
    start: 87.0,
    end: 107.7,
    visual: "Follow the drill head along the bore path beneath the intersection. Restrained steering indicators (up, down, right, left) as they are named; a plan inset shows position along the route. Then the view rises to connect the head with the locator walking directly above.",
    personas: ["Civil engineers", "Estimators"],
    review: "Steering behavior (gradual corrections, no sharp bends) and the tracking line between head and locator.",
    board: 92.4,
    keys: (t) => {
      const h = headPos(t);
      const keys: Key[] = [
        { t: 87.0, pos: [-11, 13, 37], target: [-32, 0, -1], fov: 40 },
        { t: 89.2, pos: [h.x + 4.2, h.y + 1.6, 9.5], target: [h.x, h.y, 0], fov: 36 },
        { t: 98.6, pos: [h.x + 4.2, h.y + 1.6, 9.5], target: [h.x, h.y, 0], fov: 36 },
        { t: 101.2, pos: [h.x + 9, 5.5, 20], target: [h.x, -1.5, 0], fov: 38 },
        { t: 107.7, pos: [h.x + 9, 5.5, 20], target: [h.x, -1.2, 0], fov: 38 },
      ];
      return poseAt(keys, t);
    },
    view: () => ({ cut: 0 }),
    labels: [{ text: "Tracked position", at: 101.4, out: 107.4, anchor: (t) => at(pilotAt(t) ?? 0), dx: 60, dy: 60, accent: true }],
    overlays: ["steer", "planInset", "track"],
  },
  {
    id: "S09",
    start: 107.7,
    end: 132.2,
    title: { number: "2", text: "Bore Enlargement", at: 107.9, out: 131.8 },
    visual: "The completed pilot hole in section. A diameter comparison (pilot bore, conduit, enlarged bore) presents the narrated sizes as examples. At the exit pit a reamer is attached to the drill string; it is pulled back toward the rig, cutting the larger hole behind it.",
    personas: ["Civil engineers", "Estimators", "Project managers"],
    review: "Reamer type and size relative to the pilot hole; direction of travel (pullback toward the rig); example sizing note.",
    board: 129.5,
    keys: (t) => {
      const r = boreAt(reamAt(t) ?? 1).p;
      const rx = Math.min(r.x, 34);
      const keys: Key[] = [
        { t: 107.7, pos: [6, -2.6, 7.5], target: [0, -4.9, 0], fov: 34 },
        { t: 118.6, pos: [3, -3.0, 6.5], target: [-1, -4.9, 0], fov: 34 },
        { t: 119.4, pos: [33.5, 1.2, 8.5], target: [38.0, -0.8, 0], fov: 38 },
        { t: 127.0, pos: [33.0, 1.0, 8.0], target: [37.6, -0.9, 0], fov: 38 },
        { t: 129.0, pos: [rx - 3.5, r.y + 2.2, 9.5], target: [r.x, r.y, 0], fov: 38 },
        { t: 132.2, pos: [rx - 3.5, r.y + 2.2, 9.5], target: [r.x, r.y, 0], fov: 38 },
      ];
      return poseAt(keys, t);
    },
    view: () => ({ cut: 0 }),
    labels: [
      { text: "Pilot bore", at: 108.6, out: 118.6, anchor: [1.5, -5.0, 0.15], dx: 40, dy: -80 },
      { text: "Reamer", at: 123.7, out: 132.0, anchor: (t) => at(reamAt(t) ?? 1), dx: 40, dy: -80, accent: true },
      { text: "Enlarged bore", at: 128.4, out: 132.0, anchor: (t) => at(Math.min(1, (reamAt(t) ?? 1) + 0.03)), dx: 50, dy: 70 },
      { text: "Pilot bore", at: 128.4, out: 132.0, anchor: (t) => at(Math.max(0, (reamAt(t) ?? 1) - 0.03)), dx: -50, dy: 70 },
    ],
    overlays: ["diameters"],
  },
  {
    id: "S10",
    start: 132.2,
    end: 143.9,
    visual: "Wide combined view: the cutaway with the reamer moving toward the rig while traffic, signals and pedestrians continue above. Both work zones stay small and visible.",
    personas: ["Owners and end clients", "Civil contractors", "Project managers"],
    board: 138.0,
    keys: K([
      { t: 132.2, pos: [40, 30, 88], target: [0, -2, 0], fov: 36 },
      { t: 143.9, pos: [-18, 30, 90], target: [0, -2, 0], fov: 36 },
    ]),
    view: () => ({ cut: 0 }),
    labels: [{ text: "Reamer", at: 133, out: 143.6, anchor: (t) => at(reamAt(t) ?? 0.004), dx: 30, dy: 70, accent: true }],
    overlays: ["workzone"],
  },
  {
    id: "S11",
    start: 143.9,
    end: 150.8,
    title: { number: "3", text: "Conduit Installation", at: 144.0, out: 150.5 },
    visual: "Exit side: the pullback assembly (reamer, swivel, pulling head) connected to the conduit string laid on rollers. The rig pulls the conduit into the prepared bore toward the rig.",
    personas: ["Project managers", "Civil engineers", "Civil contractors"],
    review: "Assembly order (drill pipe, reamer, swivel, pulling head, conduit) and movement direction.",
    board: 148.6,
    keys: K([
      { t: 143.9, pos: [33.2, 1.4, 8.5], target: [38.0, -0.4, 0], fov: 40 },
      { t: 150.8, pos: [31.0, 1.0, 8.5], target: [35.5, -1.0, 0], fov: 40 },
    ]),
    view: () => ({ cut: 0 }),
    labels: [
      { text: "Reamer", at: 144.6, out: 150.6, anchor: (t) => at(pullAt(t) ?? 1), dx: -40, dy: -90 },
      { text: "Swivel", at: 145.0, out: 150.6, anchor: (t) => at(Math.min(1, (pullAt(t) ?? 1) + 0.9 / 80)), dx: 0, dy: 90 },
      { text: "Pulling head", at: 145.4, out: 150.6, anchor: (t) => at(Math.min(1, (pullAt(t) ?? 1) + 1.4 / 80)), dx: 40, dy: -90 },
      { text: "Conduit", at: 146.2, out: 150.6, anchor: (t) => at(Math.min(1, (pullAt(t) ?? 1) + 3.0 / 80)), dx: 40, dy: 80 },
    ],
  },
  {
    id: "S12",
    start: 150.8,
    end: 162.9,
    visual: "Benefits, as narrated, with short labels: businesses open and accessible, traffic moving through the intersection, pavement left in place while the conduit is pulled underneath (cutaway).",
    personas: ["Owners and end clients", "Project managers", "Civil contractors"],
    board: 161.5,
    keys: K([
      { t: 150.8, pos: [-2, 26, 58], target: [-18, 1, -4], fov: 40 },
      { t: 155.0, pos: [4, 24, 54], target: [-14, 1, -4], fov: 40 },
      { t: 157.6, pos: [28, 16, 44], target: [0, 1, 0], fov: 40 },
      { t: 159.6, pos: [30, 14, 42], target: [0, 0.5, 0], fov: 40 },
      { t: 161.6, pos: [14, 9, 46], target: [0, -2, 0], fov: 38 },
      { t: 162.9, pos: [12, 8.5, 45], target: [0, -2, 0], fov: 38 },
    ]),
    view: (t) => ({ cut: 40 - 40 * smooth(ramp(t, 160.0, 161.5)) }),
    overlays: ["benefits"],
  },
  {
    id: "S13",
    start: 162.9,
    end: 170.9,
    scene: "creek",
    visual: "Separate example site: a stream with wetland banks. A bore passes beneath the channel with a conduit installed, pits set back from the banks. Labeled as a crossing type, with no claim of zero impact.",
    personas: ["Environmental project managers", "Civil engineers"],
    review: "Depth below the channel and setback of the pits from the banks (illustrative).",
    board: 167.0,
    keys: K([
      { t: 162.9, pos: [16, 7, 30], target: [0, -2, 0], fov: 38 },
      { t: 170.9, pos: [9, 5, 25], target: [0, -2.4, 0], fov: 38 },
    ]),
  },
  {
    id: "S14",
    start: 170.9,
    end: 179.4,
    visual: "Back at the intersection: the completed crossing. Equipment gone, pits restored, conduit in place beneath the utilities, traffic moving. A short line accompanies 'for over 30 years'.",
    personas: ["Owners and end clients", "Project managers"],
    review: "Final conduit position and restored pits.",
    board: 174.5,
    keys: K([
      { t: 170.9, pos: [4, 13, 70], target: [0, -2.5, 0], fov: 38 },
      { t: 179.4, pos: [-6, 18, 78], target: [0, -2, 0], fov: 38 },
    ]),
    view: () => ({ cut: 0 }),
    labels: [{ text: "Completed crossing", at: 171.6, out: 179.0, anchor: at(0.5), dx: 40, dy: 80 }],
    overlays: ["years"],
  },
  {
    id: "S15",
    start: 179.4,
    end: 188.31,
    scene: "endcard",
    visual: "DTI end card on a neutral background: approved logo, 'HDD Expertise Since 1992', 'Discuss Your Next HDD Project', verified contact details.",
    personas: ["All"],
    board: 184.0,
    keys: K([{ t: 179.4, pos: [-6, 18, 78], target: [0, -2, 0], fov: 38 }]),
  },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];
export const DURATION = 188.31;
