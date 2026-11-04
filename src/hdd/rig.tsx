// Drilling equipment on the rig / entry lot: a generic tracked mid-size HDD rig (no branding, no stated
// capacities; to be matched to DTI's own rig from reference photos), the drilling fluid mixing and
// recycling system, a support truck, the rod trailer and the hoses that connect them.
// Layout: the drill frame points +x toward the entry pit at the entry angle; everything sits at z < 0 or on
// the rig's own footprint so the section plane (z = 0) never cuts through equipment.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Assets } from "./assets";
import { mat } from "./materials";
import { ENTRY_ANGLE, ENTRY_PIT, RACK_LENGTH, VISE } from "./site";

export const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; m: THREE.Material; shadow?: boolean; r?: [number, number, number] }> = ({ p, s, m, shadow = true, r = [0, 0, 0] }) => (
  <mesh position={p} rotation={r} material={m} castShadow={shadow} receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);
/** Many static boxes with one material, merged into a single mesh (far fewer draw calls) */
export const MergedBoxes: React.FC<{ boxes: { p: [number, number, number]; s: [number, number, number]; ry?: number }[]; m: THREE.Material; shadow?: boolean }> = ({ boxes, m, shadow = false }) => {
  const g = useMemo(() => {
    if (!boxes.length) return null;
    const parts = boxes.map(({ p, s, ry }) => {
      const b = new THREE.BoxGeometry(...s);
      if (ry) b.rotateY(ry);
      b.translate(...p);
      return b;
    });
    return mergeGeometries(parts, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(boxes)]);
  if (!g) return null;
  return <mesh geometry={g} material={m} castShadow={shadow} receiveShadow />;
};
export const Cyl: React.FC<{ p: [number, number, number]; r: number; h: number; m: THREE.Material; rot?: [number, number, number]; seg?: number; r2?: number }> = ({ p, r, h, m, rot = [0, 0, 0], seg = 20, r2 }) => (
  <mesh position={p} rotation={rot} material={m} castShadow receiveShadow>
    <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
  </mesh>
);

/** Point on the drill frame: s = 0 at the vise, s = RACK_LENGTH at the rear */
export const rackPoint = (s: number) => new THREE.Vector3(VISE.x - Math.cos(ENTRY_ANGLE) * s, VISE.y + Math.sin(ENTRY_ANGLE) * s, 0);
/** Height of the drill string axis above the frame centerline */
export const SPINDLE_UP = 0.42;
/** Point on the drill string axis at frame position s */
export const spindlePoint = (s: number) => {
  const p = rackPoint(s);
  return new THREE.Vector3(p.x - Math.sin(ENTRY_ANGLE) * SPINDLE_UP, p.y + Math.cos(ENTRY_ANGLE) * SPINDLE_UP, 0);
};

const C = {
  body: "#d9dbd8",
  dark: "#33383d",
  steel: "#8d939a",
  rubber: "#1c1d1f",
  trim: "#d8a52a", // safety yellow on guards and rails only
};

/** Rubber track with drive sprocket, idler and rollers */
const Track: React.FC<{ x: number; z: number; len: number }> = ({ x, z, len }) => {
  const rubber = mat({ color: C.rubber, rough: 0.95, clip: "none" });
  const steel = mat({ color: C.steel, rough: 0.45, metal: 0.6, clip: "none" });
  const h = 0.62;
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, h / 2, 0]} s={[len - h, h, 0.5]} m={rubber} />
      {[-1, 1].map((s) => (
        <Cyl key={s} p={[(s * (len - h)) / 2, h / 2, 0]} r={h / 2} h={0.5} m={rubber} rot={[Math.PI / 2, 0, 0]} seg={24} />
      ))}
      {[-1, 1].map((s) => (
        <Cyl key={`h${s}`} p={[(s * (len - h)) / 2, h / 2, z > 0 ? 0.26 : -0.26]} r={0.22} h={0.04} m={steel} rot={[Math.PI / 2, 0, 0]} />
      ))}
      {[-0.32, 0, 0.32].map((k) => (
        <Cyl key={k} p={[k * (len - h), 0.18, z > 0 ? 0.26 : -0.26]} r={0.1} h={0.04} m={steel} rot={[Math.PI / 2, 0, 0]} />
      ))}
      {/* tread lugs on top run */}
      <MergedBoxes boxes={Array.from({ length: Math.floor(len / 0.22) }).map((_, i) => ({ p: [-len / 2 + 0.4 + i * 0.22, h + 0.012, 0] as [number, number, number], s: [0.08, 0.025, 0.5] as [number, number, number] }))} m={rubber} />
    </group>
  );
};

