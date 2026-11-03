// Shared materials and clipping planes for the HDD site.
// BOUND_PLANES keep everything inside the diorama block; CUT is the cutaway plane (keeps z <= CUT.constant).
import * as THREE from "three";
import { BOUNDS, LAYERS } from "./site";

export const BOUND_PLANES = [
  // a hair outside the block, so the block's own side faces are never clipped (no edge flicker)
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), BOUNDS.x + 0.02),
  new THREE.Plane(new THREE.Vector3(1, 0, 0), BOUNDS.x + 0.02),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), BOUNDS.z + 0.02),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), BOUNDS.z + 0.02),
];
/**
 * Cutaway: removes the block in front of the bore (z > CUT.z) between the two pits (CUT.x0 < x < CUT.x1),
 * like a trench section, so the work lots and rig stay on solid ground. Applied in the shader.
 */
export const CUT_X = 38;
export const CUT_U = { value: new THREE.Vector3(BOUNDS.z, -CUT_X, CUT_X) };
export const setCut = (z: number) => {
  CUT_U.value.x = z;
};
export const applyCut = <M extends THREE.Material>(m: M): M => {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCut = CUT_U;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvCutPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutPos;\nuniform vec3 uCut;")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vCutPos.z > uCut.x + 0.0005 && vCutPos.x > uCut.y && vCutPos.x < uCut.z) discard;");
  };
  m.customProgramCacheKey = () => "cut";
  return m;
};

const cache = new Map<string, THREE.Material>();
type Opts = { color: string; rough?: number; metal?: number; clip?: "all" | "bounds" | "none"; opacity?: number; emissive?: string; side?: THREE.Side; map?: THREE.Texture };
/** Physically based material, cached by its options */
export const mat = (o: Opts): THREE.MeshStandardMaterial => {
  const key = JSON.stringify({ ...o, map: o.map?.uuid });
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({
    color: o.color,
    roughness: o.rough ?? 0.85,
    metalness: o.metal ?? 0,
    side: o.side ?? THREE.FrontSide,
    map: o.map,
    emissive: o.emissive ? new THREE.Color(o.emissive) : undefined,
    emissiveIntensity: o.emissive ? 1 : 0,
  });
  if (o.opacity !== undefined && o.opacity < 1) {
    m.transparent = true;
    m.opacity = o.opacity;
    m.depthWrite = false;
  }
  m.clippingPlanes = o.clip === "none" ? [] : BOUND_PLANES;
  m.clipShadows = true;
  if (o.clip === undefined || o.clip === "all") applyCut(m);
  cache.set(key, m);
  return m;
};

/** Window pattern for building facades (glass bands and spandrels), made once */
let facade: THREE.CanvasTexture | null = null;
export const facadeTexture = () => {
  if (facade) return facade;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c9ccce";
  g.fillRect(0, 0, 256, 256);
  // one floor = 64 px: spandrel then glass band with mullions
  for (let f = 0; f < 4; f++) {
    const y = f * 64;
    const grad = g.createLinearGradient(0, y + 18, 0, y + 60);
    grad.addColorStop(0, "#5f7486");
    grad.addColorStop(1, "#3e4f5e");
    g.fillStyle = grad;
    g.fillRect(0, y + 18, 256, 42);
    g.fillStyle = "#b9bcbf";
    for (let x = 0; x < 256; x += 32) g.fillRect(x, y + 18, 3, 42);
  }
  facade = new THREE.CanvasTexture(c);
  facade.wrapS = THREE.RepeatWrapping;
  facade.wrapT = THREE.RepeatWrapping;
  facade.colorSpace = THREE.SRGBColorSpace;
  facade.anisotropy = 8;
  return facade;
};

/** Subtle horizontal strata for the soil section faces */
let strata: THREE.CanvasTexture | null = null;
export const strataTexture = () => {
  if (strata) return strata;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 512, 128);
  // deterministic speckle and faint bedding lines
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    const v = 200 + Math.floor(rnd() * 55);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rnd() * 512, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 1.5);
  }
  for (let i = 0; i < 9; i++) {
    g.fillStyle = "rgba(0,0,0,0.05)";
    g.fillRect(0, rnd() * 128, 512, 1);
  }
  strata = new THREE.CanvasTexture(c);
  strata.wrapS = THREE.RepeatWrapping;
  strata.wrapT = THREE.RepeatWrapping;
  strata.colorSpace = THREE.SRGBColorSpace;
  return strata;
};

/** Section face texture: the soil layers as bands (v = 0 at the block bottom, 1 at the surface) with speckle */
let section: THREE.CanvasTexture | null = null;
export const sectionTexture = () => {
  if (section) return section;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const g = c.getContext("2d")!;
  const yToPx = (y: number) => ((0 - y) / BOUNDS.depth) * 1024;
  for (const l of LAYERS) {
    const col = new THREE.Color(l.color).multiplyScalar(1.06);
    g.fillStyle = `#${col.getHexString()}`;
    g.fillRect(0, yToPx(l.top), 512, yToPx(l.bottom) - yToPx(l.top) + 1);
    // soft transition line between layers
    g.fillStyle = "rgba(40,28,18,0.18)";
    g.fillRect(0, yToPx(l.bottom) - 2, 512, 3);
  }
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14000; i++) {
    const a = rnd() < 0.5;
    g.fillStyle = a ? "rgba(255,245,230,0.10)" : "rgba(30,20,10,0.10)";
    g.fillRect(rnd() * 512, rnd() * 1024, 1 + rnd() * 2.5, 1 + rnd() * 2);
  }
  section = new THREE.CanvasTexture(c);
  section.wrapS = THREE.RepeatWrapping;
  section.colorSpace = THREE.SRGBColorSpace;
  section.anisotropy = 8;
  return section;
};
