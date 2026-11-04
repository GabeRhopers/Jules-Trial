// Shot list for the DTI HDD explainer (v2), synchronized sentence by sentence to the original narration
// (word times in hdd/dti-hdd-explainer/narration.json). Three kinds of view, always from the +z side so the
// entry (rig) stays on the left: site overview, longitudinal section, technical close-up.
import type { Key, Pose } from "./camera";
import { poseAt } from "./camera";
import { BASE_STATE } from "./LookDev";
import { OPERATOR_SEAT } from "./rig";
import { boreAt, cityToWorld, POTHOLE, RIG_LOT, UTILITIES, utilityLine } from "./site";
import { HEAD_OFF } from "./tools";
import type { WorldState } from "./World";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const smooth = (x: number) => x * x * (3 - 2 * x);
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
export const BIT_OFF = 121.0;
export const REAM_ATTACH = 123.7;
export const REAM_START = 127.3;
export const REAM_END = 142.6;
export const PULL_ATTACH = 143.9;
export const PULL_START = 146.6;
export const PULL_END = 168.0;
export const COMPLETE = 170.9;

export const pilotAt = (t: number) => (t < PILOT_START - 0.5 || t >= BIT_OFF ? null : track(t, [[PILOT_START, 0], [57.5, 0.02], [64.4, 0.06], [87, 0.33], [PILOT_END, 1]]));
export const reamAt = (t: number) => (t < REAM_ATTACH || t >= REAM_END ? null : track(t, [[REAM_START, 1], [REAM_END, 0.004]]));
export const pullAt = (t: number) => (t < PULL_ATTACH || t >= COMPLETE ? null : track(t, [[PULL_START, 1], [PULL_END, 0.004]]));
const BORE_LEN = 76;

/** Base state of the job at time t; shots set the view (section, x-ray, planning graphics) */
export const processState = (t: number, frame: number): WorldState => ({
  ...BASE_STATE,
  frame,
  pilot: t >= BIT_OFF ? 1 : pilotAt(t),
  ream: reamAt(t),
  pull: pullAt(t),
  complete: t >= COMPLETE,
  pipeStaged: true,
  locatorPose: "locate",
  bitAttached: t < BIT_OFF,
  enlargedFrom: t >= REAM_END ? 0 : reamAt(t),
  // steering: the bit face is rotated gradually as each direction is named (no sudden moves)
  roll: track(t, [[89.5, 0], [90.7, 0], [91.3, Math.PI], [92.1, Math.PI], [92.7, Math.PI / 2], [93.3, Math.PI / 2], [94.0, -Math.PI / 2], [95.5, -Math.PI / 2], [97.0, 0]]),
});

export const headAt = (t: number) => boreAt(pilotAt(t) ?? (t >= PILOT_END ? 1 : 0)).p;
const reamP = (t: number) => boreAt(reamAt(t) ?? 1).p;

// ---------- shots ----------
export type Label = {
  text: string;
  at: number;
  out?: number;
  anchor: [number, number, number] | ((t: number) => [number, number, number]);
  dx?: number;
  dy?: number;
  accent?: boolean;
};
export type Overlay =
  | "applications"
  | "obstacles"
  | "legend"
  | "workzone"
  | "planSheet"
  | "separation"
  | "fluidCircuit"
  | "radio"
  | "locator"
  | "relay"
  | "steer"
  | "track"
  | "sizing"
  | "trailing"
  | "accessZones"
  | "swivel"
  | "pullArrow"
  | "benefits"
  | "restoration"
  | "years"
  | "orientation";
export type Shot = {
  id: string;
  start: number;
  end: number;
  title?: { number?: string; text: string; at: number; out?: number };
  view: "overview" | "section" | "close-up" | "example" | "end card";
  /** storyboard: what we see */
  visual: string;
  /** storyboard: who this shot speaks to */
  audience: string[];
  /** storyboard: points for the HDD specialist review */
  review?: string;
  board?: number;
  keys: (t: number) => Pose;
  look?: (t: number) => Partial<WorldState>;
  labels?: Label[];
  overlays?: Overlay[];
  scene?: "site" | "creek" | "endcard";
};