/**
 * Generic black-and-yellow tracked HDD rig, modeled on the layout of DTI's rig in the reference photos
 * (no logos or brand names): black rod-box enclosure along the drill frame, enclosed yellow cab at the
 * rear (z < 0 side), two yellow stake-down towers at the front, yellow vise and wrench, black tracks,
 * hoses arching from the enclosure to the carriage.
 */
export const OPERATOR_SEAT: [number, number, number] = [-49.9, 1.35, -1.0];
export const DrillRig: React.FC<{ carriage: number; spin: number; decal?: THREE.Texture }> = ({ carriage, spin, decal }) => {
  const black = mat({ color: "#1e2023", rough: 0.42, metal: 0.25, clip: "none" });
  const black2 = mat({ color: "#2a2d31", rough: 0.55, metal: 0.2, clip: "none" });
  const yellow = mat({ color: "#e3ae17", rough: 0.4, metal: 0.15, clip: "none" });
  const steel = mat({ color: C.steel, rough: 0.35, metal: 0.75, clip: "none" });
  const glass = mat({ color: "#2c3c46", rough: 0.05, metal: 0.5, clip: "none", opacity: 0.72 });
  const red = mat({ color: "#b8312a", rough: 0.5, clip: "none" });
  const mid = rackPoint(RACK_LENGTH / 2);
  const car = rackPoint(carriage);
  const chassisX = mid.x - 0.4;
  return (
    <group>
      {/* undercarriage */}
      <Track x={chassisX} z={0.95} len={6.0} />
      <Track x={chassisX} z={-0.95} len={6.0} />
      <Box p={[chassisX, 0.78, 0]} s={[5.8, 0.36, 1.5]} m={black2} />
      {/* drill frame (inside) and the long black rod-box enclosure on the +z side, at the entry angle */}
      <group position={[mid.x, mid.y, 0]} rotation={[0, 0, -ENTRY_ANGLE]}>
        <Box p={[0, 0, 0]} s={[RACK_LENGTH, 0.34, 0.6]} m={black2} />
        <Box p={[0, 0.2, 0.22]} s={[RACK_LENGTH, 0.05, 0.05]} m={steel} />
        <Box p={[0, 0.2, -0.22]} s={[RACK_LENGTH, 0.05, 0.05]} m={steel} />
        <Box p={[-0.3, 0.42, 0.78]} s={[RACK_LENGTH - 1.2, 1.15, 0.62]} m={black} />
        <Box p={[-0.3, 1.01, 0.78]} s={[RACK_LENGTH - 1.1, 0.04, 0.66]} m={black2} shadow={false} />
        {/* thin yellow and red accent lines low on the enclosure */}
        <Box p={[-0.3, -0.1, 1.095]} s={[RACK_LENGTH - 1.3, 0.04, 0.01]} m={yellow} shadow={false} />
        <Box p={[-1.8, -0.02, 1.095]} s={[1.6, 0.04, 0.01]} m={red} shadow={false} />
        {/* DTI's approved logo decal on the enclosure (as on DTI's own rig) */}
        {decal ? (
          <mesh position={[1.3, 0.5, 1.092]}>
            <planeGeometry args={[2.4, 2.4 * (384 / 1784)]} />
            <meshStandardMaterial map={decal} transparent roughness={0.5} depthWrite={false} />
          </mesh>
        ) : null}
      </group>
      {/* carriage (rotation head) on the frame: yellow gearbox, black motors, mud swivel */}
      <group position={[car.x, car.y, 0]} rotation={[0, 0, -ENTRY_ANGLE]}>
        <Box p={[0, 0.55, -0.05]} s={[0.9, 0.62, 0.78]} m={yellow} />
        <Cyl p={[-0.1, 0.62, -0.55]} r={0.14} h={0.3} m={black} rot={[Math.PI / 2, 0, 0]} />
        <group position={[0.5, SPINDLE_UP, 0]} rotation={[spin, 0, 0]}>
          <Cyl p={[0.1, 0, 0]} r={0.09} h={0.25} m={steel} rot={[0, 0, Math.PI / 2]} />
          <Box p={[0.1, 0.09, 0]} s={[0.22, 0.02, 0.03]} m={black} shadow={false} />
        </group>
        <Cyl p={[-0.35, 0.95, -0.05]} r={0.08} h={0.22} m={steel} />
      </group>
      {/* hoses arching from the enclosure to the carriage */}
      <Hose pts={[[mid.x - 2.6, mid.y + 1.6, 0.6], [mid.x - 1.6, mid.y + 2.4, 0.3], [car.x - 0.3, car.y + 1.8, 0.0], [car.x - 0.2, car.y + 1.0, -0.05]]} r={0.05} />
      <Hose pts={[[mid.x - 2.9, mid.y + 1.6, 0.4], [mid.x - 1.9, mid.y + 2.6, 0.0], [car.x - 0.5, car.y + 2.0, -0.3], [car.x - 0.4, car.y + 1.0, -0.4]]} r={0.04} />
      {/* rear engine module and the enclosed yellow cab on the -z side */}
      <group position={[chassisX - 2.2, 1.0, 0]}>
        <Box p={[0, 0.75, 0.55]} s={[1.9, 1.3, 1.1]} m={black} />
        {Array.from({ length: 7 }).map((_, i) => (
          <Box key={i} p={[-0.7 + i * 0.22, 0.85, 1.11]} s={[0.1, 0.7, 0.02]} m={black2} shadow={false} />
        ))}
        <Cyl p={[0.5, 1.6, 0.7]} r={0.06} h={0.45} m={black2} />
      </group>
      <group position={[OPERATOR_SEAT[0], 1.0, OPERATOR_SEAT[2]]}>
        {/* cab shell with large windows; operator seated inside (see World) */}
        <Box p={[0, 0.12, 0]} s={[1.7, 0.24, 1.3]} m={yellow} />
        {/* solid yellow lower panels, tinted glass above */}
        {[
          [0, 0.5, 0.64, 1.7, 0.55, 0.05],
          [0, 0.5, -0.64, 1.7, 0.55, 0.05],
          [0.84, 0.5, 0, 0.05, 0.55, 1.3],
          [-0.84, 0.5, 0, 0.05, 0.55, 1.3],
        ].map(([x, y, z, w, h, d], i) => (
          <Box key={`p${i}`} p={[x, y, z]} s={[w, h, d]} m={yellow} />
        ))}
        {[
          [0, 1.33, 0.64, 1.7, 1.15, 0.03],
          [0, 1.33, -0.64, 1.7, 1.15, 0.03],
          [0.84, 1.33, 0, 0.03, 1.15, 1.3],
          [-0.84, 1.33, 0, 0.03, 1.15, 1.3],
        ].map(([x, y, z, w, h, d], i) => (
          <Box key={i} p={[x, y, z]} s={[w, h, d]} m={glass} shadow={false} />
        ))}
        {[-0.82, 0.82].map((x) =>
          [-0.62, 0.62].map((z) => <Box key={`${x}${z}`} p={[x, 1.05, z]} s={[0.08, 1.75, 0.08]} m={yellow} />),
        )}
        <Box p={[0, 1.96, 0]} s={[1.85, 0.14, 1.42]} m={yellow} />
        <Box p={[0.2, 2.06, 0]} s={[0.9, 0.06, 0.12]} m={black2} shadow={false} />
      </group>
      {/* vise and breakout wrench at the front of the frame (yellow) */}
      <group position={[VISE.x + 0.15, VISE.y, 0]} rotation={[0, 0, -ENTRY_ANGLE]}>
        <Box p={[0, 0.35, 0]} s={[0.42, 0.55, 0.8]} m={yellow} />
        <Box p={[-0.48, 0.35, 0]} s={[0.36, 0.5, 0.76]} m={yellow} />
        <Box p={[-0.24, 0.35, 0.42]} s={[0.9, 0.18, 0.06]} m={black} />
      </group>
      {/* front stake-down: two tall yellow towers at the front corners, augers into the ground */}
      <Box p={[VISE.x + 0.55, 0.12, 0]} s={[0.6, 0.24, 2.3]} m={black2} />
      {[-1.05, 1.05].map((z) => (
        <group key={z} position={[VISE.x + 0.6, 0, z]}>
          <Box p={[0, 1.25, 0]} s={[0.34, 2.3, 0.34]} m={yellow} />
          <Box p={[0.0, 2.45, 0]} s={[0.4, 0.14, 0.4]} m={yellow} />
          <Cyl p={[0, 0.15, 0]} r={0.22} h={0.08} m={black2} />
          <Cyl p={[0, -0.6, 0]} r={0.07} h={1.3} m={steel} />
        </group>
      ))}
      <Hose pts={[[VISE.x + 0.6, 2.4, 1.05], [VISE.x + 0.1, 2.9, 0.9], [VISE.x - 0.8, 2.3, 0.85], [VISE.x - 1.2, 1.4, 0.8]]} r={0.04} />
    </group>
  );
};

