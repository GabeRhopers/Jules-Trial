// One consistent HDD site, shared by every shot (geography, utilities, bore path, equipment positions).
// World frame (meters, y up): the bore runs along +X at z = 0, from the entry pit (west, at the rig) to the
// exit pit (east, at the pipe staging area). Every section view looks from +z, so entry is always on the left.
// The street grid is rotated by CITY_ANGLE: the bore passes diagonally beneath the intersection of Main St
// (city z' axis) and Cross St (city x' axis). The explanatory section plane is z = 0.
import * as THREE from "three";

export const BOUNDS = { x: 70, z: 45, depth: 12 };
export const CITY_ANGLE = THREE.MathUtils.degToRad(35);
export const ROAD_HALF = 7; // 4 lanes of 3.5 m
export const SIDEWALK = 3.2;

/** City frame (x', z') to world (x, z) */
export const cityToWorld = (x: number, z: number): [number, number] => {
  const c = Math.cos(CITY_ANGLE);
  const s = Math.sin(CITY_ANGLE);
  return [x * c + z * s, -x * s + z * c];
};
export const worldToCity = (x: number, z: number): [number, number] => {
  const c = Math.cos(CITY_ANGLE);
  const s = Math.sin(CITY_ANGLE);
  return [x * c - z * s, x * s + z * c];
};

// ---------- work areas ----------
/** Rig / entry area (paved lot, fenced) and exit / pipe staging area */
export const RIG_LOT = { x0: -66, x1: -33, z0: -10, z1: 10 };
export const EXIT_LOT = { x0: 33, x1: 69, z0: -7, z1: 7 };
export const ENTRY_PIT = { x0: -40.8, x1: -37.6, z: 1.3, depth: 1.2 };
export const EXIT_PIT = { x0: 37.6, x1: 40.8, z: 1.3, depth: 1.2 };
/** Drill frame: 12 degrees, front (vise) at VISE; the drill string runs straight from it into the entry pit */
export const ENTRY_ANGLE = THREE.MathUtils.degToRad(12);
export const VISE = new THREE.Vector3(-42.9, 0.62, 0);
export const RACK_LENGTH = 8.2;

// ---------- illustrative ground conditions ----------
/** Soil layers, top to bottom. Boundaries undulate gently (illustrative, not a site investigation). */
export const LAYERS = [
  { name: "Pavement and base", top: 0, bottom: -0.45, color: "#8d877e", tex: "bicolour_gravel" },
  { name: "Fill", top: -0.45, bottom: -2.4, color: "#a48a6b", tex: "brown_mud_dry" },
  { name: "Silty clay", top: -2.4, bottom: -6.4, color: "#8a6c52", tex: "brown_mud_02" },
  { name: "Dense sand", top: -6.4, bottom: -12, color: "#9b8566", tex: "aerial_sand" },
];
/** Smooth deterministic undulation of a layer boundary along x (amplitude in meters) */
export const boundaryOffset = (layer: number, x: number) => {
  if (layer === 0) return 0;
  const a = [0, 0.18, 0.45, 0.6][layer] ?? 0.3;
  return a * (Math.sin(x * 0.07 + layer * 1.3) * 0.6 + Math.sin(x * 0.19 + layer * 2.1) * 0.3 + Math.sin(x * 0.41 + layer) * 0.1);
};

// ---------- existing utilities ----------
/**
 * Existing utilities run along the streets (city frame). Colors follow the APWA / Common Ground Alliance
 * uniform color code (blue potable water, green sewer, yellow gas, red electric, orange communications).
 * Depths and sizes are illustrative, not survey data.
 */
export type Utility = { id: string; label: string; color: string; road: "main" | "cross"; offset: number; depth: number; radius: number; kind: "pipe" | "duct" };
export const UTILITIES: Utility[] = [
  { id: "water", label: "Water", color: "#2f6fb6", road: "main", offset: -4.6, depth: -1.7, radius: 0.2, kind: "pipe" },
  { id: "sewer", label: "Sewer", color: "#3f8a52", road: "main", offset: 0.6, depth: -3.0, radius: 0.3, kind: "pipe" },
  { id: "fiber", label: "Fiber", color: "#e07a26", road: "main", offset: 4.8, depth: -0.9, radius: 0.07, kind: "pipe" },
  { id: "electric", label: "Electric", color: "#c43a2f", road: "main", offset: 2.7, depth: -1.3, radius: 0.3, kind: "duct" },
  { id: "gas", label: "Gas", color: "#e0b420", road: "main", offset: -2.4, depth: -1.1, radius: 0.1, kind: "pipe" },
  { id: "water-x", label: "Water", color: "#2f6fb6", road: "cross", offset: 4.6, depth: -1.7, radius: 0.18, kind: "pipe" },
  { id: "sewer-x", label: "Sewer", color: "#3f8a52", road: "cross", offset: -0.6, depth: -2.9, radius: 0.28, kind: "pipe" },
  { id: "gas-x", label: "Gas", color: "#e0b420", road: "cross", offset: 2.4, depth: -1.1, radius: 0.09, kind: "pipe" },
  { id: "fiber-x", label: "Fiber", color: "#e07a26", road: "cross", offset: -4.8, depth: -0.9, radius: 0.07, kind: "pipe" },
];

