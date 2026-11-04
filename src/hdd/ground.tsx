// Ground: the soil block (illustrative strata), the explanatory section along the alignment with a faint
// translucent ghost of the removed ground, the drilled hole (proportionate, behind the section face), the
// pits, the potholing (utility verification) exposure, locate marks, the planned alignment, and the lots.
import { useMemo } from "react";
import * as THREE from "three";
import type { Assets } from "./assets";
import { applyCut, BOUND_PLANES, mat, SECTION_U, sectionTexture, worldUV } from "./materials";
import { Box, MergedBoxes } from "./rig";
import { BOUNDS, boreAt, CITY_ANGLE, ENTRY_PIT, EXIT_LOT, EXIT_PIT, POTHOLE, RIG_LOT, SIZES, UTILITIES, utilityLine } from "./site";

type Rect = { x0: number; x1: number; z0: number; z1: number };
const PITS: Rect[] = [
  { x0: ENTRY_PIT.x0, x1: ENTRY_PIT.x1, z0: -ENTRY_PIT.z, z1: ENTRY_PIT.z },
  { x0: EXIT_PIT.x0, x1: EXIT_PIT.x1, z0: -EXIT_PIT.z, z1: EXIT_PIT.z },
];
const PH: Rect = { x0: POTHOLE.x - POTHOLE.size / 2, x1: POTHOLE.x + POTHOLE.size / 2, z0: POTHOLE.z - POTHOLE.size / 2, z1: POTHOLE.z + POTHOLE.size / 2 };
const hole = (r: Rect) => {
  const h = new THREE.Path();
  h.moveTo(r.x0, -r.z0);
  h.lineTo(r.x0, -r.z1);
  h.lineTo(r.x1, -r.z1);
  h.lineTo(r.x1, -r.z0);
  h.closePath();
  return h;
};
const blockShape = (holes: Rect[]) => {
  const s = new THREE.Shape();
  s.moveTo(-BOUNDS.x, BOUNDS.z);
  s.lineTo(BOUNDS.x, BOUNDS.z);
  s.lineTo(BOUNDS.x, -BOUNDS.z);
  s.lineTo(-BOUNDS.x, -BOUNDS.z);
  s.closePath();
  for (const r of holes) s.holes.push(hole(r));
  return s;
};