/** A flexible hose as a smooth tube through the given points */
export const Hose: React.FC<{ pts: [number, number, number][]; r?: number; color?: string; flow?: number }> = ({ pts, r = 0.06, color = "#2a2c2f", flow }) => {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal"), 80, r, 10, false), [JSON.stringify(pts), r]);
  const m = mat({ color, rough: 0.6, clip: "none" });
  // optional flow marks: small bands moving along the hose
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal"), [JSON.stringify(pts)]);
  return (
    <group>
      <mesh geometry={g} material={m} castShadow />
      {flow !== undefined
        ? Array.from({ length: 10 }).map((_, i) => {
            const u = (flow * 0.12 + i / 10) % 1;
            const p = curve.getPointAt(u);
            const tan = curve.getTangentAt(u);
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
            return (
              <mesh key={i} position={p} quaternion={q} material={mat({ color: color === "#2a2c2f" ? "#7fa7c9" : "#c9b28c", rough: 0.5, clip: "none" })}>
                <cylinderGeometry args={[r * 1.12, r * 1.12, 0.12, 10]} />
              </mesh>
            );
          })
        : null}
    </group>
  );
};

/** Fluid system: mixing tank with hopper, shaker / recycling unit, mud pump; with the support truck and rod trailer */
export const RIG_SIDE = {
  recycler: [-55.5, 0, -6.2] as [number, number, number],
  pump: [-50.2, 0, -5.6] as [number, number, number],
  truck: [-58.5, 0, 5.4] as [number, number, number],
  rods: [-49, 0, 6.4] as [number, number, number],
  pitPump: [-40.6, 0, -2.1] as [number, number, number],
};

