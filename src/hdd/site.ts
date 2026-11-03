// One consistent HDD site, shared by every shot (geography, utilities, bore path, equipment positions).
// World frame (meters, y up): the bore runs along +X at z = 0, from the entrance pit (west, next to the rig)
// to the exit pit (east). The city grid is rotated by CITY_ANGLE, so the bore crosses diagonally beneath the
// intersection of Main St (city z' axis) and Cross St (city x' axis). The cutaway plane is z = 0.
import * as THREE from "three";

export const BOUNDS = { x: 60, z: 40, depth: 10 };
export const CITY_ANGLE = THREE.MathUtils.degToRad(35);
export const ROAD_HALF = 7; // 4 lanes of 3.5 m
export const SIDEWALK = 3;

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

export const ENTRY_PIT = { x0: -40.6, x1: -38, z: 0.9, depth: 1.1 };
export const EXIT_PIT = { x0: 38, x1: 40.6, z: 0.9, depth: 1.1 };
/** Drill rack: 12 degrees, its front (vise) at VISE; the drill string runs straight from it into the entrance pit */
export const ENTRY_ANGLE = THREE.MathUtils.degToRad(12);
export const VISE = new THREE.Vector3(-42.6, 0.45, 0);
export const RACK_LENGTH = 7.5;

// Soil layers (top to bottom). Muted, natural tones.
export const LAYERS = [
  { name: "Pavement base", top: 0, bottom: -0.4, color: "#8f877c" },
  { name: "Fill", top: -0.4, bottom: -2.6, color: "#a88d6c" },
  { name: "Clay", top: -2.6, bottom: -6.2, color: "#8e6e53" },
  { name: "Dense silty sand", top: -6.2, bottom: -10, color: "#796650" },
];

/**
 * Existing utilities: run along the roads (city frame). Colors follow the APWA / Common Ground Alliance
 * uniform color code (blue potable water, green sewer, yellow gas, red electric, orange communications).
 * Depths are illustrative, not survey data.
 */
export type Utility = { id: string; label: string; color: string; road: "main" | "cross"; offset: number; depth: number; radius: number; kind: "pipe" | "duct" };
export const UTILITIES: Utility[] = [
  { id: "water", label: "Water", color: "#2f6fb6", road: "main", offset: -4.6, depth: -1.7, radius: 0.22, kind: "pipe" },
  { id: "sewer", label: "Sewer", color: "#3f8a52", road: "main", offset: 0.6, depth: -3.1, radius: 0.38, kind: "pipe" },
  { id: "fiber", label: "Fiber", color: "#e07a26", road: "main", offset: 4.8, depth: -0.9, radius: 0.09, kind: "pipe" },
  { id: "electric", label: "Electric", color: "#c43a2f", road: "main", offset: 2.7, depth: -1.3, radius: 0.32, kind: "duct" },
  { id: "gas", label: "Gas", color: "#e0b420", road: "main", offset: -2.4, depth: -1.1, radius: 0.13, kind: "pipe" },
  { id: "water-x", label: "Water", color: "#2f6fb6", road: "cross", offset: 4.6, depth: -1.7, radius: 0.2, kind: "pipe" },
  { id: "sewer-x", label: "Sewer", color: "#3f8a52", road: "cross", offset: -0.6, depth: -3.0, radius: 0.34, kind: "pipe" },
  { id: "gas-x", label: "Gas", color: "#e0b420", road: "cross", offset: 2.4, depth: -1.1, radius: 0.12, kind: "pipe" },
  { id: "fiber-x", label: "Fiber", color: "#e07a26", road: "cross", offset: -4.8, depth: -0.9, radius: 0.09, kind: "pipe" },
];

/** World direction of a utility, and the x where it crosses the bore line (z = 0) */
export const utilityLine = (u: Utility) => {
  // A point on the utility (city frame) and its direction
  const p = u.road === "main" ? cityToWorld(u.offset, 0) : cityToWorld(0, u.offset);
  const d = u.road === "main" ? cityToWorld(0, 1) : cityToWorld(1, 0);
  const t = -p[1] / d[1];
  return { point: p, dir: d, crossX: p[0] + d[0] * t };
};

/**
 * Bore path (profile in the x-y plane at z = 0): enters at about 12 degrees from the entrance pit, levels
 * out below the deepest utility, and rises to the exit pit. Smooth curvature, no kinks.
 */
const PROFILE: [number, number][] = [
  [-38, -0.53],
  [-33, -1.6],
  [-27, -2.95],
  [-20, -4.2],
  [-12, -4.85],
  [0, -5.0],
  [12, -4.85],
  [20, -4.2],
  [27, -2.95],
  [33, -1.6],
  [38, -0.53],
];
export const BORE = new THREE.CatmullRomCurve3(
  PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  false,
  "centripetal",
);
export const BORE_LENGTH = BORE.getLength();
/** Point and tangent at distance fraction u (0 = entrance, 1 = exit) */
export const boreAt = (u: number) => {
  const c = Math.min(1, Math.max(0, u));
  const t = BORE.getUtoTmapping(c, 0);
  return { p: BORE.getPoint(t), tan: BORE.getTangent(t) };
};
