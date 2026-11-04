// Application example (separate site): a stream with sloped banks, a channel bed, water and riparian
// vegetation. Entry and exit work areas sit outside the stream corridor; the bore passes beneath the
// channel on a smooth profile with the pipe installed. Section along z = 0, ground in front shown as a
// faint ghost (same convention as the urban site). Illustrative: no distances or depths are stated.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { Assets } from "./assets";
import type { Pose } from "./camera";
import { Tree } from "./city";
import { mat } from "./materials";
import { Box } from "./rig";

const W = 64; // x extent
const D = 26; // z extent (back half 13 m)
const DEPTH = 10;
const BANK_TOP = 9.5;
const BED = 3.6;
const BED_Y = -2.1;
const WATER_Y = -1.05;

/** Ground surface profile across the stream (x -> y) */
const surfaceY = (x: number) => {
  const ax = Math.abs(x);
  if (ax >= BANK_TOP) return 0;
  if (ax <= BED) return BED_Y - 0.15 * (1 - (ax / BED) ** 2);
  const k = (ax - BED) / (BANK_TOP - BED);
  return BED_Y * (1 - (3 * k * k - 2 * k * k * k));
};

const PATH = new THREE.CatmullRomCurve3(
  [
    [-27, -0.4],
    [-22, -1.5],
    [-15, -3.6],
    [-7, -5.3],
    [0, -5.7],
    [7, -5.3],
    [15, -3.6],
    [22, -1.5],
    [27, -0.4],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
  false,
  "centripetal",
);

export const CREEK_ANCHORS = {
  channel: [0, WATER_Y + 0.1, -2] as [number, number, number],
  workArea: [-29, 0.4, -3] as [number, number, number],
  conduit: [4, -5.5, 0.2] as [number, number, number],
};

const Cam: React.FC<{ pose: Pose; a: Assets }> = ({ pose, a }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  if (scene.environment !== a.hdri) {
    scene.environment = a.hdri;
    scene.environmentIntensity = 0.55;
  }
  camera.position.set(...pose.pos);
  camera.fov = pose.fov;
  camera.lookAt(...pose.target);
  camera.updateProjectionMatrix();
  return null;
};

/** Surface texture across x: grass on the floodplain, sand and stone on the banks, pebbles on the bed */
const surfaceTexture = (a: Assets) => {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 512;
  const g = c.getContext("2d")!;
  const xToPx = (x: number) => ((x + W / 2) / W) * 2048;
  const fill = (x0: number, x1: number, img: HTMLImageElement, tint: string, alpha: number, scale: number) => {
    g.save();
    g.beginPath();
    g.rect(xToPx(x0), 0, xToPx(x1) - xToPx(x0), 512);
    g.clip();
    const p = g.createPattern(img, "repeat")!;
    p.setTransform(new DOMMatrix().scale(scale, scale));
    g.fillStyle = p;
    g.fillRect(0, 0, 2048, 512);
    g.globalAlpha = alpha;
    g.fillStyle = tint;
    g.fillRect(0, 0, 2048, 512);
    g.restore();
  };
  fill(-W / 2, -BANK_TOP + 0.6, a.images.grass_path_2, "#9fb07a", 0.35, 0.35);
  fill(BANK_TOP - 0.6, W / 2, a.images.grass_path_2, "#9fb07a", 0.35, 0.35);
  fill(-BANK_TOP + 0.6, -BED, a.images.coast_sand_rocks_02, "#a99677", 0.2, 0.3);
  fill(BED, BANK_TOP - 0.6, a.images.coast_sand_rocks_02, "#a99677", 0.2, 0.3);
  fill(-BED, BED, a.images.clean_pebbles, "#8d8577", 0.2, 0.25);
  // gravel work pads outside the stream corridor
  fill(-W / 2, -24.5, a.images.bicolour_gravel, "#c0b7a6", 0.25, 0.3);
  fill(24.5, W / 2, a.images.bicolour_gravel, "#c0b7a6", 0.25, 0.3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const CreekWorld: React.FC<{ a: Assets; t: number }> = ({ a, t }) => {
  const { ground, ghost, water, waterGhost } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, -DEPTH);
    shape.lineTo(W / 2, -DEPTH);
    for (let x = W / 2; x >= -W / 2; x -= 0.5) shape.lineTo(x, surfaceY(x));
    shape.closePath();
    const mk = (z0: number, z1: number) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, steps: 1 });
      g.translate(0, 0, z0);
      // u from x across the whole site, v from z (surface) or y (section)
      g.computeVertexNormals();
      const pos = g.attributes.position;
      const nor = g.attributes.normal;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) + W / 2) / W;
        uv[i * 2 + 1] = Math.abs(nor.getZ(i)) > 0.5 ? (pos.getY(i) + DEPTH) / DEPTH : (pos.getZ(i) + D / 2) / D;
      }
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      return g;
    };
    const ws = new THREE.Shape();
    ws.moveTo(-BANK_TOP, WATER_Y);
    for (let x = -BANK_TOP; x <= BANK_TOP; x += 0.25) ws.lineTo(x, Math.min(WATER_Y, surfaceY(x)));
    ws.lineTo(BANK_TOP, WATER_Y);
    ws.closePath();
    const wmk = (z0: number, z1: number) => {
      const g = new THREE.ExtrudeGeometry(ws, { depth: z1 - z0, bevelEnabled: false });
      g.translate(0, 0, z0);
      return g;
    };
    return { ground: mk(-D / 2, 0), ghost: mk(0, D / 2), water: wmk(-D / 2, 0), waterGhost: wmk(0, D / 2) };
  }, []);
  const surf = useMemo(() => surfaceTexture(a), [a]);
  const section = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d")!;
    const bands: [number, number, string, HTMLImageElement][] = [
      [0, 0.22, "#8a6c52", a.images.brown_mud_02],
      [0.22, 0.62, "#9b8566", a.images.aerial_sand],
      [0.62, 1, "#7f6a55", a.images.brown_mud_dry],
    ];
    for (const [v0, v1, col, img] of bands) {
      const p = g.createPattern(img, "repeat")!;
      p.setTransform(new DOMMatrix().scale(0.4, 0.4));
      g.fillStyle = p;
      g.fillRect(0, v0 * 512, 1024, (v1 - v0) * 512 + 1);
      g.globalAlpha = 0.5;
      g.fillStyle = col;
      g.fillRect(0, v0 * 512, 1024, (v1 - v0) * 512 + 1);
      g.globalAlpha = 1;
    }
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, [a]);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ map: section, roughness: 1 }), [section]);
  // the extrusion's own caps are hidden: the front is drawn by the section face (which has the bore opening)
  const noCap = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), []);
  const sideMat = useMemo(() => new THREE.MeshStandardMaterial({ map: surf, roughness: 0.95 }), [surf]);
  const ghostMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#cdbfa8", transparent: true, opacity: 0.14, depthWrite: false }), []);
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#56747e", roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.78 }), []);
  const waterGhostMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6f8f98", transparent: true, opacity: 0.18, depthWrite: false }), []);
  const pipe = useMemo(() => new THREE.TubeGeometry(PATH, 260, 0.14, 14, false), []);
  const groove = useMemo(() => {
    const n = 220;
    const seg = 10;
    const r = 0.22;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const p = PATH.getPointAt(i / n);
      const tan = PATH.getTangentAt(i / n);
      for (let k = 0; k <= seg; k++) {
        const ang = Math.PI / 2 + (Math.PI * k) / seg;
        pos.push(p.x - tan.y * r * Math.sin(ang), p.y + tan.x * r * Math.sin(ang), Math.cos(ang) * r);
      }
    }
    for (let i = 0; i < n; i++)
      for (let k = 0; k < seg; k++) {
        const a0 = i * (seg + 1) + k;
        const b0 = a0 + seg + 1;
        idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  // the section face needs an opening where the bore is; draw the face separately with that hole
  const face = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-W / 2, -DEPTH);
    s.lineTo(W / 2, -DEPTH);
    for (let x = W / 2; x >= -W / 2; x -= 0.5) s.lineTo(x, surfaceY(x));
    s.closePath();
    const top: THREE.Vector2[] = [];
    const bot: THREE.Vector2[] = [];
    for (let i = 2; i <= 218; i++) {
      const p = PATH.getPointAt(i / 220);
      const tan = PATH.getTangentAt(i / 220);
      top.push(new THREE.Vector2(p.x - tan.y * 0.22, p.y + tan.x * 0.22));
      bot.push(new THREE.Vector2(p.x + tan.y * 0.22, p.y - tan.x * 0.22));
    }
    s.holes.push(new THREE.Path([...top, ...bot.reverse()]));
    const g = new THREE.ShapeGeometry(s, 4);
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + W / 2) / W;
      uv[i * 2 + 1] = (pos.getY(i) + DEPTH) / DEPTH;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, []);
  const vegetation = useMemo(() => {
    let seed = 9;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const grass: [number, number, number][] = [];
    const reeds: [number, number, number, number][] = [];
    const trees: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      grass.push([side * (BED + 1.0 + rnd() * 6.5), -D / 2 + 1 + rnd() * (D / 2 - 2.2), rnd() * 6]);
    }
    for (let i = 0; i < 140; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const x = side * (BED - 0.2 + rnd() * 2.2);
      reeds.push([x, -D / 2 + 0.5 + rnd() * (D / 2 - 1), 0.7 + rnd() * 0.9, rnd()]);
    }
    for (const [x, z] of [
      [-13, -8],
      [-16.5, -3.5],
      [12.5, -9],
      [16, -4],
      [-11, -11.2],
      [14, -11.5],
    ])
      trees.push([x, z, rnd()]);
    return { grass, reeds, trees };
  }, []);
  const fence = mat({ color: "#c8cccf", rough: 0.4, metal: 0.6, clip: "none", opacity: 0.3 });
  const silt = mat({ color: "#2b2b2b", rough: 0.9, clip: "none" });
  const dark = mat({ color: "#33383d", rough: 0.55, clip: "none" });
  const body = mat({ color: "#d9dbd8", rough: 0.5, clip: "none" });
  const ripple = Math.sin(t * 0.8) * 0.02;
  return (
    <group>
      <mesh geometry={ground} material={[noCap, sideMat]} receiveShadow castShadow />
      <mesh geometry={face} position={[0, 0, 0.002]} material={capMat} receiveShadow />
      <mesh geometry={groove} material={mat({ color: "#8a7a64", rough: 0.6, clip: "none", side: THREE.DoubleSide })} />
      <mesh geometry={pipe} material={mat({ color: "#2b2d30", rough: 0.42, clip: "none" })} castShadow />
      <mesh geometry={ghost} material={ghostMat} renderOrder={2} />
      <mesh geometry={water} position={[0, ripple, 0]} material={waterMat} />
      <mesh geometry={waterGhost} material={waterGhostMat} renderOrder={3} />
      {vegetation.grass.map(([x, z, r], i) => (
        <primitive key={`g${i}`} object={a.models.grass_medium_01.clone(true)} position={[x, surfaceY(x), z]} rotation={[0, r, 0]} scale={1.6} />
      ))}
      {vegetation.reeds.map(([x, z, h, k], i) => (
        <mesh key={`r${i}`} position={[x, surfaceY(x) + h / 2, z]} rotation={[0, 0, (k - 0.5) * 0.25]} castShadow material={mat({ color: k > 0.5 ? "#7d8a52" : "#93915c", rough: 0.9, clip: "none" })}>
          <cylinderGeometry args={[0.018, 0.03, h, 5]} />
        </mesh>
      ))}
      {vegetation.trees.map(([x, z, k], i) => (
        <group key={`t${i}`} position={[x, surfaceY(x), z]}>
          <Tree a={a} k={i + 5} scale={0.85 + k * 0.3} />
        </group>
      ))}
      {/* silt fence along the top of each bank (between the work areas and the stream) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box p={[s * (BANK_TOP + 1.2), 0.4, -D / 4]} s={[0.04, 0.8, D / 2 - 1]} m={silt} shadow={false} />
        </group>
      ))}
      {/* entry work area (left) with a compact rig and fluid unit, exit work area (right) with staged pipe */}
      <group position={[-29, 0, -2.4]}>
        <Box p={[-2, 0.5, 0]} s={[5.5, 0.9, 2.0]} m={body} />
        <Box p={[0.5, 0.9, 0]} s={[4.2, 0.3, 0.5]} m={dark} r={[0, 0, -0.2]} />
        <Box p={[-1.5, 0.9, -3.4]} s={[4, 1.8, 2]} m={body} />
      </group>
      {[-1, 1].map((s) => (
        <Box key={`wf${s}`} p={[s * 24.6, 0.9, -D / 4]} s={[0.03, 1.8, D / 2 - 1]} m={fence} shadow={false} />
      ))}
      <mesh geometry={new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(27, -0.4, 0), new THREE.Vector3(28.5, 0.05, 0), new THREE.Vector3(30.5, 0.45, 0), new THREE.Vector3(34, 0.45, 0)]), 40, 0.14, 12)} material={mat({ color: "#2b2d30", rough: 0.42, clip: "none" })} castShadow />
    </group>
  );
};

export const CreekScene: React.FC<{ width: number; height: number; pose: Pose; a: Assets; t: number }> = ({ width, height, pose, a, t }) => (
  <ThreeCanvas width={width} height={height} shadows camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 600 }} onCreated={({ gl }) => (gl.toneMapping = THREE.ACESFilmicToneMapping)}>
    <Cam pose={pose} a={a} />
    <color attach="background" args={["#e7eaed"]} />
    <hemisphereLight args={["#eef3f8", "#8a7a66", 0.45]} />
    <directionalLight position={[22, 34, 26]} intensity={2.3} color="#fff4e4" castShadow shadow-mapSize-width={4096} shadow-mapSize-height={4096} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-bias={-0.0003} shadow-normalBias={0.04} />
    <mesh position={[0, -DEPTH - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[600, 600]} />
      <meshStandardMaterial color="#dfe2e5" roughness={1} />
    </mesh>
    <CreekWorld a={a} t={t} />
  </ThreeCanvas>
);
