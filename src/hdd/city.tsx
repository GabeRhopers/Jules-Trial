// Streetscape: textured streets, curbs, sidewalks, pavement markings, drainage inlets and manholes,
// low and mid-rise mixed-use buildings with storefront entrances, a landmark brick building with a clock
// tower, natural trees and shrubs, street lamps, hydrants, signals, traffic and pedestrians.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Assets } from "./assets";
import { facadeTexture, mat, storefrontTexture, worldUV } from "./materials";
import { Person, skinTone } from "./people";
import { Box, Cyl, MergedBoxes } from "./rig";
import { BOUNDS, BUILDINGS, CITY_ANGLE, cityToWorld, EXIT_LOT, POTHOLE, RIG_LOT, ROAD_HALF, SIDEWALK, worldToCity, type Building } from "./site";
import { carPose, carsAt, greenFor } from "./traffic";

const L = 280; // street length (clipped at the block edge)
const inLot = (wx: number, wz: number, pad = 0) =>
  [RIG_LOT, EXIT_LOT].some((l) => wx > l.x0 - pad && wx < l.x1 + pad && wz > l.z0 - pad && wz < l.z1 + pad);
const inside = (wx: number, wz: number, pad: number) => Math.abs(wx) < BOUNDS.x - pad && Math.abs(wz) < BOUNDS.z - pad;