/** Soil block: upper slab with pit and pothole openings, lower solid slab; sides show the strata texture */
export const Soil: React.FC<{ a: Assets; xray: number; pothole: number }> = ({ a, xray, pothole }) => {
  const [upper, lower] = useMemo(() => {
    const mk = (top: number, bottom: number, holes: Rect[]) => {
      const g = new THREE.ExtrudeGeometry(blockShape(holes), { depth: top - bottom, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.translate(0, bottom, 0);
      return g;
    };
    const u = mk(0, -1.5, pothole > 0 ? [...PITS, PH] : PITS);
    const l = mk(-1.5, -BOUNDS.depth, []);
    // strata texture on the sides: u from x or z, v from depth
    for (const g of [u, l]) {
      g.computeVertexNormals();
      const pos = g.attributes.position;
      const nor = g.attributes.normal;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const along = Math.abs(nor.getX(i)) > 0.5 ? pos.getZ(i) : pos.getX(i);
        uv[i * 2] = along / SECTION_U;
        uv[i * 2 + 1] = (pos.getY(i) + BOUNDS.depth) / BOUNDS.depth;
      }
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    }
    return [u, l];
  }, [pothole > 0]);
  const m = useMemo(() => {
    const x = new THREE.MeshStandardMaterial({ map: sectionTexture(a), roughness: 0.95 });
    x.clippingPlanes = BOUND_PLANES;
    x.clipShadows = true;
    return applyCut(x);
  }, [a]);
  const op = 1 - 0.85 * xray;
  m.transparent = op < 0.999;
  m.opacity = op;
  m.depthWrite = op > 0.999;
  return (
    <group>
      <mesh geometry={upper} material={m} receiveShadow />
      <mesh geometry={lower} material={m} />
      {PITS.map((p, i) => (
        <mesh key={i} position={[(p.x0 + p.x1) / 2, -ENTRY_PIT.depth, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat({ color: "#6a5643", rough: 1, clip: "cut" })}>
          <planeGeometry args={[p.x1 - p.x0, p.z1 - p.z0]} />
        </mesh>
      ))}
    </group>
  );
};

/** Drilling fluid in the pits (bentonite returns: tan-gray, slightly glossy) */
export const PitFluid: React.FC<{ entry: number; exit: number }> = ({ entry, exit }) => (
  <group>
    {[entry, exit].map((level, i) =>
      level > 0 ? (
        <mesh key={i} position={[(PITS[i].x0 + PITS[i].x1) / 2, -ENTRY_PIT.depth + level, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat({ color: "#8f8270", rough: 0.22, metal: 0.05, clip: "cut" })}>
          <planeGeometry args={[PITS[i].x1 - PITS[i].x0 - 0.02, PITS[i].z1 - PITS[i].z0 - 0.02]} />
        </mesh>
      ) : null,
    )}
  </group>
);

/** The drilled hole: radius changes behind the reamer. `to` = drilled length (bore fraction). */
export type Hole = { to: number; enlargedFrom: number | null };
const holeR = (h: Hole, u: number) => (h.enlargedFrom !== null && u >= h.enlargedFrom ? SIZES.enlargedHole : SIZES.pilotHole);

/** Strip along the bore between offsets r0 and r1 from the centerline (positive = above), from u0 to u1 */
const stripGeometry = (u0: number, u1: number, r0: number, r1: number) => {
  const n = Math.max(2, Math.ceil((u1 - u0) / 0.003));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const { p, tan } = boreAt(u0 + ((u1 - u0) * i) / n);
    for (const r of [r0, r1]) {
      const x = p.x - tan.y * r;
      const y = p.y + tan.x * r;
      pos.push(x, y, 0);
      uv.push(x / SECTION_U, (y + BOUNDS.depth) / BOUNDS.depth);
    }
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

/**
 * Section face on the plane z = cut, with the pit notches and a full-length bore opening (enlarged size),
 * triangulated once. Strips in the section texture cover what is not yet drilled or enlarged.
 */
const FACE_U0 = 0.004;
const FACE_U1 = 0.996;
export const SectionFace: React.FC<{ a: Assets; cut: number; hole: Hole | null }> = ({ a, cut, hole }) => {
  const face = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-BOUNDS.x, -BOUNDS.depth);
    s.lineTo(BOUNDS.x, -BOUNDS.depth);
    s.lineTo(BOUNDS.x, 0);
    for (const p of [PITS[1], PITS[0]]) {
      s.lineTo(p.x1, 0);
      s.lineTo(p.x1, -ENTRY_PIT.depth);
      s.lineTo(p.x0, -ENTRY_PIT.depth);
      s.lineTo(p.x0, 0);
    }
    s.lineTo(-BOUNDS.x, 0);
    s.closePath();
    const n = Math.ceil((FACE_U1 - FACE_U0) / 0.003);
    const top: THREE.Vector2[] = [];
    const bot: THREE.Vector2[] = [];
    const r = SIZES.enlargedHole;
    for (let i = 0; i <= n; i++) {
      const { p, tan } = boreAt(FACE_U0 + ((FACE_U1 - FACE_U0) * i) / n);
      top.push(new THREE.Vector2(p.x - tan.y * r, p.y + tan.x * r));
      bot.push(new THREE.Vector2(p.x + tan.y * r, p.y - tan.x * r));
    }
    s.holes.push(new THREE.Path([...top, ...bot.reverse()]));
    const g = new THREE.ShapeGeometry(s, 4);
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / SECTION_U;
      uv[i * 2 + 1] = (pos.getY(i) + BOUNDS.depth) / BOUNDS.depth;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, []);
  const to = hole ? Math.min(FACE_U1, Math.max(FACE_U0, hole.to)) : FACE_U0;
  const enl = hole?.enlargedFrom ?? null;
  // covers: undrilled part (full width), and the ring between pilot and enlarged size where not yet reamed
  const covers = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    const R = SIZES.enlargedHole + 0.002;
    const r = SIZES.pilotHole;
    if (to < FACE_U1 - 0.0005) out.push(stripGeometry(to, FACE_U1, -R, R));
    const ringEnd = enl === null ? to : Math.min(to, enl);
    if (ringEnd > FACE_U0 + 0.0005) {
      out.push(stripGeometry(FACE_U0, ringEnd, r, R));
      out.push(stripGeometry(FACE_U0, ringEnd, -R, -r));
    }
    return out;
  }, [Math.round(to * 4000), enl === null ? -1 : Math.round(enl * 4000)]);
  if (cut >= BOUNDS.z - 0.01) return null;
  const m = mat({ color: "#ffffff", rough: 1, clip: "bounds", map: sectionTexture(a), side: THREE.DoubleSide });
  return (
    <group position={[0, 0, cut]}>
      <mesh geometry={face} material={m} receiveShadow />
      {covers.map((g, i) => (
        <mesh key={i} geometry={g} position={[0, 0, 0.0015]} material={m} receiveShadow />
      ))}
    </group>
  );
};

