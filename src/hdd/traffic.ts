// Deterministic city traffic: cars follow lanes, stop at red lights and keep their distance.
// Simulated from t = 0 in fixed steps and cached, so any frame renders the same in any order.
import { ROAD_HALF, SIDEWALK } from "./site";

export const FPS = 30;
const DT = 1 / FPS;
const SPAN = 95; // lane coordinate runs from -SPAN to +SPAN, then wraps (outside the diorama)
const STOP = -(ROAD_HALF + SIDEWALK + 1.5);
const VMAX = 9.5;
export const CYCLE = 26;
/** Signal phase at time t: which road has green */
export const greenFor = (t: number): "main" | "cross" | null => {
  const c = ((t % CYCLE) + CYCLE) % CYCLE;
  if (c < 11) return "main";
  if (c < 13) return null;
  if (c < 24) return "cross";
  return null;
};

export type Lane = { road: "main" | "cross"; offset: number; dir: 1 | -1 };
// Right-hand traffic: with y up, the right side of a car moving +z' is -x', and of a car moving +x' is +z'.
export const LANES: Lane[] = [
  { road: "main", offset: 1.75, dir: -1 },
  { road: "main", offset: 5.25, dir: -1 },
  { road: "main", offset: -1.75, dir: 1 },
  { road: "main", offset: -5.25, dir: 1 },
  { road: "cross", offset: -1.75, dir: -1 },
  { road: "cross", offset: -5.25, dir: -1 },
  { road: "cross", offset: 1.75, dir: 1 },
  { road: "cross", offset: 5.25, dir: 1 },
];
const COLORS = ["#c9ccd0", "#f1f1ef", "#3d434a", "#2b3e57", "#7d1f22", "#9aa3ab", "#e9e7e2", "#22262b", "#5b6b78"];

type Car = { lane: number; s: number; v: number; color: string; kind: "car" | "suv" | "van" };
const init = (): Car[] => {
  const cars: Car[] = [];
  let k = 0;
  LANES.forEach((_, li) => {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const s = -SPAN + ((i + (li % 3) * 0.33) * (2 * SPAN)) / n;
      cars.push({ lane: li, s, v: VMAX * 0.8, color: COLORS[k % COLORS.length], kind: k % 5 === 0 ? "van" : k % 3 === 0 ? "suv" : "car" });
      k++;
    }
  });
  return cars;
};

const steps: Car[][] = [init()];
const step = (prev: Car[], t: number): Car[] => {
  const green = greenFor(t);
  const next = prev.map((c) => ({ ...c }));
  LANES.forEach((lane, li) => {
    const inLane = next.filter((c) => c.lane === li).sort((a, b) => a.s - b.s);
    inLane.forEach((c, i) => {
      let target = VMAX;
      // red light: stop before the stop line
      if (green !== lane.road && c.s < STOP && c.s > STOP - 30) target = Math.min(target, Math.max(0, 0.9 * (STOP - 0.5 - c.s)));
      const ahead = inLane[i + 1] ?? (inLane[0] !== c ? { s: inLane[0].s + 2 * SPAN } : null);
      if (ahead) target = Math.min(target, Math.max(0, 1.1 * (ahead.s - c.s - 7.5)));
      const dv = target - c.v;
      c.v += Math.max(-6 * DT, Math.min(2.5 * DT, dv));
      c.s += c.v * DT;
      if (c.s > SPAN) c.s -= 2 * SPAN;
    });
  });
  return next;
};

/** Cars at a frame */
export const carsAt = (frame: number): Car[] => {
  const f = Math.max(0, Math.floor(frame));
  while (steps.length <= f) steps.push(step(steps[steps.length - 1], steps.length * DT));
  return steps[f];
};

/** City-frame position and heading of a car */
export const carPose = (c: Car): { x: number; z: number; heading: number } => {
  const lane = LANES[c.lane];
  const s = c.s * lane.dir;
  if (lane.road === "main") return { x: lane.offset, z: s, heading: lane.dir === 1 ? 0 : Math.PI };
  return { x: s, z: lane.offset, heading: lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2 };
};