export const FluidSystem: React.FC<{ a: Assets; t: number; flowing: boolean }> = ({ a, t, flowing }) => {
  const white = mat({ color: "#dcdcd6", rough: 0.55, clip: "none" });
  const dark = mat({ color: C.dark, rough: 0.6, clip: "none" });
  const steel = mat({ color: C.steel, rough: 0.4, metal: 0.6, clip: "none" });
  const trim = mat({ color: C.trim, rough: 0.5, clip: "none" });
  const grate = mat({ color: "#6d7277", rough: 0.5, metal: 0.5, clip: "none", tex: { a, name: "metal_plate", rx: 2, ry: 1, normal: 0.6 } });
  const [rx, , rz] = RIG_SIDE.recycler;
  const [px, , pz] = RIG_SIDE.pump;
  const [qx, , qz] = RIG_SIDE.pitPump;
  return (
    <group>
      {/* recycling unit: tank on skids, shaker screens on top, walkway with railing */}
      <group position={[rx, 0, rz]}>
        <Box p={[0, 0.12, 0]} s={[6.4, 0.24, 2.5]} m={dark} />
        <Box p={[0, 1.15, 0]} s={[6.2, 1.8, 2.4]} m={white} />
        <Box p={[-1.6, 2.35, 0]} s={[2.0, 0.6, 1.8]} m={grate} />
        <Box p={[-1.6, 2.7, 0]} s={[1.9, 0.08, 1.7]} m={dark} />
        <Box p={[1.4, 2.2, 0]} s={[1.6, 0.5, 1.2]} m={steel} />
        {[-3, -1, 1, 3].map((x) => (
          <Box key={x} p={[x, 2.75, 1.15]} s={[0.05, 0.9, 0.05]} m={trim} />
        ))}
        <Box p={[0, 3.2, 1.15]} s={[6.2, 0.05, 0.05]} m={trim} />
      </group>
      {/* mud pump skid */}
      <group position={[px, 0, pz]}>
        <Box p={[0, 0.1, 0]} s={[2.4, 0.2, 1.4]} m={dark} />
        <Box p={[-0.4, 0.75, 0]} s={[1.2, 1.1, 1.2]} m={white} />
        <Cyl p={[0.6, 0.6, 0]} r={0.28} h={0.9} m={steel} rot={[0, 0, Math.PI / 2]} />
      </group>
      {/* small trash pump at the entry pit that returns fluid to the recycler */}
      <group position={[qx, 0, qz]}>
        <Box p={[0, 0.25, 0]} s={[0.7, 0.5, 0.55]} m={dark} />
        <Cyl p={[0, 0.6, 0]} r={0.18} h={0.25} m={steel} />
      </group>
      {/* hoses: pump -> rig mud swivel (supply), pit -> trash pump -> recycler (returns), recycler -> pump */}
      <Hose pts={[[px + 1.0, 0.6, pz], [px + 2, 0.12, pz + 1.2], [-47.8, 0.12, -1.2], [-46.8, 1.2, -0.6], [-46.4, 2.3, -0.1]]} r={0.055} flow={flowing ? t : undefined} />
      <Hose pts={[[-39.6, -0.6, -0.6], [-39.8, 0.15, -1.6], [qx + 0.3, 0.3, qz + 0.1]]} r={0.06} color="#3d3426" flow={flowing ? t : undefined} />
      <Hose pts={[[qx - 0.3, 0.3, qz], [qx - 4, 0.1, qz - 1.6], [rx + 3, 0.1, rz + 1.6], [rx + 2.6, 2.4, rz + 0.6]]} r={0.06} color="#3d3426" flow={flowing ? t : undefined} />
      <Hose pts={[[rx + 3.2, 0.5, rz], [px - 1.4, 0.12, pz - 0.4], [px - 1.0, 0.5, pz]]} r={0.055} />
    </group>
  );
};

