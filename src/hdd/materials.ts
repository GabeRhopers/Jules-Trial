// Shared materials for the HDD site.
// BOUND_PLANES keep everything inside the diorama block. The explanatory section removes the ground in
// front of the alignment (z > cut) from the soil and utilities only; the surface stays, and the removed
// volume is drawn as a faint translucent "ghost", so it reads as a visualization, not an excavation.
import * as THREE from "three";
import type { Assets, TexName } from "./assets";
import { repeatTex } from "./assets";
import { BOUNDS, boundaryOffset, LAYERS } from "./site";

export const BOUND_PLANES = [
  // a hair outside the block, so the block's own side faces are never clipped (no edge flicker)
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), BOUNDS.x + 0.02),
  new THREE.Plane(new THREE.Vector3(1, 0, 0), BOUNDS.x + 0.02),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), BOUNDS.z + 0.02),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), BOUNDS.z + 0.02),
];

export const CUT_U = { value: BOUNDS.z + 1 };
export const setCut = (z: number) => {
  CUT_U.value = z;
};
/** Discards fragments in front of the section plane (only for soil, utilities and below-grade objects) */
/** Surface plates in front of the section become a faint translucent ghost while a section is shown */
export const applySurfaceGhost = <M extends THREE.Material>(m: M): M => {
  m.transparent = true;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCut = CUT_U;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvCutPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutPos;\nuniform float uCut;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\nif (uCut < 44.0 && vCutPos.z > uCut + 0.0005) gl_FragColor.a *= 0.2;");
  };
  m.customProgramCacheKey = () => "surfaceGhost";
  return m;
};
export const applyCut = <M extends THREE.Material>(m: M): M => {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCut = CUT_U;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvCutPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCutPos;\nuniform float uCut;")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vCutPos.z > uCut + 0.0005 && vCutPos.y < 0.02) discard;");
  };
  m.customProgramCacheKey = () => "cut";
  return m;
};

const cache = new Map<string, THREE.Material>();
type Opts = {
  color: string;
  rough?: number;
  metal?: number;
  clip?: "cut" | "bounds" | "none" | "surface";
  opacity?: number;
  emissive?: string;
  side?: THREE.Side;
  map?: THREE.Texture;
  /** PBR texture set name and repeat (needs assets) */
  tex?: { a: Assets; name: TexName; rx: number; ry: number; normal?: number };
};
/** Physically based material, cached by its options */
export const mat = (o: Opts): THREE.MeshStandardMaterial => {
  const key = JSON.stringify({ ...o, map: o.map?.uuid, tex: o.tex ? [o.tex.name, o.tex.rx, o.tex.ry, o.tex.normal] : undefined });
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
  if (o.tex) {
    const t = repeatTex(o.tex.a.tex[o.tex.name], o.tex.rx, o.tex.ry);
    m.map = t.diff;
    if (t.nor) {
      m.normalMap = t.nor;
      const n = o.tex.normal ?? 0.8;
      m.normalScale = new THREE.Vector2(n, n);
    }
    if (t.rough) m.roughnessMap = t.rough;
  }
  if (o.opacity !== undefined && o.opacity < 1) {
    m.transparent = true;
    m.opacity = o.opacity;
    m.depthWrite = false;
  }
  m.clippingPlanes = o.clip === "none" ? [] : BOUND_PLANES;
  m.clipShadows = true;
  if (o.clip === "cut") applyCut(m);
  if (o.clip === "surface") applySurfaceGhost(m);
  cache.set(key, m);
  return m;
};