/** Thin slab (city frame) with an optional rectangular opening (the potholing test hole) */
const slab = (cx: number, cz: number, w: number, d: number, thick: number, opening: { x: number; z: number; s: number } | null) => {
  const s = new THREE.Shape();
  s.moveTo(cx - w / 2, -(cz - d / 2));
  s.lineTo(cx + w / 2, -(cz - d / 2));
  s.lineTo(cx + w / 2, -(cz + d / 2));
  s.lineTo(cx - w / 2, -(cz + d / 2));
  s.closePath();
  if (opening) {
    const h = new THREE.Path();
    const { x, z, s: q } = opening;
    h.moveTo(x - q / 2, -(z - q / 2));
    h.lineTo(x - q / 2, -(z + q / 2));
    h.lineTo(x + q / 2, -(z + q / 2));
    h.lineTo(x + q / 2, -(z - q / 2));
    h.closePath();
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return worldUV(g, 4);
};

export const Streets: React.FC<{ a: Assets; pothole: boolean }> = ({ a, pothole }) => {
  const opening = useMemo(() => {
    if (!pothole) return null;
    const [x, z] = worldToCity(POTHOLE.x, POTHOLE.z);
    return { x, z, s: POTHOLE.size * 1.15 };
  }, [pothole]);
  const roads = useMemo(
    () => ({ main: slab(0, 0, ROAD_HALF * 2, L, 0.02, opening), cross: slab(0, 0, L, ROAD_HALF * 2, 0.021, opening), cap: slab(0, 0, ROAD_HALF * 2, ROAD_HALF * 2, 0.17, opening) }),
    [opening],
  );
  const asphaltW = mat({ color: "#7a7c7e", rough: 0.95, clip: "surface", tex: { a, name: "asphalt_02", rx: 0.25, ry: 0.25, normal: 0.6 } });
  const walk = mat({ color: "#d2cfc8", rough: 0.9, clip: "surface", tex: { a, name: "brushed_concrete", rx: 1, ry: 80, normal: 0.5 } });
  const walkX = mat({ color: "#d2cfc8", rough: 0.9, clip: "surface", tex: { a, name: "brushed_concrete", rx: 80, ry: 1, normal: 0.5 } });
  const curb = mat({ color: "#bdb9b1", rough: 0.85, clip: "surface" });
  const joint = mat({ color: "#a9a59d", rough: 0.9, clip: "surface" });
  const yellow = mat({ color: "#d9b443", rough: 0.6, clip: "surface" });
  const white = mat({ color: "#ecebe7", rough: 0.6, clip: "surface" });
  const iron = mat({ color: "#3d3f41", rough: 0.6, metal: 0.6, clip: "surface" });
  const edge = ROAD_HALF + SIDEWALK;
  // pavement markings, inlets and sidewalk joints: merged per material (one mesh each)
  type B = { p: [number, number, number]; s: [number, number, number]; ry?: number };
  const W: B[] = [];
  const Y: B[] = [];
  const J: B[] = [];
  const IR: B[] = [];
  const GR: B[] = [];
  const manholes: [number, number, number][] = [];
  for (const road of ["main", "cross"] as const) {
    const P = (along: number, across: number, y = 0.026): [number, number, number] => (road === "main" ? [across, y, along] : [along, y, across]);
    const S = (along: number, across: number): [number, number, number] => (road === "main" ? [across, 0.01, along] : [along, 0.01, across]);
    for (let s = -L / 2; s < L / 2; s += 9) {
      if (Math.abs(s) < edge + 6) continue;
      for (const off of [-3.5, 3.5]) W.push({ p: P(s, off), s: S(3, 0.12) });
    }
    for (const side of [-1, 1]) {
      const len = L / 2 - edge - 2;
      const c = side * (edge + 2 + len / 2);
      for (const off of [-0.12, 0.12]) Y.push({ p: P(c, off), s: S(len, 0.1) });
      W.push({ p: P(side * (edge + 1.6), side * (road === "main" ? -3.5 : 3.5)), s: S(0.45, 7) });
      for (let k = -6.2; k <= 6.2; k += 1.25) W.push({ p: P(side * (edge - 1.4), k), s: S(2.8, 0.6) });
      for (const cs of [-1, 1]) {
        const c0 = P(side * (edge + 4), cs * (ROAD_HALF - 0.35), 0.022);
        IR.push({ p: c0, s: road === "main" ? [0.55, 0.02, 1.1] : [1.1, 0.02, 0.55] });
        for (const k of [-0.4, -0.2, 0, 0.2, 0.4]) GR.push({ p: road === "main" ? [c0[0], 0.034, c0[2] + k] : [c0[0] + k, 0.034, c0[2]], s: road === "main" ? [0.45, 0.01, 0.05] : [0.05, 0.01, 0.45] });
      }
      manholes.push(P(side * 24, side * 1.75, 0.023));
    }
    for (let s = -L / 2; s < L / 2; s += 1.6) {
      if (Math.abs(s) < edge) continue;
      for (const side of [-1, 1]) J.push({ p: P(s, side * (ROAD_HALF + SIDEWALK / 2), 0.162), s: S(0.03, SIDEWALK) });
    }
  }
  const grate = mat({ color: "#1d1e20", rough: 0.9, clip: "surface" });
  return (
    <group rotation={[0, CITY_ANGLE, 0]}>
      <mesh geometry={roads.main} position={[0, 0.0, 0]} material={asphaltW} receiveShadow />
      <mesh geometry={roads.cross} position={[0, 0.0, 0]} material={asphaltW} receiveShadow />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box p={[side * (ROAD_HALF + SIDEWALK / 2), 0.08, 0]} s={[SIDEWALK, 0.16, L]} m={walk} shadow={false} />
          <Box p={[0, 0.08, side * (ROAD_HALF + SIDEWALK / 2)]} s={[L, 0.16, SIDEWALK]} m={walkX} shadow={false} />
          <Box p={[side * (ROAD_HALF + 0.08), 0.09, 0]} s={[0.16, 0.18, L]} m={curb} shadow={false} />
          <Box p={[0, 0.09, side * (ROAD_HALF + 0.08)]} s={[L, 0.18, 0.16]} m={curb} shadow={false} />
        </group>
      ))}
      <mesh geometry={roads.cap} position={[0, 0.0, 0]} material={asphaltW} receiveShadow />
      <MergedBoxes boxes={W} m={white} />
      <MergedBoxes boxes={Y} m={yellow} />
      <MergedBoxes boxes={J} m={joint} />
      <MergedBoxes boxes={IR} m={iron} />
      <MergedBoxes boxes={GR} m={grate} />
      {manholes.map((p, i) => (
        <mesh key={i} position={p} rotation={[-Math.PI / 2, 0, 0]} material={iron}>
          <circleGeometry args={[0.33, 24]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- buildings ----------

const FLOOR = 3.6;
const BuildingMesh: React.FC<{ a: Assets; b: Building; ghost: number }> = ({ a, b, ghost }) => {
  const h = b.floors * FLOOR + 0.8;
  const upper = b.floors - 1;
  const facade = useMemo(() => {
    if (upper < 1) return null;
    const t = facadeTexture(a, b.kind, b.tone, upper).clone();
    t.repeat.set(Math.max(1, Math.round(b.w / 6.5)), 1);
    t.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: b.kind === "glass" ? 0.15 : 0 });
    return m;
  }, [a, b, upper]);
  const front = useMemo(() => {
    const t = storefrontTexture().clone();
    t.repeat.set(Math.max(1, Math.round(b.w / 6)), 1);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3, metalness: 0.2 });
  }, [b.w]);
  const wall = mat({ color: b.tone, rough: 0.9, clip: "bounds", tex: b.kind === "brick" || b.kind === "landmark" ? { a, name: "red_brick_03", rx: b.w / 3, ry: 1.2, normal: 0.7 } : { a, name: "grey_plaster_02", rx: b.w / 4, ry: 1, normal: 0.5 } });
  const roof = mat({ color: "#8f8d88", rough: 0.9, clip: "bounds" });
  const coping = mat({ color: "#cfcac0", rough: 0.7, clip: "bounds" });
  const awning = mat({ color: b.awning, rough: 0.8, clip: "bounds" });
  const op = 1 - ghost * 0.82;
  for (const m of [facade, front]) {
    if (!m) continue;
    m.transparent = op < 0.99;
    m.opacity = op;
    m.depthWrite = op >= 0.99;
    m.clippingPlanes = [];
  }
  if (op < 0.99) return <GhostBox w={b.w} d={b.d} h={h} op={op} />;
  // the building faces the nearest street: storefronts on the two street sides (city -x and -z for these lots)
  const sx = Math.sign(b.x);
  const sz = Math.sign(b.z);
  return (
    <group position={[b.x, 0, b.z]}>
      {/* ground floor: storefront glazing with entrance doors on both street sides */}
      <Box p={[0, FLOOR / 2, 0]} s={[b.w, FLOOR, b.d]} m={wall} />
      <mesh position={[(-sx * b.w) / 2 - sx * 0.02, FLOOR / 2 - 0.2, 0]} rotation={[0, -sx * (Math.PI / 2), 0]} material={front}>
        <planeGeometry args={[b.d - 1, FLOOR - 0.6]} />
      </mesh>
      <mesh position={[0, FLOOR / 2 - 0.2, (-sz * b.d) / 2 - sz * 0.02]} rotation={[0, sz > 0 ? Math.PI : 0, 0]} material={front}>
        <planeGeometry args={[b.w - 1, FLOOR - 0.6]} />
      </mesh>
      {/* awnings over the entrances */}
      <Box p={[(-sx * b.w) / 2 - sx * 0.7, FLOOR - 0.35, 0]} s={[1.4, 0.12, b.d - 2]} m={awning} r={[0, 0, sx * 0.18]} />
      <Box p={[0, FLOOR - 0.35, (-sz * b.d) / 2 - sz * 0.7]} s={[b.w - 2, 0.12, 1.4]} m={awning} r={[-sz * 0.18, 0, 0]} />
      {/* upper floors */}
      {facade ? (
        <mesh position={[0, FLOOR + (upper * FLOOR) / 2, 0]} material={[facade, facade, roof, roof, facade, facade]} castShadow receiveShadow>
          <boxGeometry args={[b.w, upper * FLOOR, b.d]} />
        </mesh>
      ) : null}
      <Box p={[0, FLOOR - 0.05, 0]} s={[b.w + 0.2, 0.2, b.d + 0.2]} m={coping} shadow={false} />
      <Box p={[0, h - 0.4, 0]} s={[b.w + 0.25, 0.25, b.d + 0.25]} m={coping} />
      <Box p={[0, h - 0.5, 0]} s={[b.w - 0.3, 0.1, b.d - 0.3]} m={roof} shadow={false} />
      {/* rooftop units */}
      <Box p={[b.w * 0.2, h - 0.05, b.d * 0.15]} s={[2.4, 1.0, 1.6]} m={mat({ color: "#b4b6b8", rough: 0.6, metal: 0.3, clip: "bounds" })} />
      {b.kind === "landmark" ? (
        // clock tower on the street corner
        <group position={[(-sx * b.w) / 2 + sx * 2, h - 0.4, (-sz * b.d) / 2 + sz * 2]}>
          <Box p={[0, 3.2, 0]} s={[3.6, 6.4, 3.6]} m={wall} />
          <Box p={[0, 6.6, 0]} s={[4.0, 0.3, 4.0]} m={coping} />
          {[0, 1, 2, 3].map((k) => (
            <group key={k} rotation={[0, (k * Math.PI) / 2, 0]}>
              <mesh position={[0, 4.6, 1.82]} material={mat({ color: "#f1efe8", rough: 0.5, clip: "bounds" })}>
                <circleGeometry args={[0.95, 32]} />
              </mesh>
              <mesh position={[0, 4.6, 1.83]} material={mat({ color: "#2a2a2a", rough: 0.5, clip: "bounds" })}>
                <ringGeometry args={[0.88, 0.95, 32]} />
              </mesh>
              <Box p={[0.25, 4.8, 1.84]} s={[0.5, 0.06, 0.01]} m={mat({ color: "#2a2a2a", rough: 0.5, clip: "bounds" })} shadow={false} r={[0, 0, 0.6]} />
            </group>
          ))}
          <mesh position={[0, 8.0, 0]} rotation={[0, Math.PI / 4, 0]} material={mat({ color: "#4f6a5d", rough: 0.5, metal: 0.4, clip: "bounds" })} castShadow>
            <coneGeometry args={[2.8, 2.6, 4]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

/** Ghosted building (only used if a building would block an explanatory view) */
const GhostBox: React.FC<{ w: number; d: number; h: number; op: number }> = ({ w, d, h, op }) => {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e9ecef", transparent: true, opacity: 0.3 * op + 0.08, depthWrite: false }), [op]);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), [w, h, d]);
  return (
    <group position={[0, h / 2, 0]}>
      <mesh material={m}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#9aa3ab" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
};

export const Buildings: React.FC<{ a: Assets; ghostFront: number }> = ({ a, ghostFront }) => (
  <group rotation={[0, CITY_ANGLE, 0]}>
    {BUILDINGS.map((b, i) => {
      const [wx, wz] = cityToWorld(b.x, b.z);
      const r = Math.hypot(b.w, b.d) / 2;
      if (!inside(wx, wz, r) || Math.abs(wz) < r + 1.5 || inLot(wx, wz, r)) return null;
      // buildings in front of the section (z > 0) ghost during section views so they never hide the crossing
      const g = wz > 0 ? ghostFront : 0;
      return <BuildingMesh key={i} a={a} b={b} ghost={g} />;
    })}
  </group>
);

// ---------- trees, shrubs, lamps, hydrants ----------

/** Natural-looking deciduous street tree: tapered trunk, branches, clustered leafy crown */
export const Tree: React.FC<{ a: Assets; k: number; scale?: number }> = ({ a, k, scale = 1 }) => {
  const crown = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    let seed = 17 + k * 31;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 13; i++) {
      const g = new THREE.IcosahedronGeometry(0.62 + rnd() * 0.45, 2);
      const pos = g.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        const y = pos.getY(v);
        const z = pos.getZ(v);
        const n = 1 + 0.18 * Math.sin(x * 4.1 + k) * Math.cos(y * 3.7) + 0.12 * Math.sin(z * 5.3 + i);
        pos.setXYZ(v, x * n, y * n * 0.85, z * n);
      }
      const ang = rnd() * Math.PI * 2;
      const rad = i === 0 ? 0 : 0.6 + rnd() * 1.1;
      g.translate(Math.cos(ang) * rad, 4.5 + (rnd() - 0.35) * 1.6, Math.sin(ang) * rad);
      g.computeVertexNormals();
      geos.push(g);
    }
    return [mergeGeometries(geos, false)];
  }, [k]);
  const leaf = mat({ color: k % 3 === 0 ? "#b4cc86" : k % 3 === 1 ? "#a5c27c" : "#bdd08f", rough: 0.95, clip: "bounds", tex: { a, name: "forest_leaves_02", rx: 6, ry: 6, normal: 0.15 } });
  const bark = mat({ color: "#6b5a49", rough: 0.9, clip: "bounds" });
  return (
    <group scale={scale}>
      <Cyl p={[0, 1.8, 0]} r={0.16} r2={0.1} h={3.6} m={bark} seg={10} />
      {[0.7, 2.3, 4.1].map((ang, i) => (
        <Cyl key={i} p={[Math.cos(ang) * 0.35, 3.6, Math.sin(ang) * 0.35]} r={0.07} r2={0.04} h={1.3} m={bark} rot={[Math.sin(ang) * 0.6, 0, -Math.cos(ang) * 0.6]} seg={8} />
      ))}
      {crown.map((g, i) => (
        <mesh key={i} geometry={g} material={leaf} castShadow receiveShadow />
      ))}
    </group>
  );
};

/** Places a copy of a CC0 model */
const Model: React.FC<{ g: THREE.Group; p: [number, number, number]; r?: number; s?: number }> = ({ g, p, r = 0, s = 1 }) => {
  const c = useMemo(() => g.clone(true), [g]);
  return <primitive object={c} position={p} rotation={[0, r, 0]} scale={s} />;
};

export const StreetFurniture: React.FC<{ a: Assets; cutFront: boolean }> = ({ a, cutFront }) => {
  const edge = ROAD_HALF + SIDEWALK - 0.7;
  const trees: [number, number][] = [];
  for (let s = 16; s < 80; s += 12) for (const sign of [-1, 1]) for (const side of [-1, 1]) trees.push([side * edge, sign * s], [sign * s, side * edge]);
  const lamps: [number, number, number][] = [];
  for (const s of [12.5, 40]) for (const sign of [-1, 1]) for (const side of [-1, 1]) lamps.push([side * (ROAD_HALF + 0.5), sign * s, side > 0 ? -Math.PI / 2 : Math.PI / 2]);
  const ok = (x: number, z: number, pad = 2) => {
    const [wx, wz] = cityToWorld(x, z);
    if (!inside(wx, wz, pad) || inLot(wx, wz, 7) || Math.abs(wz) < 2.5) return false;
    if (cutFront && wz > 0 && Math.abs(wz) < 26) return false; // keep the section view clear
    return true;
  };
  return (
    <group rotation={[0, CITY_ANGLE, 0]}>
      {trees.filter(([x, z]) => ok(x, z)).map(([x, z], i) => (
        <group key={`t${i}`} position={[x, 0.16, z]}>
          <Tree a={a} k={i} scale={0.92 + (i % 4) * 0.06} />
          <Box p={[0, 0.0, 0]} s={[1.4, 0.04, 1.4]} m={mat({ color: "#5a4b3c", rough: 1, clip: "bounds" })} shadow={false} />
        </group>
      ))}
      {lamps.filter(([x, z]) => ok(x, z, 1)).map(([x, z, r], i) => (
        <Model key={`l${i}`} g={a.models.street_lamp_01} p={[x, 0.16, z]} r={r} s={1.1} />
      ))}
      {[[-(ROAD_HALF + 0.6), -15], [ROAD_HALF + 0.6, 15], [15, ROAD_HALF + 0.6], [-15, -(ROAD_HALF + 0.6)]].filter(([x, z]) => ok(x, z, 1)).map(([x, z], i) => (
        <Model key={`h${i}`} g={a.models.fire_hydrant} p={[x, 0.16, z]} s={1} />
      ))}
      {/* shrubs in the planting strips by the buildings */}
      {BUILDINGS.flatMap((b, bi) =>
        [-0.35, 0, 0.35].map((k, j) => {
          const x = b.x - Math.sign(b.x) * (b.w / 2 + 1.2);
          const z = b.z + k * b.d;
          if (!ok(x, z, 2)) return null;
          return <Model key={`s${bi}${j}`} g={a.models.shrub_02} p={[x, 0.16, z]} r={bi + j} s={1.3} />;
        }),
      )}
    </group>
  );
};

export const Signals: React.FC<{ t: number }> = ({ t }) => {
  const g = greenFor(t);
  const edge = ROAD_HALF + 0.8;
  const pole = mat({ color: "#45494d", rough: 0.5, metal: 0.5, clip: "bounds" });
  const housing = mat({ color: "#2b2e31", rough: 0.6, clip: "bounds" });
  const corners: [number, number, "main" | "cross", number][] = [
    [edge, -edge, "main", 0],
    [-edge, edge, "main", Math.PI],
    [-edge, -edge, "cross", Math.PI / 2],
    [edge, edge, "cross", -Math.PI / 2],
  ];
  return (
    <group rotation={[0, CITY_ANGLE, 0]}>
      {corners.map(([x, z, road, r], i) => {
        const on = g === road;
        return (
          <group key={i} position={[x, 0.16, z]} rotation={[0, r, 0]}>
            <Cyl p={[0, 3.2, 0]} r={0.12} r2={0.1} h={6.4} m={pole} />
            <Cyl p={[-3.2, 6.1, 0]} r={0.07} h={6.4} m={pole} rot={[0, 0, Math.PI / 2]} />
            {[-2.2, -5.0].map((hx) => (
              <group key={hx} position={[hx, 5.5, 0]}>
                <Box p={[0, 0, 0]} s={[0.38, 1.05, 0.32]} m={housing} />
                <mesh position={[0, 0.32, -0.17]} material={mat({ color: on ? "#3a2020" : "#ff5a4a", emissive: on ? undefined : "#c8321f", clip: "bounds" })}>
                  <circleGeometry args={[0.1, 16]} />
                </mesh>
                <mesh position={[0, -0.32, -0.17]} material={mat({ color: on ? "#59e3a0" : "#1f3329", emissive: on ? "#28b06c" : undefined, clip: "bounds" })}>
                  <circleGeometry args={[0.1, 16]} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
};

// ---------- vehicles and pedestrians ----------

/** Passenger vehicle with a shaped side profile */
const CAR_SHAPES: Record<string, THREE.Shape> = {};
const carShape = (kind: string) => {
  if (CAR_SHAPES[kind]) return CAR_SHAPES[kind];
  const s = new THREE.Shape();
  const Lh = kind === "van" ? 2.6 : kind === "suv" ? 2.4 : 2.25;
  const H = kind === "van" ? 1.95 : kind === "suv" ? 1.65 : 1.38;
  s.moveTo(-Lh, 0.32);
  s.lineTo(Lh, 0.32);
  s.quadraticCurveTo(Lh + 0.05, 0.75, Lh - 0.15, 0.85);
  if (kind === "van") {
    s.lineTo(Lh - 0.5, 0.95);
    s.lineTo(Lh - 1.0, H);
  } else {
    s.lineTo(Lh * 0.45, 0.95);
    s.lineTo(Lh * 0.18, H);
  }
  s.lineTo(-Lh * (kind === "car" ? 0.55 : 0.85), H);
  s.lineTo(-Lh + 0.1, kind === "car" ? 0.98 : 1.05);
  s.lineTo(-Lh, 0.75);
  s.closePath();
  CAR_SHAPES[kind] = s;
  return s;
};
const carGeo = new Map<string, THREE.ExtrudeGeometry>();
export const Car: React.FC<{ color: string; kind: string; clip?: "bounds" | "none" }> = ({ color, kind, clip = "bounds" }) => {
  const g =
    carGeo.get(kind) ??
    (() => {
      const e = new THREE.ExtrudeGeometry(carShape(kind), { depth: 1.7, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
      e.translate(0, 0, -0.85);
      carGeo.set(kind, e);
      return e;
    })();
  const body = mat({ color, rough: 0.3, metal: 0.55, clip });
  const glass = mat({ color: "#2e3a44", rough: 0.06, metal: 0.6, clip });
  const tire = mat({ color: "#1b1c1e", rough: 0.9, clip });
  const Lh = kind === "van" ? 2.6 : kind === "suv" ? 2.4 : 2.25;
  const H = kind === "van" ? 1.95 : kind === "suv" ? 1.65 : 1.38;
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={g} material={body} castShadow />
      {/* side windows as a darker band */}
      <Box p={[kind === "van" ? -0.1 : -0.25, H - 0.32, 0]} s={[kind === "van" ? Lh * 1.5 : Lh * 1.05, 0.42, 1.84]} m={glass} shadow={false} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} p={[sx * (Lh - 0.75), 0.34, sz * 0.82]} r={0.34} h={0.24} m={tire} rot={[Math.PI / 2, 0, 0]} seg={18} />),
      )}
    </group>
  );
};

export const Traffic: React.FC<{ frame: number }> = ({ frame }) => {
  const cars = carsAt(frame);
  return (
    <group>
      {cars.map((c, i) => {
        const p = carPose(c);
        const [wx, wz] = cityToWorld(p.x, p.z);
        if (!inside(wx, wz, 3)) return null;
        return (
          <group key={i} position={[wx, 0, wz]} rotation={[0, p.heading + CITY_ANGLE, 0]}>
            <Car color={c.color} kind={c.kind} />
          </group>
        );
      })}
    </group>
  );
};

/** Pedestrians walking the sidewalks (deterministic loops), a few pausing at storefront entrances */
export const Pedestrians: React.FC<{ t: number }> = ({ t }) => {
  const walkers = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        road: i % 2 ? "main" : "cross",
        side: i % 4 < 2 ? 1 : -1,
        dir: i % 3 === 0 ? -1 : 1,
        s0: (i * 37) % 120,
        speed: 1.15 + (i % 5) * 0.08,
        shirt: ["#5b6b7a", "#7a4e4e", "#3f5a48", "#8a7a5a", "#4d4d5c", "#b0a48a"][i % 6],
        pants: ["#2f3440", "#4b4237", "#1f2328"][i % 3],
        skin: skinTone(i),
      })),
    [],
  );
  return (
    <group rotation={[0, CITY_ANGLE, 0]}>
      {walkers.map((w, i) => {
        const span = 140;
        const s = ((((w.s0 + t * w.speed * w.dir) % span) + span) % span) - span / 2;
        const off = w.side * (ROAD_HALF + SIDEWALK / 2 + (i % 2 ? 0.45 : -0.45));
        const x = w.road === "main" ? off : s;
        const z = w.road === "main" ? s : off;
        const [wx, wz] = cityToWorld(x, z);
        if (!inside(wx, wz, 2) || Math.abs(s) < ROAD_HALF + SIDEWALK + 0.5) return null;
        const heading = w.road === "main" ? (w.dir > 0 ? 0 : Math.PI) : w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        return <Person key={i} p={[x, 0.16, z]} r={heading} pose="walk" t={t + i} crew={false} shirt={w.shirt} pants={w.pants} skin={w.skin} />;
      })}
    </group>
  );
};