/** Faint translucent volume where the ground is cut away for the explanation (with outline edges) */
export const Ghost: React.FC<{ cut: number; strength: number }> = ({ cut, strength }) => {
  const depth = BOUNDS.z - cut;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(BOUNDS.x * 2, BOUNDS.depth, Math.max(0.01, depth))), [depth]);
  if (depth < 0.05 || strength <= 0) return null;
  return (
    <group position={[0, -BOUNDS.depth / 2 - 0.01, cut + depth / 2]}>
      <mesh renderOrder={2}>
        <boxGeometry args={[BOUNDS.x * 2, BOUNDS.depth, depth]} />
        <meshStandardMaterial color="#c8b79f" transparent opacity={0.12 * strength} depthWrite={false} roughness={1} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.55 * strength} />
      </lineSegments>
    </group>
  );
};

/** Half-pipe of the drilled hole behind the section face, wet with drilling fluid (tan-gray) */
export const BoreGroove: React.FC<{ hole: Hole }> = ({ hole }) => {
  const g = useMemo(() => {
    const u0 = 0.003;
    const u1 = Math.min(0.997, hole.to);
    if (u1 - u0 < 0.003) return null;
    const n = Math.max(8, Math.ceil((u1 - u0) / 0.002));
    const seg = 12;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      const { p, tan } = boreAt(u);
      const r = holeR(hole, u);
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
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }, [hole.to, hole.enlargedFrom]);
  if (!g) return null;
  return <mesh geometry={g} material={mat({ color: "#8a7a64", rough: 0.55, clip: "bounds", side: THREE.DoubleSide })} receiveShadow />;
};

/** Existing utilities (running along the streets), cut by the section; and their sections on the face */
export const Utilities: React.FC<{ showSections: boolean }> = ({ showSections }) => (
  <group>
    {UTILITIES.map((u) => {
      const { point, dir } = utilityLine(u);
      const angle = Math.atan2(dir[0], dir[1]);
      const m = mat({ color: u.color, rough: u.kind === "duct" ? 0.9 : 0.5, clip: "cut", side: THREE.DoubleSide });
      return (
        <group key={u.id} position={[point[0], u.depth, point[1]]} rotation={[0, angle, 0]}>
          {u.kind === "duct" ? (
            <mesh material={m}>
              <boxGeometry args={[u.radius * 2.4, u.radius * 1.6, 220]} />
            </mesh>
          ) : (
            <mesh rotation={[Math.PI / 2, 0, 0]} material={m}>
              <cylinderGeometry args={[u.radius, u.radius, 220, 28, 1, true]} />
            </mesh>
          )}
        </group>
      );
    })}
    {showSections ? <UtilitySections /> : null}
  </group>
);