const K = (keys: Key[]) => (t: number) => poseAt(keys, t);
const util = (id: string): [number, number, number] => {
  const u = UTILITIES.find((x) => x.id === id)!;
  return [utilityLine(u).crossX, u.depth, 0.05];
};
const at = (u: number, dy = 0): [number, number, number] => {
  const p = boreAt(u).p;
  return [p.x, p.y + dy, 0.1];
};
const locator = (t: number): [number, number, number] => [boreAt(Math.min(0.985, (pilotAt(t) ?? 0) + 0.003)).p.x + 0.4, 1.5, -1.5];
const OPERATOR: [number, number, number] = [OPERATOR_SEAT[0], 2.7, OPERATOR_SEAT[2]];
export const ANCHORS = { operator: OPERATOR, locator };

/** The established overview (reused at 2:12 so viewers return to a known view) */
export const OVERVIEW: Pose = { pos: [4, 70, 122], target: [4, -4, -4], fov: 40 };
const SECTION: Pose = { pos: [0, 0.6, 66], target: [0, -5.2, 0], fov: 34 };
const ENTRY_CLOSE: Pose = { pos: [-34.6, 1.7, 9.6], target: [-40.2, -0.45, 0], fov: 40 };
const EXIT_CLOSE: Pose = { pos: [35.4, 1.7, 9.6], target: [40.0, -0.35, 0], fov: 40 };
const P = (p: Pose, t: number): Key => ({ ...p, t });
const [lmX, lmZ] = cityToWorld(17, -17);
const [shopX, shopZ] = cityToWorld(-17.5, 17.5);