/** Support truck (water / fluid supply) with a hose to the recycler, and the drill rod trailer */
export const SupportVehicles: React.FC = () => {
  const white = mat({ color: "#e2e2de", rough: 0.45, metal: 0.2, clip: "none" });
  const dark = mat({ color: C.dark, rough: 0.6, clip: "none" });
  const tank = mat({ color: "#b8bcc0", rough: 0.35, metal: 0.55, clip: "none" });
  const glass = mat({ color: "#26323b", rough: 0.1, metal: 0.4, clip: "none" });
  const tire = mat({ color: "#1b1c1e", rough: 0.9, clip: "none" });
  const steel = mat({ color: C.steel, rough: 0.35, metal: 0.75, clip: "none" });
  const [tx, , tz] = RIG_SIDE.truck;
  const [dx, , dz] = RIG_SIDE.rods;
  return (
    <group>
      {/* truck faces +x */}
      <group position={[tx, 0, tz]}>
        <Box p={[3.6, 1.45, 0]} s={[1.9, 1.9, 2.4]} m={white} />
        <Box p={[4.2, 1.85, 0]} s={[0.75, 0.75, 2.42]} m={glass} shadow={false} />
        <Box p={[4.56, 0.95, 0]} s={[0.1, 0.6, 2.1]} m={dark} />
        <Box p={[0.6, 0.72, 0]} s={[8.4, 0.3, 2.0]} m={dark} />
        <mesh position={[0.1, 1.85, 0]} rotation={[0, 0, Math.PI / 2]} material={tank} castShadow>
          <capsuleGeometry args={[0.95, 4.2, 6, 24]} />
        </mesh>
        {[-2.4, -1.1, 3.6].map((x) =>
          [-1, 1].map((s) => <Cyl key={`${x}${s}`} p={[x, 0.5, s * 1.02]} r={0.5} h={0.34} m={tire} rot={[Math.PI / 2, 0, 0]} />),
        )}
      </group>
      <Hose pts={[[tx - 2.4, 0.9, tz - 1.0], [tx - 1.5, 0.1, tz - 3.5], [-58, 0.1, -3.5], [-58.6, 0.9, -4.9]]} r={0.05} color="#2d4a6b" />
      {/* rod trailer with stacked drill rods */}
      <group position={[dx, 0, dz]}>
        <Box p={[0, 0.55, 0]} s={[6.0, 0.18, 2.0]} m={dark} />
        {[-2.3, 2.3].map((x) => (
          <Box key={x} p={[x, 0.85, 0]} s={[0.15, 0.45, 2.0]} m={dark} />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <Cyl key={i} p={[0, 0.72 + Math.floor(i / 6) * 0.095, -0.7 + (i % 6) * 0.28]} r={0.045} h={5.4} m={steel} rot={[0, 0, Math.PI / 2]} seg={10} />
        ))}
        {[-1.5, 1.5].map((x) => (
          <Cyl key={x} p={[x, 0.36, 0]} r={0.36} h={2.3} m={tire} rot={[Math.PI / 2, 0, 0]} />
        ))}
      </group>
    </group>
  );
};

/** The entry pit lip and a short return channel: a readable collection arrangement */
export const EntryPitDetail: React.FC<{ a: Assets }> = ({ a }) => {
  const boards = mat({ color: "#8b6f4e", rough: 0.85, clip: "none" });
  const plate = mat({ color: "#5f6469", rough: 0.6, metal: 0.4, clip: "none", tex: { a, name: "metal_plate", rx: 1, ry: 1, normal: 0.5 } });
  const p = ENTRY_PIT;
  return (
    <group>
      {/* timber edge boards around the pit and a steel plate on the far side (access) */}
      <Box p={[(p.x0 + p.x1) / 2, 0.08, -p.z - 0.12]} s={[p.x1 - p.x0 + 0.4, 0.16, 0.24]} m={boards} />
      <Box p={[p.x0 - 0.12, 0.08, 0]} s={[0.24, 0.16, p.z * 2 + 0.4]} m={boards} />
      <Box p={[p.x1 + 0.12, 0.08, 0]} s={[0.24, 0.16, p.z * 2 + 0.4]} m={boards} />
      <Box p={[(p.x0 + p.x1) / 2 + 0.2, 0.05, p.z + 0.55]} s={[2.0, 0.04, 0.9]} m={plate} />
    </group>
  );
};