const UtilitySections: React.FC = () => (
  <group position={[0, 0, 0.012]}>
    {UTILITIES.map((u) => {
      const { dir, crossX } = utilityLine(u);
      const stretch = 1 / Math.abs(dir[1]);
      return (
        <group key={u.id} position={[crossX, u.depth, 0]} scale={[stretch, 1, 1]}>
          {u.kind === "pipe" ? (
            <>
              <mesh material={mat({ color: u.color, rough: 0.45, clip: "bounds" })}>
                <circleGeometry args={[u.radius, 40]} />
              </mesh>
              <mesh position={[0, 0, 0.003]} material={mat({ color: "#2a2724", rough: 1, clip: "bounds" })}>
                <circleGeometry args={[u.radius * 0.8, 40]} />
              </mesh>
            </>
          ) : (
            <>
              <mesh material={mat({ color: "#a7a49d", rough: 0.9, clip: "bounds" })}>
                <planeGeometry args={[u.radius * 2.4, u.radius * 1.6]} />
              </mesh>
              {[-0.45, 0, 0.45].map((k) => (
                <mesh key={k} position={[k * u.radius * 1.6, 0, 0.003]} material={mat({ color: u.color, rough: 0.5, clip: "bounds" })}>
                  <circleGeometry args={[u.radius * 0.3, 24]} />
                </mesh>
              ))}
            </>
          )}
        </group>
      );
    })}
  </group>
);

/** Locate marks painted on the surface along each utility (APWA colors), for the planning views */
export const LocateMarks: React.FC<{ o: number }> = ({ o }) => {
  if (o <= 0.01) return null;
  return (
    <group>
      {UTILITIES.map((u) => {
        const { point, dir } = utilityLine(u);
        const ang = Math.atan2(dir[0], dir[1]);
        const boxes: { p: [number, number, number]; s: [number, number, number]; ry: number }[] = [];
        for (let k = -100; k <= 100; k += 2.6) {
          const x = point[0] + dir[0] * k;
          const z = point[1] + dir[1] * k;
          if (Math.abs(x) > BOUNDS.x - 0.6 || Math.abs(z) > BOUNDS.z - 0.6) continue;
          boxes.push({ p: [x, 0.2, z], s: [0.22, 0.008, 1.4], ry: ang });
        }
        return <MergedBoxes key={u.id} boxes={boxes} m={mat({ color: u.color, rough: 0.6, opacity: Math.round(o * 10) / 10, clip: "surface" })} />;
      })}
    </group>
  );
};

/** Planned alignment: white dashes on the surface (APWA white = proposed) and, in section, a dashed profile */
export const PlannedRoute: React.FC<{ surface: number; profile: number }> = ({ surface, profile }) => {
  const out: React.ReactNode[] = [];
  const white = mat({ color: "#ffffff", rough: 0.5, clip: "none", emissive: "#9a9a9a" });
  const paint = mat({ color: "#ffffff", rough: 0.5, clip: "surface", emissive: "#9a9a9a" });
  if (surface > 0)
    for (let x = -37.4; x <= 37.4; x += 2.4) {
      if ((x + 37.4) / 74.8 > surface) break;
      out.push(<Box key={`s${x}`} p={[x, 0.215, 0]} s={[1.3, 0.01, 0.3]} m={paint} shadow={false} />);
    }
  if (profile > 0)
    for (let u = 0; u < profile; u += 0.016) {
      const a = boreAt(u).p;
      const b = boreAt(Math.min(profile, u + 0.009)).p;
      const mid = a.clone().add(b).multiplyScalar(0.5);
      out.push(
        <mesh key={`p${u}`} position={[mid.x, mid.y, 0.04]} rotation={[0, 0, Math.atan2(b.y - a.y, b.x - a.x)]} material={white}>
          <boxGeometry args={[a.distanceTo(b), 0.05, 0.05]} />
        </mesh>,
      );
    }
  return <group>{out}</group>;
};