export const SHOTS: Shot[] = [
  {
    id: "S01",
    start: 0,
    end: 4.08,
    view: "overview",
    title: { text: "Horizontal Directional Drilling", at: 0.5, out: 9.6 },
    visual: "Stable, elevated three-quarter view of the whole crossing: rig and entry area (left), the intersection, the exit and pipe staging area (right), with the brick clock-tower building as the landmark. The proposed alignment draws in as a white dashed planning line.",
    audience: ["Infrastructure owners", "Project managers", "Estimators"],
    keys: K([P(OVERVIEW, 0), { ...OVERVIEW, pos: [4, 68, 118], t: 4.08 }]),
    look: (t) => ({ planSurface: smooth(ramp(t, 1.4, 3.6)) }),
    labels: [
      { text: "Rig / Entry", at: 0.9, out: 10.2, anchor: [-49, 3.5, 0], dy: -70 },
      { text: "Crossing", at: 1.5, out: 10.2, anchor: [0, 0.6, 0], dy: -110 },
      { text: "Exit / Pipe staging", at: 2.1, out: 10.2, anchor: [52, 1.2, 0], dy: -70 },
    ],
  },
  {
    id: "S02",
    start: 4.08,
    end: 10.4,
    view: "overview",
    visual: "Same overview, easing closer to the crossing. The obstacles HDD passes beneath are named in a small graphic as they are spoken (roads, buildings, wetlands).",
    audience: ["Infrastructure owners", "Civil and utility engineers"],
    keys: K([{ ...OVERVIEW, pos: [4, 68, 118], t: 4.08 }, { pos: [2, 44, 88], target: [2, -3, -2], fov: 40, t: 10.4 }]),
    look: () => ({ planSurface: 1 }),
    overlays: ["obstacles"],
  },
  {
    id: "S03",
    start: 10.4,
    end: 22.0,
    view: "section",
    visual: "The view moves down to the longitudinal section along the alignment (entry left, exit right). The ground in front is shown as a faint translucent volume, clearly a visualization. Existing utilities appear in section; the proposed bore is a white dashed profile beneath them. A separate graphic lists typical HDD applications as they are named (not five lines in this bore). Traffic keeps moving above.",
    audience: ["Civil and utility engineers", "Geologists", "Estimators"],
    review: "Profile shape and depth below the utilities (illustrative). Legend distinguishes existing utilities, proposed alignment and (later) installed pipe.",
    board: 18.5,
    keys: K([{ pos: [2, 44, 88], target: [2, -3, -2], fov: 40, t: 10.4 }, P(SECTION, 13.2), { ...SECTION, pos: [0, 1.0, 67], t: 19.5 }, { pos: [0, 5, 66], target: [0, -2.2, 0], fov: 40, t: 22.0 }]),
    look: (t) => ({ cut: 45 - 45 * smooth(ramp(t, 10.6, 12.8)), ghostFront: smooth(ramp(t, 10.4, 12.0)), planSurface: 1, planProfile: smooth(ramp(t, 12.8, 15.2)) }),
    overlays: ["applications", "legend", "orientation"],
  },
  {
    id: "S04",
    start: 22.0,
    end: 31.6,
    view: "overview",
    visual: "The section closes and the view moves to the rig / entry area: rig aligned to the entry, rod trailer, fluid recycling system and pump, support truck with its hose to the recycler, crew positions and room to move. Then the view rises to show the work area set back from traffic lanes and business entrances.",
    audience: ["Project managers", "Contractors", "Estimators"],
    review: "Equipment layout and spacing for a plausible mid-size spread; hose routing.",
    board: 25.2,
    keys: K([{ pos: [0, 5, 66], target: [0, -2.2, 0], fov: 40, t: 22.0 }, { pos: [-25, 13, 30], target: [-50, 1, -1], fov: 40, t: 24.4 }, { pos: [-27, 12, 28], target: [-51, 1, -1], fov: 40, t: 26.4 }, { pos: [-6, 42, 72], target: [-30, 0, -2], fov: 40, t: 30.8 }]),
    look: (t) => ({ cut: 45 * smooth(ramp(t, 22.0, 23.2)), ghostFront: 1 - smooth(ramp(t, 22.0, 23.2)), planSurface: 1 }),
    labels: [
      { text: "Drill rig", at: 23.0, out: 26.4, anchor: [-46.5, 3.0, 0], dy: -80 },
      { text: "Fluid recycling system", at: 23.6, out: 26.4, anchor: [-55.5, 3.4, -6.2], dx: -60, dy: -60 },
      { text: "Support truck", at: 24.2, out: 26.4, anchor: [-57, 2.8, 5.4], dx: -60, dy: 50 },
      { text: "Rod trailer", at: 24.8, out: 26.4, anchor: [-49, 1.2, 6.4], dx: 40, dy: 70 },
    ],
    overlays: ["workzone"],
  },
  {
    id: "S05",
    start: 31.6,
    end: 48.1,
    view: "overview",
    title: { text: "Bore Path Planning", at: 31.8, out: 47.6 },
    visual: "The crew lead reviews the plan and profile on a tablet at the truck; an illustrative plan and profile sheet relates site information to the crossing. Plan view: utility locate marks (APWA colors) and the white proposed alignment; a localized test hole (potholing) verifies the gas main where the bore crosses it. Section: the proposed profile below the utilities, with separation set by the project design (no values). The view then moves to the entry pit.",
    audience: ["Civil and utility engineers", "Geologists", "Estimators", "Project managers"],
    review: "Plan/profile content, potholing location and presentation, separation graphic (no universal values).",
    board: 37.6,
    keys: K([
      { pos: [-6, 42, 72], target: [-30, 0, -2], fov: 40, t: 31.6 },
      { pos: [-34.0, 3.0, -2.6], target: [-38.8, 1.3, -7.4], fov: 38, t: 33.0 },
      { pos: [-34.2, 3.0, -2.9], target: [-38.8, 1.3, -7.4], fov: 38, t: 35.0 },
      { pos: [0, 112, 30], target: [0, 0, 0], fov: 40, t: 36.6 },
      { pos: [2, 30, 24], target: [POTHOLE.x, 0, POTHOLE.z], fov: 38, t: 38.8 },
      { pos: [-3, 5.5, 32], target: [-4, -2.6, 0], fov: 38, t: 40.6 },
      { pos: [-3, 5.5, 31], target: [-4, -2.6, 0], fov: 38, t: 42.4 },
      { ...ENTRY_CLOSE, t: 47.2 },
    ]),
    look: (t) => ({
      planReview: t < 35.4,
      xray: smooth(ramp(t, 35.0, 36.4)) * (1 - smooth(ramp(t, 38.2, 39.0))),
      marks: smooth(ramp(t, 35.3, 36.4)),
      planSurface: 1,
      planProfile: t > 39 ? 1 : 0,
      pothole: t > 34.6 && t < 44.5,
      cut: 45 - 45 * smooth(ramp(t, 39.0, 40.4)),
      ghostFront: smooth(ramp(t, 39.0, 40.2)),
    }),
    labels: [
      { text: "Locate marks: existing utilities", at: 36.0, out: 38.6, anchor: (() => { const [x, z] = cityToWorld(-4.6, -30); return [x, 0.3, z] as [number, number, number]; })(), dx: -40, dy: -60 },
      { text: "Proposed alignment", at: 36.3, out: 38.6, anchor: [24, 0.3, 0], dx: 40, dy: 60 },
      { text: "Test hole verifies the gas main", at: 38.9, out: 40.4, anchor: [POTHOLE.x, -0.6, POTHOLE.z], dx: 60, dy: -70 },
      { text: "Gas main", at: 40.8, out: 42.6, anchor: util("gas"), dx: -50, dy: -80 },
      { text: "Sewer", at: 41.0, out: 42.6, anchor: util("sewer"), dx: 60, dy: -60 },
    ],
    overlays: ["planSheet", "separation", "legend", "orientation"],
  },
  {
    id: "S06",
    start: 48.1,
    end: 57.5,
    view: "close-up",
    title: { number: "1", text: "Pilot Bore", at: 48.3, out: 64.2 },
    visual: "Entry close-up, sectioned (entry left): rods feed from the carriage through the vise along the drill frame into the entry pit and through the pit wall at the entry angle. A short fluid diagram shows supply down the drill string and returns carrying cuttings back to the pit, pumped to the recycling system.",
    audience: ["Project managers", "Environmental consultants", "Contractors"],
    review: "Entry angle alignment of frame, rods and pit; pit collection arrangement; fluid circuit (supply, returns, recycling).",
    board: 55.0,
    keys: K([P(ENTRY_CLOSE, 48.1), { ...ENTRY_CLOSE, pos: [-34.2, 1.9, 10.6], t: 57.5 }]),
    look: () => ({ cut: 0, ghostFront: 1, planProfile: 0.0 }),
    labels: [
      { text: "Entry pit", at: 52.0, out: 57.3, anchor: [-39.2, -0.3, 0.6], dx: 60, dy: -70 },
      { text: "Drilling fluid returns", at: 54.7, out: 57.3, anchor: [-39.6, -0.66, -0.2], dx: 70, dy: 60 },
    ],
    overlays: ["fluidCircuit", "orientation"],
  },
  {
    id: "S07",
    start: 57.5,
    end: 64.4,
    view: "overview",
    visual: "Wider view of the entry side: the locator, standing above the drill head with the receiver, calls on the radio; the operator answers from the controls. Both stay at their positions in the site model.",
    audience: ["Project managers", "Contractors"],
    board: 61.0,
    keys: K([{ pos: [-22, 8.5, 26], target: [-41, 1.0, -1], fov: 40, t: 57.5 }, { pos: [-21, 8.2, 25], target: [-41, 1.0, -1], fov: 40, t: 64.4 }]),
    look: (t) => ({ locatorPose: "locateRadio", operatorTalking: t > 60.2 && t < 63.4 }),
    labels: [
      { text: "Locator", at: 58.2, out: 64.2, anchor: locator, dx: 50, dy: -70 },
      { text: "Rig operator", at: 59.4, out: 64.2, anchor: OPERATOR, dx: -50, dy: -70 },
    ],
    overlays: ["radio"],
  },
  {
    id: "S08",
    start: 64.4,
    end: 87.0,
    view: "close-up",
    visual: "Close-up underground: drill bit, sonde housing (the housing turns see-through to show the transmitter) and drill rod. The view widens to the locator above: the receiver measures depth and pitch from the sonde's signal, and the locator interprets the readings (illustrative display). The locator then relays steering directions to the operator.",
    audience: ["Civil and utility engineers", "Geologists", "Project managers"],
    review: "Sonde position in the housing behind the bit; that locating the head is separate from verifying utilities; display content.",
    board: 75.5,
    keys: (t) => {
      const h = headAt(t);
      return poseAt(
        [
          { pos: [h.x + 2.3, h.y + 0.55, 3.0], target: [h.x - 0.25, h.y, 0], fov: 32, t: 64.4 },
          { pos: [h.x + 2.1, h.y + 0.5, 2.8], target: [h.x - 0.3, h.y, 0], fov: 32, t: 71.8 },
          { pos: [h.x + 3, 9.5, 13], target: [h.x, -1.8, 0], fov: 40, t: 74.0 },
          { pos: [h.x + 3.4, 9.8, 13.5], target: [h.x, -1.7, 0], fov: 40, t: 80.6 },
          { pos: [-13, 13, 38], target: [-31, 0, -1], fov: 40, t: 82.4 },
          { pos: [-12.5, 12.6, 37.5], target: [-31, 0, -1], fov: 40, t: 87.0 },
        ],
        t,
      );
    },
    look: (t) => ({ cut: t < 81 ? 0 : 0, ghostFront: 1, sondeReveal: smooth(ramp(t, 65.6, 67.0)) * (1 - ramp(t, 71.6, 72.6)), signal: ramp(t, 72.9, 73.6) * (1 - ramp(t, 80.4, 81.4)), locatorPose: t > 80.5 ? "locateRadio" : "locate", operatorTalking: t > 84.8 && t < 86.8 }),
    labels: [
      { text: "Drill bit", at: 64.6, out: 72.2, anchor: (t) => at(pilotAt(t) ?? 0), dx: 70, dy: 80 },
      { text: "Sonde housing (transmitter inside)", at: 66.4, out: 72.2, anchor: (t) => at((pilotAt(t) ?? 0) - 0.42 / BORE_LEN), dx: -40, dy: -100, accent: true },
      { text: "Drill rod", at: 68.4, out: 72.2, anchor: (t) => at((pilotAt(t) ?? 0) - 1.4 / BORE_LEN), dx: -60, dy: 80 },
      { text: "Walkover locator", at: 75.9, out: 80.4, anchor: locator, dx: 60, dy: -60 },
    ],
    overlays: ["locator", "track", "relay", "orientation"],
  },
  {
    id: "S09",
    start: 87.0,
    end: 107.7,
    view: "close-up",
    visual: "Following the advancing drill head: the bit's slanted face is rotated to steer, and the path ahead changes gradually. Up and down are shown in the profile; right and left in a plan inset, where the head stays on the planned line. The drilled hole behind does not move. The view rises to the locator directly above the head, then follows the head into the exit pit.",
    audience: ["Civil and utility engineers", "Geologists", "Estimators"],
    review: "Steering by tool face (gradual corrections), plan inset, locate line wording, exit arrival.",
    board: 92.0,
    keys: (t) => {
      const h = headAt(t);
      return poseAt(
        [
          { pos: [-12.5, 12.6, 37.5], target: [-31, 0, -1], fov: 40, t: 87.0 },
          { pos: [h.x + 4.2, h.y + 1.4, 9.5], target: [h.x, h.y, 0], fov: 36, t: 89.2 },
          { pos: [h.x + 4.2, h.y + 1.4, 9.5], target: [h.x, h.y, 0], fov: 36, t: 98.4 },
          { pos: [h.x + 8, 4.5, 19], target: [h.x, -1.4, 0], fov: 38, t: 100.6 },
          { pos: [h.x + 8, 4.5, 19], target: [h.x, -1.4, 0], fov: 38, t: 103.2 },
          { ...EXIT_CLOSE, t: 105.6 },
          { ...EXIT_CLOSE, pos: [35.2, 1.8, 9.9], t: 107.7 },
        ],
        t,
      );
    },
    look: () => ({ cut: 0, ghostFront: 1 }),
    labels: [
      { text: "Located position (measured at the surface)", at: 101.4, out: 104.4, anchor: (t) => at(pilotAt(t) ?? 0), dx: 60, dy: 70, accent: true },
      { text: "Exit pit", at: 105.4, out: 107.5, anchor: [39.2, -0.3, 0.6], dx: -60, dy: -70 },
    ],
    overlays: ["steer", "track", "orientation"],
  },
  {
    id: "S10",
    start: 107.7,
    end: 132.2,
    view: "close-up",
    title: { number: "2", text: "Bore Enlargement", at: 107.9, out: 131.8 },
    visual: "Section close-up of the completed pilot hole around the drill rod. A larger sizing graphic compares the pilot bore, product pipe outside diameter and enlarged bore (the narrated sizes as an example only). At the exit pit the crew removes the bit and sonde and attaches the reamer; the reamer is pulled back toward the rig, cutting the enlarged bore along the same alignment, while rods are added behind it so the string stays in the hole for the pullback.",
    audience: ["Civil and utility engineers", "Estimators", "Contractors"],
    review: "Tool change at the exit, reaming direction (toward the rig), proportion of pilot vs enlarged bore, trailing rods for the pullback.",
    board: 129.5,
    keys: (t) => {
      const r = reamP(t);
      return poseAt(
        [
          { pos: [3.6, -3.3, 6.6], target: [0, -5.0, 0], fov: 34, t: 107.7 },
          { pos: [2.2, -3.6, 6.0], target: [-1, -5.0, 0], fov: 34, t: 118.4 },
          { ...EXIT_CLOSE, t: 119.4 },
          { ...EXIT_CLOSE, pos: [35.6, 1.6, 9.0], t: 127.0 },
          { pos: [r.x - 2.6, r.y + 0.9, 8.0], target: [r.x + 0.6, r.y, 0], fov: 38, t: 129.0 },
          { pos: [r.x - 2.6, r.y + 0.9, 8.0], target: [r.x + 0.6, r.y, 0], fov: 38, t: 132.2 },
        ],
        t,
      );
    },
    look: (t) => ({ cut: 0, ghostFront: 1, exitWork: t > 119.4 && t < 127 }),
    labels: [
      { text: "Pilot hole", at: 108.6, out: 118.4, anchor: [1.2, -5.1, 0.12], dx: 40, dy: -90 },
      { text: "Reamer attached at the exit", at: 123.7, out: 127.2, anchor: (t) => at(reamAt(t) ?? 1), dx: -60, dy: -80, accent: true },
      { text: "Enlarged bore", at: 128.4, out: 132.0, anchor: (t) => at(Math.min(1, (reamAt(t) ?? 1) + 0.035)), dx: 50, dy: 80 },
      { text: "Pilot hole", at: 128.4, out: 132.0, anchor: (t) => at(Math.max(0, (reamAt(t) ?? 1) - 0.035)), dx: -50, dy: 80 },
    ],
    overlays: ["sizing", "trailing", "orientation"],
  },
  {
    id: "S11",
    start: 132.2,
    end: 143.9,
    view: "overview",
    visual: "Back to the established overview: the two localized work areas behind fencing, with traffic, signals, sidewalks and storefront entrances in normal use. A small orientation bar shows the reamer's progress underground.",
    audience: ["Infrastructure owners", "Project managers", "Contractors"],
    board: 138.0,
    keys: K([P(OVERVIEW, 132.2), { ...OVERVIEW, pos: [4, 66, 115], t: 143.9 }]),
    overlays: ["accessZones", "orientation"],
  },
  {
    id: "S12",
    start: 143.9,
    end: 150.8,
    view: "close-up",
    title: { number: "3", text: "Conduit Installation", at: 144.0, out: 150.5 },
    visual: "Exit side: the product pipe is staged on roller stands and runs in a smooth, supported curve into the exit pit. The pullback assembly connects the drill string, reamer, swivel and pulling head to the pipe; the reamer turns while the swivel keeps the pipe from rotating; the rig pulls everything toward itself.",
    audience: ["Civil and utility engineers", "Contractors", "Project managers"],
    review: "Assembly order and connections; swivel function; pipe support and approach curve; pull direction.",
    board: 148.8,
    keys: K([{ pos: [47.5, 3.8, 13.5], target: [40.5, -0.2, 0], fov: 40, t: 143.9 }, { pos: [46.0, 3.4, 12.8], target: [39.2, -0.4, 0], fov: 40, t: 150.8 }]),
    look: () => ({ cut: 0, ghostFront: 1 }),
    labels: [
      { text: "Reamer", at: 144.5, out: 150.6, anchor: (t) => at(pullAt(t) ?? 1), dx: -90, dy: 120 },
      { text: "Pulling head", at: 145.3, out: 150.6, anchor: (t) => at(Math.min(1, (pullAt(t) ?? 1) + HEAD_OFF / BORE_LEN)), dx: 60, dy: -90 },
      { text: "Product pipe on rollers", at: 146.2, out: 150.6, anchor: [48, 0.8, 0], dx: 40, dy: -80 },
    ],
    overlays: ["swivel", "pullArrow", "orientation"],
  },
  {
    id: "S13",
    start: 150.8,
    end: 162.9,
    view: "overview",
    visual: "The narrated benefits shown directly: storefront entrances and sidewalks in use next to the work area; traffic moving through the intersection; and a surface comparison of the two localized work areas against the footprint an open-cut trench along the same route would need (illustrative).",
    audience: ["Infrastructure owners", "Project managers", "Environmental consultants"],
    board: 161.6,
    keys: K([
      { pos: [shopX - 16, 7, shopZ + 20], target: [shopX, 2.4, shopZ], fov: 40, t: 150.8 },
      { pos: [shopX - 14, 6.6, shopZ + 18], target: [shopX, 2.4, shopZ], fov: 40, t: 157.2 },
      { pos: [lmX + 26, 14, lmZ + 46], target: [0, 1, 0], fov: 40, t: 158.4 },
      { pos: [lmX + 24, 13, lmZ + 44], target: [0, 1, 0], fov: 40, t: 160.2 },
      P(OVERVIEW, 161.4),
      { ...OVERVIEW, pos: [4, 68, 118], t: 162.9 },
    ]),
    overlays: ["benefits", "restoration"],
  },
  {
    id: "S14",
    start: 162.9,
    end: 170.9,
    view: "example",
    scene: "creek",
    visual: "A separate application example (titled as such): a stream with sloped banks, a channel bed, water and riparian vegetation. Entry and exit work areas sit outside the stream corridor; the bore passes beneath the channel on a smooth profile with the pipe installed.",
    audience: ["Environmental consultants", "Geologists", "Civil and utility engineers"],
    review: "Profile below the channel and setbacks (illustrative, no stated distances).",
    board: 167.0,
    keys: K([{ pos: [12, 8, 34], target: [0, -1.8, 0], fov: 38, t: 162.9 }, { pos: [7, 6.5, 30], target: [0, -2.2, 0], fov: 38, t: 170.9 }]),
  },
  {
    id: "S15",
    start: 170.9,
    end: 179.4,
    view: "section",
    visual: "Back on the urban site: the completed crossing in section. The product pipe is in place beneath the utilities, the pits are restored, equipment is gone and traffic moves above. A short line accompanies 'for over 30 years'.",
    audience: ["Infrastructure owners", "Project managers"],
    review: "Final pipe position; restored pits.",
    board: 174.5,
    keys: K([{ ...SECTION, t: 170.9 }, { ...SECTION, pos: [-2, 1.2, 68], t: 179.4 }]),
    look: () => ({ cut: 0, ghostFront: 1 }),
    labels: [{ text: "Installed product pipe", at: 171.6, out: 179.0, anchor: at(0.4), dx: -60, dy: 110 }],
    overlays: ["years", "legend"],
  },
  {
    id: "S16",
    start: 179.4,
    end: 188.31,
    view: "end card",
    scene: "endcard",
    visual: "DTI end card: approved logo, 'HDD Expertise Since 1992', 'Discuss Your Next HDD Project', contact details.",
    audience: ["All"],
    board: 184.0,
    keys: K([{ ...SECTION, t: 179.4 }]),
  },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];
export const DURATION = 188.31;
export { RIG_LOT };