/** World direction of a utility, and the x where it crosses the bore line (z = 0) */
export const utilityLine = (u: Utility) => {
  const p = u.road === "main" ? cityToWorld(u.offset, 0) : cityToWorld(0, u.offset);
  const d = u.road === "main" ? cityToWorld(0, 1) : cityToWorld(1, 0);
  const t = -p[1] / d[1];
  return { point: p, dir: d, crossX: p[0] + d[0] * t };
};

/** Utility verification: a localized test hole (potholing) exposing the gas main where it crosses the alignment */
export const POTHOLE = (() => {
  const g = UTILITIES.find((u) => u.id === "gas")!;
  const { crossX } = utilityLine(g);
  return { x: crossX, z: -0.95, size: 1.2, depth: 1.45, utility: "gas" };
})();

// ---------- bore ----------
/**
 * Bore path (profile in the x-y plane at z = 0): enters at about 12 degrees from the entry pit, curves
 * gradually to run below the utilities, and rises to the exit pit. Smooth curvature, no corners.
 * Illustrative only: entry angle, depth, separation and bend radius are set by each project's design.
 */
const PROFILE: [number, number][] = [
  [-37.6, -0.62],
  [-32, -1.8],
  [-26, -3.1],
  [-19, -4.3],
  [-10, -4.95],
  [0, -5.1],
  [10, -4.95],
  [19, -4.3],
  [26, -3.1],
  [32, -1.8],
  [37.6, -0.62],
];
export const BORE = new THREE.CatmullRomCurve3(
  PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  false,
  "centripetal",
);
export const BORE_LENGTH = BORE.getLength();
/** Point and tangent at distance fraction u (0 = entry, 1 = exit) */
export const boreAt = (u: number) => {
  const c = Math.min(1, Math.max(0, u));
  const t = BORE.getUtoTmapping(c, 0);
  return { p: BORE.getPoint(t), tan: BORE.getTangent(t) };
};
/** Bore fraction where the path is at world x (monotonic in x) */
export const uAtX = (x: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (boreAt(m).p.x < x) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};

/** Illustrative tool sizes (radius, m). Scaled for readability but kept proportionate to each other. */
export const SIZES = {
  rod: 0.045,
  bit: 0.07,
  pilotHole: 0.075,
  sondeHousing: 0.062,
  conduit: 0.14,
  reamer: 0.205,
  enlargedHole: 0.215,
};

// ---------- buildings (low and mid-rise mixed use) ----------
export type BuildingKind = "brick" | "plaster" | "glass" | "landmark";
export type Building = { x: number; z: number; w: number; d: number; floors: number; kind: BuildingKind; awning: string; tone: string; door: "front" | "side" };
/** City-frame footprints along the street frontages, set back from the sidewalk. Nothing straddles the alignment. */
export const BUILDINGS: Building[] = [
  // landmark: red-brick corner building with a clock tower, behind the crossing (seen in every view)
  { x: 17, z: -17, w: 13, d: 13, floors: 3, kind: "landmark", awning: "#3f5f4f", tone: "#9a4e3c", door: "front" },
  { x: 18.5, z: -34, w: 15, d: 13, floors: 2, kind: "plaster", awning: "#56687a", tone: "#d9d2c4", door: "front" },
  { x: 35, z: -18, w: 14, d: 13, floors: 4, kind: "glass", awning: "#44525e", tone: "#b9bec2", door: "front" },
  { x: -17.5, z: 17.5, w: 13, d: 13, floors: 1, kind: "brick", awning: "#6e3d33", tone: "#8f5a46", door: "front" },
  { x: -35, z: 17, w: 14, d: 12, floors: 1, kind: "plaster", awning: "#5f6f62", tone: "#e1d8c6", door: "front" },
  { x: -18, z: 35, w: 13, d: 14, floors: 2, kind: "brick", awning: "#4e5a66", tone: "#7e5545", door: "front" },
  { x: -14, z: -31, w: 12, d: 10, floors: 1, kind: "plaster", awning: "#7a5a3a", tone: "#cfc6b4", door: "front" },
  { x: 14, z: 31, w: 12, d: 10, floors: 1, kind: "plaster", awning: "#5a4e6a", tone: "#d6cfc2", door: "front" },
  { x: 31, z: 14, w: 10, d: 11, floors: 1, kind: "glass", awning: "#3e4a55", tone: "#c3c6c8", door: "front" },
];