/** World-space UVs for a box-like geometry (so textures keep a constant scale on every face) */
export const worldUV = (g: THREE.BufferGeometry, scale: number, offset = new THREE.Vector3()) => {
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset.x;
    const y = pos.getY(i) + offset.y;
    const z = pos.getZ(i) + offset.z;
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    if (ny > nx && ny > Math.abs(nor.getZ(i))) {
      uv[i * 2] = x / scale;
      uv[i * 2 + 1] = z / scale;
    } else if (nx > Math.abs(nor.getZ(i))) {
      uv[i * 2] = z / scale;
      uv[i * 2 + 1] = y / scale;
    } else {
      uv[i * 2] = x / scale;
      uv[i * 2 + 1] = y / scale;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};

/**
 * Ground section texture: each layer filled with its soil photo texture (tinted toward the layer color),
 * with gently undulating boundaries. u = world x / 24 m, v = 0 at the block bottom, 1 at the surface.
 */
let section: THREE.CanvasTexture | null = null;
export const SECTION_U = 24;
export const sectionTexture = (a: Assets) => {
  if (section) return section;
  const W = 2048;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const yToPx = (y: number) => ((0 - y) / BOUNDS.depth) * H;
  const xs = (px: number) => (px / W) * SECTION_U; // world x within one texture tile
  for (let li = 0; li < LAYERS.length; li++) {
    const l = LAYERS[li];
    // region from this layer's top boundary down to the block bottom (deeper layers paint over it next)
    g.save();
    g.beginPath();
    g.moveTo(0, H);
    for (let px = 0; px <= W; px += 8) g.lineTo(px, yToPx(l.top + boundaryOffset(li, xs(px))));
    g.lineTo(W, H);
    g.closePath();
    g.clip();
    const img = a.images[l.tex as TexName];
    const pat = g.createPattern(img, "repeat")!;
    pat.setTransform(new DOMMatrix().scale(0.5, 0.5));
    g.fillStyle = pat;
    g.fillRect(0, 0, W, H);
    // tint toward the layer color for a calm, legible palette
    g.globalAlpha = 0.55;
    g.fillStyle = l.color;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    g.restore();
  }
  // soft boundary lines
  for (let li = 1; li < LAYERS.length; li++) {
    g.beginPath();
    for (let px = 0; px <= W; px += 8) {
      const y = yToPx(LAYERS[li].top + boundaryOffset(li, xs(px)));
      if (px === 0) g.moveTo(px, y);
      else g.lineTo(px, y);
    }
    g.strokeStyle = "rgba(45,32,22,0.35)";
    g.lineWidth = 3;
    g.stroke();
  }
  section = new THREE.CanvasTexture(c);
  section.wrapS = THREE.RepeatWrapping;
  section.colorSpace = THREE.SRGBColorSpace;
  section.anisotropy = 8;
  return section;
};

/** Facade textures per building kind (windows, storefront glass, brick or plaster), drawn once */
const facades = new Map<string, THREE.CanvasTexture>();
export const facadeTexture = (a: Assets, kind: string, tone: string, floors: number) => {
  const key = `${kind}${tone}${floors}`;
  const hit = facades.get(key);
  if (hit) return hit;
  const W = 512;
  const F = 160; // px per floor
  const c = document.createElement("canvas");
  c.width = W;
  c.height = F * floors;
  const g = c.getContext("2d")!;
  // wall material
  const wallImg = kind === "brick" || kind === "landmark" ? a.images.red_brick_03 : a.images.grey_plaster_02;
  const pat = g.createPattern(wallImg, "repeat")!;
  pat.setTransform(new DOMMatrix().scale(kind === "brick" || kind === "landmark" ? 0.35 : 0.5, kind === "brick" || kind === "landmark" ? 0.35 : 0.5));
  g.fillStyle = pat;
  g.fillRect(0, 0, W, c.height);
  g.globalAlpha = kind === "brick" || kind === "landmark" ? 0.25 : 0.45;
  g.fillStyle = tone;
  g.fillRect(0, 0, W, c.height);
  g.globalAlpha = 1;
  for (let f = 0; f < floors; f++) {
    const y0 = f * F;
    if (kind === "glass") {
      // curtain wall bands
      const grad = g.createLinearGradient(0, y0 + 20, 0, y0 + F - 14);
      grad.addColorStop(0, "#6f8696");
      grad.addColorStop(1, "#465a69");
      g.fillStyle = grad;
      g.fillRect(0, y0 + 20, W, F - 40);
      g.fillStyle = "rgba(220,226,230,0.9)";
      for (let x = 0; x < W; x += 64) g.fillRect(x, y0 + 20, 4, F - 40);
    } else {
      // punched windows with sills and lintels
      for (let x = 32; x < W; x += 128) {
        g.fillStyle = "rgba(235,232,225,0.95)";
        g.fillRect(x - 6, y0 + 30, 76, 8);
        g.fillRect(x - 6, y0 + 126, 76, 8);
        const grad = g.createLinearGradient(0, y0 + 38, 0, y0 + 126);
        grad.addColorStop(0, "#5d7180");
        grad.addColorStop(1, "#3c4b57");
        g.fillStyle = grad;
        g.fillRect(x, y0 + 38, 64, 88);
        g.fillStyle = "rgba(240,240,238,0.9)";
        g.fillRect(x + 30, y0 + 38, 4, 88);
        g.fillRect(x, y0 + 80, 64, 3);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  facades.set(key, t);
  return t;
};

/** Storefront: glazing, mullions and an entrance door (ground floor) */
let storefront: THREE.CanvasTexture | null = null;
export const storefrontTexture = () => {
  if (storefront) return storefront;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2f3438";
  g.fillRect(0, 0, 512, 160);
  const grad = g.createLinearGradient(0, 10, 0, 160);
  grad.addColorStop(0, "#7d93a1");
  grad.addColorStop(1, "#44525c");
  g.fillStyle = grad;
  g.fillRect(8, 12, 496, 140);
  g.fillStyle = "#2f3438";
  for (let x = 8; x < 512; x += 124) g.fillRect(x, 12, 6, 140);
  // door
  g.fillStyle = "#26292c";
  g.fillRect(226, 26, 60, 126);
  g.fillStyle = "#6f8593";
  g.fillRect(232, 32, 48, 116);
  g.fillStyle = "#c9c9c4";
  g.fillRect(270, 86, 4, 16);
  storefront = new THREE.CanvasTexture(c);
  storefront.colorSpace = THREE.SRGBColorSpace;
  storefront.wrapS = THREE.RepeatWrapping;
  return storefront;
};