/** Utility verification: a small vacuum-excavated test hole exposing the gas main at the alignment */
export const Pothole: React.FC<{ a: Assets; o: number }> = ({ a, o }) => {
  if (o <= 0) return null;
  const g = UTILITIES.find((u) => u.id === POTHOLE.utility)!;
  const { dir } = utilityLine(g);
  const ang = Math.atan2(dir[0], dir[1]);
  const cone = mat({ color: "#e66a1f", rough: 0.6, clip: "none" });
  return (
    <group>
      <mesh position={[POTHOLE.x, -POTHOLE.depth, POTHOLE.z]} rotation={[-Math.PI / 2, 0, 0]} material={mat({ color: "#6a5643", rough: 1, clip: "none" })}>
        <planeGeometry args={[POTHOLE.size, POTHOLE.size]} />
      </mesh>
      {/* the exposed section of the gas main inside the test hole */}
      <group position={[POTHOLE.x, g.depth, POTHOLE.z]} rotation={[0, ang, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mat({ color: g.color, rough: 0.45, clip: "none" })}>
          <cylinderGeometry args={[g.radius, g.radius, POTHOLE.size * 1.3, 24]} />
        </mesh>
      </group>
      {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([dx, dz], i) => (
        <mesh key={i} position={[POTHOLE.x + dx, 0.5, POTHOLE.z + dz]} material={cone} castShadow>
          <coneGeometry args={[0.16, 0.65, 14]} />
        </mesh>
      ))}
      <Box p={[POTHOLE.x, 0.03, POTHOLE.z - 1.6]} s={[0.9, 0.06, 0.6]} m={mat({ color: "#6b5644", rough: 1, clip: "none", tex: { a, name: "brown_mud_dry", rx: 1, ry: 1 } })} />
    </group>
  );
};

/** Ground cover: lawns and plazas in the blocks, the paved rig lot, the gravel exit / staging area */
export const GroundCover: React.FC<{ a: Assets; restored: boolean }> = ({ a, restored }) => {
  const lawn = mat({ color: "#c9d1ad", rough: 1, clip: "surface", tex: { a, name: "grass_path_2", rx: 0.08, ry: 0.08, normal: 0.4 } });
  const plaza = mat({ color: "#cdc7bd", rough: 0.9, clip: "surface", tex: { a, name: "brushed_concrete", rx: 2, ry: 2, normal: 0.4 } });
  const lot = mat({ color: "#9a9c9e", rough: 0.95, clip: "surface", tex: { a, name: "asphalt_02", rx: 0.25, ry: 0.25, normal: 0.6 } });
  const gravel = mat({ color: "#c2b9aa", rough: 1, clip: "surface", tex: { a, name: "bicolour_gravel", rx: 0.3, ry: 0.3, normal: 0.6 } });
  const patch = mat({ color: "#4f5254", rough: 0.9, clip: "surface" });
  const shapeGeo = (r: Rect, holes: Rect[]) => {
    const s = new THREE.Shape();
    s.moveTo(r.x0, -r.z0);
    s.lineTo(r.x0, -r.z1);
    s.lineTo(r.x1, -r.z1);
    s.lineTo(r.x1, -r.z0);
    s.closePath();
    for (const h of holes) s.holes.push(hole(h));
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return worldUV(g, 1);
  };
  const geos = useMemo(
    () => ({
      base: shapeGeo({ x0: -BOUNDS.x, x1: BOUNDS.x, z0: -BOUNDS.z, z1: BOUNDS.z }, [...PITS, PH]),
      rig: shapeGeo(RIG_LOT, [PITS[0]]),
      exit: shapeGeo(EXIT_LOT, [PITS[1]]),
    }),
    [],
  );
  return (
    <group>
      <mesh geometry={geos.base} position={[0, 0.003, 0]} material={lawn} receiveShadow />
      <group rotation={[0, CITY_ANGLE, 0]}>
        {[
          [1, -1],
          [-1, 1],
          [1, 1],
          [-1, -1],
        ].map(([sx, sz]) => (
          <Box key={`${sx}${sz}`} p={[sx * 13.6, 0.013, sz * 13.6]} s={[6, 0.02, 6]} m={plaza} shadow={false} />
        ))}
      </group>
      <mesh geometry={geos.rig} position={[0, 0.03, 0]} material={lot} receiveShadow />
      <mesh geometry={geos.exit} position={[0, 0.03, 0]} material={gravel} receiveShadow />
      {restored
        ? PITS.map((p, i) => <Box key={i} p={[(p.x0 + p.x1) / 2, 0.035, 0]} s={[p.x1 - p.x0 + 0.6, 0.02, p.z1 - p.z0 + 0.6]} m={patch} shadow={false} />)
        : null}
    </group>
  );
};
