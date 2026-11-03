// The HDD site in three.js (via @remotion/three): soil block with a cutaway section, existing utilities,
// streets and traffic, businesses, the drilling work area, crew, and the bore / drill string / reamer / conduit.
// Everything is driven by `state` (no internal animation), so every frame is deterministic.
import { useMemo } from "react";
import * as THREE from "three";
import { carPose, carsAt, greenFor } from "./traffic";
import { applyCut, BOUND_PLANES, CUT_X, mat, facadeTexture, sectionTexture, setCut } from "./materials";
import {
  BORE,
  BOUNDS,
  boreAt,
  CITY_ANGLE,
  cityToWorld,
  ENTRY_ANGLE,
  ENTRY_PIT,
  EXIT_PIT,
  LAYERS,
  RACK_LENGTH,
  ROAD_HALF,
  SIDEWALK,
  UTILITIES,
  utilityLine,
  VISE,
} from "./site";

export type WorldState = {
  frame: number;
  /** cutaway plane z (BOUNDS.z = closed, 0 = cut along the bore) */
  cut: number;
  /** 0..1: ground made see-through to show utilities (planning views) */
  xray: number;
  /** 0..1 how much of the planned path (white dashed) is drawn */
  plan: number;
  /** pilot drill head position along the bore (0 = entrance, 1 = exit), or null before drilling */
  pilot: number | null;
  /** reamer position (1 = exit, moving back to 0), or null */
  ream: number | null;
  /** pulling head position (1 = exit, moving back to 0), or null */
  pull: number | null;
  /** show drilling equipment and crew (false once the crossing is complete) */
  equipment: boolean;
  /** 0..1 sonde housing see-through (detail shot) */
  sondeReveal: number;
  /** locator position along the bore (fraction), when walking above the head */
  locatorU: number;
  /** 0..1 white paint marks on the surface along the planned route */
  marks: number;
  /** 0..1 sonde signal rings rising to the surface */
  signal: number;
};

/** Expanding rings from the sonde toward the surface (drawn on the section plane) */
const SignalRings: React.FC<{ u: number; t: number; strength: number }> = ({ u, t, strength }) => {
  const p = boreAt(Math.max(0, u - 0.007)).p;
  return (
    <group position={[p.x, p.y, 0.2]}>
      {[0, 1, 2].map((k) => {
        const ph = (t * 0.6 + k / 3) % 1;
        const r = 0.4 + ph * Math.abs(p.y) * 1.05;
        const m = new THREE.MeshBasicMaterial({ color: "#0E4D97", transparent: true, opacity: strength * 0.55 * (1 - ph), depthWrite: false });
        return (
          <mesh key={k} material={m}>
            <ringGeometry args={[r, r + 0.06, 64, 1, Math.PI * 0.08, Math.PI * 0.84]} />
          </mesh>
        );
      })}
    </group>
  );
};

const PAVE = "#6a6d70";
const CONCRETE = "#c6c3bc";
const GRASS = "#8e9b78";

// ---------- soil block with pits ----------

const pitHoles = () =>
  [ENTRY_PIT, EXIT_PIT].map((p) => {
    const h = new THREE.Path();
    h.moveTo(p.x0, -p.z);
    h.lineTo(p.x1, -p.z);
    h.lineTo(p.x1, p.z);
    h.lineTo(p.x0, p.z);
    h.closePath();
    return h;
  });

/** A horizontal slab of the block (footprint = bounds), optionally with the two pit holes */
const slabGeometry = (top: number, bottom: number, holes: boolean) => {
  const s = new THREE.Shape();
  s.moveTo(-BOUNDS.x, -BOUNDS.z);
  s.lineTo(BOUNDS.x, -BOUNDS.z);
  s.lineTo(BOUNDS.x, BOUNDS.z);
  s.lineTo(-BOUNDS.x, BOUNDS.z);
  s.closePath();
  if (holes) s.holes.push(...pitHoles());
  const g = new THREE.ExtrudeGeometry(s, { depth: top - bottom, bevelEnabled: false, steps: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bottom, 0);
  return g;
};

const Soil: React.FC<{ xray: number }> = ({ xray }) => {
  const geos = useMemo(() => LAYERS.map((l) => slabGeometry(l.top, l.bottom, l.top > -ENTRY_PIT.depth)), []);
  const mats = useMemo(
    () =>
      LAYERS.map((l) => {
        const m = new THREE.MeshStandardMaterial({ color: l.color, roughness: 0.95 });
        m.clippingPlanes = BOUND_PLANES;
        m.clipShadows = true;
        return applyCut(m);
      }),
    [],
  );
  // pit floors
  const op = 1 - 0.8 * xray;
  mats.forEach((m) => {
    m.transparent = op < 0.999;
    m.opacity = op;
    m.depthWrite = op > 0.999;
  });
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats[i]} />
      ))}
      {[ENTRY_PIT, EXIT_PIT].map((p, i) => (
        <mesh key={i} position={[(p.x0 + p.x1) / 2, -p.depth, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat({ color: "#6f5a45", rough: 1 })}>
          <planeGeometry args={[p.x1 - p.x0, p.z * 2]} />
        </mesh>
      ))}
    </group>
  );
};

/** Drilling fluid inside the pits (bentonite slurry: tan-gray, slightly glossy) */
const PitFluid: React.FC<{ level: number }> = ({ level }) => (
  <group>
    {[ENTRY_PIT, EXIT_PIT].map((p, i) => (
      <mesh key={i} position={[(p.x0 + p.x1) / 2, -p.depth + level, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat({ color: "#8a7d68", rough: 0.25, metal: 0.05 })}>
        <planeGeometry args={[p.x1 - p.x0 - 0.02, p.z * 2 - 0.02]} />
      </mesh>
    ))}
  </group>
);

/** Bore radius at u: enlarged behind the reamer, pilot size elsewhere */
type Hole = { to: number; enlargedFrom: number | null };
const PILOT_R = 0.13;
const holeR = (h: Hole, u: number) => (h.enlargedFrom !== null && u >= h.enlargedFrom ? REAMER_R : PILOT_R);

/** Section face on the cutaway plane (between the pits), with the bore opening cut into it, and the trench end walls */
const SectionFace: React.FC<{ cut: number; hole: Hole | null }> = ({ cut, hole }) => {
  const face = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-CUT_X, -BOUNDS.depth);
    s.lineTo(CUT_X, -BOUNDS.depth);
    s.lineTo(CUT_X, 0);
    s.lineTo(-CUT_X, 0);
    s.closePath();
    if (hole && hole.to > 0.004) {
      const u0 = 0.0015;
      const u1 = Math.min(0.9985, hole.to);
      const n = Math.max(8, Math.ceil((u1 - u0) / 0.003));
      const top: THREE.Vector2[] = [];
      const bot: THREE.Vector2[] = [];
      for (let i = 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * i) / n;
        const { p, tan } = boreAt(u);
        const r = holeR(hole, u);
        top.push(new THREE.Vector2(p.x - tan.y * r, p.y + tan.x * r));
        bot.push(new THREE.Vector2(p.x + tan.y * r, p.y - tan.x * r));
      }
      s.holes.push(new THREE.Path([...top, ...bot.reverse()]));
    }
    const g = new THREE.ShapeGeometry(s, 4);
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / 12;
      uv[i * 2 + 1] = (pos.getY(i) + BOUNDS.depth) / BOUNDS.depth;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, [hole?.to, hole?.enlargedFrom]);
  const wall = useMemo(() => {
    // end wall in the y-z plane, from the cut to the front edge, open where the pit meets it
    const len = BOUNDS.z;
    const s = new THREE.Shape();
    s.moveTo(0, -BOUNDS.depth);
    s.lineTo(len, -BOUNDS.depth);
    s.lineTo(len, 0);
    s.lineTo(ENTRY_PIT.z, 0);
    s.lineTo(ENTRY_PIT.z, -ENTRY_PIT.depth);
    s.lineTo(0, -ENTRY_PIT.depth);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / 12;
      uv[i * 2 + 1] = (pos.getY(i) + BOUNDS.depth) / BOUNDS.depth;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, []);
  if (cut >= BOUNDS.z - 0.01) return null;
  const m = mat({ color: "#ffffff", rough: 1, clip: "bounds", map: sectionTexture(), side: THREE.DoubleSide });
  return (
    <group>
      <mesh geometry={face} position={[0, 0, cut]} material={m} receiveShadow />
      {/* trench end walls at x = -CUT_X and +CUT_X, running from the cut to the front edge */}
      {[-CUT_X, CUT_X].map((x) => (
        <mesh key={x} geometry={wall} position={[x, 0, cut]} rotation={[0, -Math.PI / 2, 0]} scale={[(BOUNDS.z - cut) / BOUNDS.z, 1, 1]} material={m} receiveShadow />
      ))}
    </group>
  );
};

/** The drilled hole behind the section face: a half-pipe groove (z <= 0) with the bore radius */
const BoreGroove: React.FC<{ hole: Hole }> = ({ hole }) => {
  const g = useMemo(() => {
    const u0 = 0.0015;
    const u1 = Math.min(0.9985, hole.to);
    if (u1 - u0 < 0.003) return null;
    const n = Math.max(8, Math.ceil((u1 - u0) / 0.003));
    const seg = 12;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      const { p, tan } = boreAt(u);
      const r = holeR(hole, u);
      const nx = -tan.y;
      const ny = tan.x;
      for (let k = 0; k <= seg; k++) {
        const a = Math.PI / 2 + (Math.PI * k) / seg; // from +normal through -z to -normal
        const c = Math.sin(a);
        const d = Math.cos(a);
        pos.push(p.x + nx * r * c, p.y + ny * r * c, d * r);
      }
    }
    for (let i = 0; i < n; i++)
      for (let k = 0; k < seg; k++) {
        const a = i * (seg + 1) + k;
        const b = a + seg + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }, [hole.to, hole.enlargedFrom]);
  if (!g) return null;
  return <mesh geometry={g} material={mat({ color: "#5a4636", rough: 0.75, clip: "bounds", side: THREE.DoubleSide })} receiveShadow />;
};

// ---------- utilities ----------

const Utilities: React.FC<{ cut: number; xray: number }> = ({ cut, xray }) => {
  return (
    <group>
      {UTILITIES.map((u) => {
        const { point, dir } = utilityLine(u);
        const angle = Math.atan2(dir[0], dir[1]);
        const len = 220;
        const m = mat({ color: u.color, rough: u.kind === "duct" ? 0.9 : 0.55, side: THREE.DoubleSide });
        return (
          <group key={u.id} position={[point[0], u.depth, point[1]]} rotation={[0, angle, 0]}>
            {u.kind === "duct" ? (
              <mesh material={m}>
                <boxGeometry args={[u.radius * 2.4, u.radius * 1.6, len]} />
              </mesh>
            ) : (
              <mesh rotation={[Math.PI / 2, 0, 0]} material={m}>
                <cylinderGeometry args={[u.radius, u.radius, len, 28, 1, true]} />
              </mesh>
            )}
          </group>
        );
      })}
      {cut < BOUNDS.z - 0.01 && cut <= 0.01 ? <UtilitySections /> : null}
      {xray > 0 ? null : null}
    </group>
  );
};

/** Where each utility crosses the section plane: an ellipse in the utility color with a darker interior */
const UtilitySections: React.FC = () => (
  <group position={[0, 0, 0.015]}>
    {UTILITIES.map((u) => {
      const { dir, crossX } = utilityLine(u);
      if (Math.abs(crossX) > BOUNDS.x - 0.5) return null;
      const stretch = 1 / Math.abs(dir[1]);
      const outer = u.kind === "duct" ? null : u.radius;
      return (
        <group key={u.id} position={[crossX, u.depth, 0]} scale={[stretch, 1, 1]}>
          {outer ? (
            <>
              <mesh material={mat({ color: u.color, rough: 0.5, clip: "bounds" })}>
                <circleGeometry args={[outer, 40]} />
              </mesh>
              <mesh position={[0, 0, 0.004]} material={mat({ color: "#2a2724", rough: 1, clip: "bounds" })}>
                <circleGeometry args={[outer * 0.78, 40]} />
              </mesh>
            </>
          ) : (
            <>
              <mesh material={mat({ color: "#9d9a94", rough: 0.9, clip: "bounds" })}>
                <planeGeometry args={[u.radius * 2.4, u.radius * 1.6]} />
              </mesh>
              {[-0.45, 0, 0.45].map((k) => (
                <mesh key={k} position={[k * u.radius * 1.6, 0, 0.004]} material={mat({ color: u.color, rough: 0.5, clip: "bounds" })}>
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

// ---------- streets, sidewalks, lots ----------

const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; m: THREE.Material; shadow?: boolean; r?: number }> = ({ p, s, m, shadow, r = 0 }) => (
  <mesh position={p} rotation={[0, r, 0]} material={m} castShadow={shadow} receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);

const Streets: React.FC = () => {
  const L = 260;
  const asphalt = mat({ color: "#55585b", rough: 0.92 });
  const walk = mat({ color: CONCRETE, rough: 0.9 });
  const curb = mat({ color: "#b4b1aa", rough: 0.85 });
  const yellow = mat({ color: "#d9b443", rough: 0.6 });
  const white = mat({ color: "#e9e9e6", rough: 0.6 });
  const marks: React.ReactNode[] = [];
  // dashed lane lines and double yellow center, skipping the intersection box
  const edge = ROAD_HALF + SIDEWALK;
  for (const road of ["main", "cross"] as const) {
    for (let s = -L / 2; s < L / 2; s += 6) {
      if (Math.abs(s) < edge + 4) continue;
      for (const off of [-3.5, 3.5]) {
        const p: [number, number, number] = road === "main" ? [off, 0.016, s] : [s, 0.016, off];
        marks.push(<Box key={`${road}${s}${off}`} p={p} s={road === "main" ? [0.12, 0.01, 3] : [3, 0.01, 0.12]} m={white} />);
      }
    }
    for (const side of [-1, 1]) {
      for (const off of [-0.12, 0.12]) {
        const len = L / 2 - edge - 2;
        const c = side * (edge + 2 + len / 2);
        const p: [number, number, number] = road === "main" ? [off, 0.016, c] : [c, 0.016, off];
        marks.push(<Box key={`y${road}${side}${off}`} p={p} s={road === "main" ? [0.1, 0.01, len] : [len, 0.01, 0.1]} m={yellow} />);
      }
      // stop bar and crosswalk on each approach
      const stop = side * (edge + 1.2);
      marks.push(<Box key={`sb${road}${side}`} p={road === "main" ? [side * -3.5, 0.016, stop] : [stop, 0.016, side * 3.5]} s={road === "main" ? [7, 0.01, 0.4] : [0.4, 0.01, 7]} m={white} />);
      for (let k = -6; k <= 6; k += 1.2) {
        const cw = side * (edge - 1.2);
        marks.push(<Box key={`cw${road}${side}${k}`} p={road === "main" ? [k, 0.016, cw] : [cw, 0.016, k]} s={road === "main" ? [0.6, 0.01, 2.6] : [2.6, 0.01, 0.6]} m={white} />);
      }
    }
  }
  return (
    <group rotation={[0, CITY_ANGLE, 0]}>
      <Box p={[0, 0.005, 0]} s={[ROAD_HALF * 2, 0.02, L]} m={asphalt} />
      <Box p={[0, 0.006, 0]} s={[L, 0.02, ROAD_HALF * 2]} m={asphalt} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box p={[side * (ROAD_HALF + SIDEWALK / 2), 0.08, 0]} s={[SIDEWALK, 0.16, L]} m={walk} />
          <Box p={[0, 0.08, side * (ROAD_HALF + SIDEWALK / 2)]} s={[L, 0.16, SIDEWALK]} m={walk} />
          <Box p={[side * (ROAD_HALF + 0.1), 0.09, 0]} s={[0.2, 0.18, L]} m={curb} />
          <Box p={[0, 0.09, side * (ROAD_HALF + 0.1)]} s={[L, 0.18, 0.2]} m={curb} />
        </group>
      ))}
      {/* the intersection box itself stays clear of sidewalk slabs */}
      <Box p={[0, 0.17, 0]} s={[ROAD_HALF * 2, 0.002, ROAD_HALF * 2]} m={asphalt} />
      {marks}
    </group>
  );
};

/** Ground cover: plazas and lawns in the blocks, the two paved work lots (world aligned) */
/** Locate marks painted on the surface along each utility (APWA colors), shown in planning views */
const LocateMarks: React.FC<{ o: number }> = ({ o }) => {
  if (o <= 0.01) return null;
  const out: React.ReactNode[] = [];
  for (const u of UTILITIES) {
    const { point, dir } = utilityLine(u);
    const ang = Math.atan2(dir[0], dir[1]);
    const m = mat({ color: u.color, rough: 0.6, opacity: Math.round(o * 20) / 20, clip: "bounds", emissive: u.color });
    for (let k = -90; k <= 90; k += 2.2) {
      const x = point[0] + dir[0] * k;
      const z = point[1] + dir[1] * k;
      if (Math.abs(x) > BOUNDS.x - 0.6 || Math.abs(z) > BOUNDS.z - 0.6) continue;
      out.push(
        <mesh key={`${u.id}${k}`} position={[x, 0.2, z]} rotation={[0, ang, 0]} material={m}>
          <boxGeometry args={[0.28, 0.01, 1.3]} />
        </mesh>,
      );
    }
  }
  return <group>{out}</group>;
};

const Ground: React.FC<{ marks: number }> = ({ marks }) => {
  const lot = mat({ color: PAVE, rough: 0.95 });
  const paint = mat({ color: "#f4f4f2", rough: 0.6 });
  const lotWithHole = useMemo(() => {
    const mk = (x0: number, x1: number, z0: number, z1: number, pit: typeof ENTRY_PIT) => {
      const s = new THREE.Shape();
      s.moveTo(x0, -z1);
      s.lineTo(x1, -z1);
      s.lineTo(x1, -z0);
      s.lineTo(x0, -z0);
      s.closePath();
      const h = new THREE.Path();
      h.moveTo(pit.x0, -pit.z);
      h.lineTo(pit.x1, -pit.z);
      h.lineTo(pit.x1, pit.z);
      h.lineTo(pit.x0, pit.z);
      h.closePath();
      s.holes.push(h);
      const g = new THREE.ShapeGeometry(s);
      g.rotateX(-Math.PI / 2);
      return g;
    };
    return [mk(-59.5, -32, -10, 10, ENTRY_PIT), mk(32, 59.5, -7, 7, EXIT_PIT)];
  }, []);
  const ground = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-BOUNDS.x, -BOUNDS.z);
    s.lineTo(BOUNDS.x, -BOUNDS.z);
    s.lineTo(BOUNDS.x, BOUNDS.z);
    s.lineTo(-BOUNDS.x, BOUNDS.z);
    s.closePath();
    s.holes.push(...pitHoles());
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  // white paint dots along the planned route (APWA white = proposed excavation)
  const dots: React.ReactNode[] = [];
  if (marks > 0) {
    for (let x = -36; x <= 36; x += 2.4) {
      const u = (x + 36) / 72;
      if (u > marks) break;
      dots.push(<Box key={x} p={[x, 0.21, 0]} s={[1.3, 0.01, 0.35]} m={paint} />);
    }
  }
  return (
    <group>
      <mesh geometry={ground} position={[0, 0.002, 0]} material={mat({ color: GRASS, rough: 1 })} receiveShadow />
      {/* plazas in front of the businesses */}
      <group rotation={[0, CITY_ANGLE, 0]}>
        {/* only in the two blocks away from the work lots */}
        {[
          [1, -1],
          [-1, 1],
        ].map(([sx, sz]) => (
          <Box key={`${sx}${sz}`} p={[sx * 22, 0.012, sz * 22]} s={[24, 0.02, 24]} m={mat({ color: "#b3ada2", rough: 0.95 })} />
        ))}
      </group>
      {lotWithHole.map((g, i) => (
        <mesh key={i} geometry={g} position={[0, 0.03, 0]} material={lot} receiveShadow />
      ))}
      {dots}
    </group>
  );
};

// ---------- buildings, trees, signals ----------

type Building = { x: number; z: number; w: number; d: number; h: number; tone: string; awning: string };
const BUILDINGS: Building[] = (() => {
  const out: Building[] = [];
  const spots: [number, number, number, number, number][] = [
    // city x', z', width, depth, height
    [-19, -19, 14, 12, 16],
    [-35, -18, 12, 12, 12],
    [-18, -36, 12, 14, 22],
    [19, -19, 14, 14, 26],
    [36, -18, 12, 12, 14],
    [20, -37, 14, 12, 18],
    [-19, 19, 14, 14, 20],
    [-36, 18, 12, 12, 11],
    [-19, 37, 14, 12, 15],
    [19, 19, 13, 13, 12],
    [35, 20, 12, 13, 17],
    [19, 36, 12, 12, 24],
  ];
  const tones = ["#d4d0c8", "#c9ccce", "#bfb7aa", "#d9d6cf", "#b8bec4"];
  const awn = ["#4e6a7d", "#7a6a55", "#5f6f62", "#6e5d66", "#55606b"];
  spots.forEach(([x, z, w, d, h], i) => {
    const [wx, wz] = cityToWorld(x, z);
    const r = Math.hypot(w, d) / 2;
    if (Math.abs(wx) + r > BOUNDS.x - 1 || Math.abs(wz) + r > BOUNDS.z - 1) return;
    if (Math.abs(wz) < r + 2.5) return; // keep the bore line and the work lots clear
    out.push({ x, z, w, d, h, tone: tones[i % tones.length], awning: awn[i % awn.length] });
  });
  return out;
})();

const BuildingMesh: React.FC<{ b: Building }> = ({ b }) => {
  const tex = useMemo(() => {
    const t = facadeTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(b.w / 4)), b.h / 16);
    return t;
  }, [b.w, b.h]);
  const facade = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: b.tone, map: tex, roughness: 0.6, metalness: 0.05 });
    m.clippingPlanes = BOUND_PLANES;
    return m;
  }, [b.tone, tex]);
  const roof = mat({ color: "#9c9a95", rough: 0.9, clip: "bounds" });
  const base = mat({ color: "#a29b8f", rough: 0.8, clip: "bounds" });
  return (
    <group position={[b.x, 0, b.z]}>
      {/* ground-floor storefront */}
      <Box p={[0, 2.2, 0]} s={[b.w, 4.4, b.d]} m={base} shadow />
      <Box p={[0, 1.7, 0]} s={[b.w + 0.04, 2.6, b.d + 0.04]} m={mat({ color: "#41505c", rough: 0.15, metal: 0.4, clip: "bounds" })} />
      <Box p={[0, 3.3, 0]} s={[b.w + 0.9, 0.18, b.d + 0.9]} m={mat({ color: b.awning, rough: 0.8, clip: "bounds" })} shadow />
      <mesh position={[0, 4.4 + (b.h - 4.4) / 2, 0]} material={[facade, facade, roof, roof, facade, facade]} castShadow receiveShadow>
        <boxGeometry args={[b.w, b.h - 4.4, b.d]} />
      </mesh>
      <Box p={[b.w * 0.2, b.h + 0.6, -b.d * 0.15]} s={[3, 1.2, 2.4]} m={mat({ color: "#a7a9ab", rough: 0.7, clip: "bounds" })} shadow />
    </group>
  );
};

const TREES: [number, number][] = (() => {
  const out: [number, number][] = [];
  const edge = ROAD_HALF + SIDEWALK - 0.9;
  for (let s = 14; s < 70; s += 11) {
    for (const sign of [-1, 1]) {
      for (const side of [-1, 1]) {
        out.push([side * edge, sign * s]);
        out.push([sign * s, side * edge]);
      }
    }
  }
  return out.filter(([x, z]) => {
    const [wx, wz] = cityToWorld(x, z);
    return Math.abs(wx) < BOUNDS.x - 2 && Math.abs(wz) < BOUNDS.z - 2 && Math.abs(wz) > 3 && !(Math.abs(wx) > 30 && Math.abs(wz) < 11);
  });
})();

const Tree: React.FC<{ x: number; z: number; k: number }> = ({ x, z, k }) => {
  const h = 4.2 + (k % 3) * 0.6;
  return (
    <group position={[x, 0.16, z]}>
      <mesh position={[0, h / 2 - 0.6, 0]} material={mat({ color: "#6b5a48", rough: 0.9, clip: "bounds" })} castShadow>
        <cylinderGeometry args={[0.12, 0.16, h - 1.2, 8]} />
      </mesh>
      <mesh position={[0, h, 0]} scale={[1, 1.15, 1]} material={mat({ color: k % 2 ? "#6f8559" : "#7a8f63", rough: 0.9, clip: "bounds" })} castShadow>
        <icosahedronGeometry args={[1.7, 2]} />
      </mesh>
    </group>
  );
};

const Signals: React.FC<{ t: number }> = ({ t }) => {
  const g = greenFor(t);
  const edge = ROAD_HALF + 0.8;
  const pole = mat({ color: "#4a4e52", rough: 0.5, metal: 0.5, clip: "bounds" });
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
          <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
            <mesh position={[0, 3.2, 0]} material={pole} castShadow>
              <cylinderGeometry args={[0.1, 0.12, 6.4, 10]} />
            </mesh>
            <mesh position={[-3, 6.2, 0]} rotation={[0, 0, Math.PI / 2]} material={pole}>
              <cylinderGeometry args={[0.07, 0.07, 6, 8]} />
            </mesh>
            <group position={[-4.2, 5.6, 0]}>
              <Box p={[0, 0, 0]} s={[0.4, 1.1, 0.35]} m={mat({ color: "#2b2e31", rough: 0.6, clip: "bounds" })} />
              <mesh position={[0, 0.33, -0.19]} material={mat({ color: on ? "#3a2020" : "#ff5a4a", emissive: on ? undefined : "#d23a2a", clip: "bounds" })}>
                <circleGeometry args={[0.11, 16]} />
              </mesh>
              <mesh position={[0, -0.33, -0.19]} material={mat({ color: on ? "#59e3a0" : "#1f3329", emissive: on ? "#2fbf77" : undefined, clip: "bounds" })}>
                <circleGeometry args={[0.11, 16]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};

// ---------- vehicles and people ----------

const Car: React.FC<{ color: string; kind: string }> = ({ color, kind }) => {
  const body = mat({ color, rough: 0.35, metal: 0.55, clip: "bounds" });
  const glass = mat({ color: "#5a6875", rough: 0.08, metal: 0.5, clip: "bounds" });
  const tire = mat({ color: "#1d1e20", rough: 0.9, clip: "bounds" });
  const L = kind === "van" ? 5.2 : kind === "suv" ? 4.8 : 4.5;
  const H = kind === "van" ? 1.9 : kind === "suv" ? 1.55 : 1.25;
  return (
    <group>
      <mesh position={[0, 0.25 + H * 0.3, 0]} material={body} castShadow>
        <boxGeometry args={[1.8, H * 0.5, L]} />
      </mesh>
      <mesh position={[0, 0.25 + H * 0.7, kind === "van" ? 0.3 : -0.25]} material={body} castShadow>
        <boxGeometry args={[1.66, H * 0.36, kind === "van" ? L - 1.5 : L * 0.46]} />
      </mesh>
      <mesh position={[0, 0.25 + H * 0.7, kind === "van" ? 0.3 : -0.25]} material={glass}>
        <boxGeometry args={[1.68, H * 0.26, kind === "van" ? L - 1.6 : L * 0.44]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.85, 0.33, sz * (L / 2 - 0.85)]} rotation={[0, 0, Math.PI / 2]} material={tire}>
            <cylinderGeometry args={[0.33, 0.33, 0.25, 16]} />
          </mesh>
        )),
      )}
    </group>
  );
};

const Traffic: React.FC<{ frame: number; cut: number }> = ({ frame, cut }) => {
  const cars = carsAt(frame);
  return (
    <group>
      {cars.map((c, i) => {
        const p = carPose(c);
        const [wx, wz] = cityToWorld(p.x, p.z);
        if (Math.abs(wx) > BOUNDS.x - 2.5 || Math.abs(wz) > BOUNDS.z - 2.5 || (wz > cut - 1.2 && Math.abs(wx) < CUT_X + 1)) return null;
        return (
          <group key={i} position={[wx, 0, wz]} rotation={[0, p.heading + CITY_ANGLE, 0]}>
            <Car color={c.color} kind={c.kind} />
          </group>
        );
      })}
    </group>
  );
};

/** A crew member: hi-vis vest and hard hat (simple, proportionate figure) */
export const Person: React.FC<{ p: [number, number, number]; r?: number; vest?: string; hat?: string; holding?: "locator" | "radio" | null; walk?: number }> = ({
  p,
  r = 0,
  vest = "#c8d93a",
  hat = "#f2f2f0",
  holding = null,
  walk = 0,
}) => {
  const swing = Math.sin(walk * 6) * 0.35;
  const pants = mat({ color: "#2f3a4a", rough: 0.9, clip: "none" });
  const skin = mat({ color: "#b98b6e", rough: 0.8, clip: "none" });
  return (
    <group position={p} rotation={[0, r, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.12, 0.45, 0]} rotation={[s * swing, 0, 0]} material={pants} castShadow>
          <boxGeometry args={[0.18, 0.9, 0.22]} />
        </mesh>
      ))}
      <mesh position={[0, 1.22, 0]} material={mat({ color: vest, rough: 0.7, clip: "none" })} castShadow>
        <boxGeometry args={[0.5, 0.68, 0.3]} />
      </mesh>
      <mesh position={[0, 1.22, 0]} material={mat({ color: "#d9dadc", rough: 0.5, clip: "none" })}>
        <boxGeometry args={[0.52, 0.06, 0.32]} />
      </mesh>
      <mesh position={[0, 1.7, 0]} material={skin} castShadow>
        <sphereGeometry args={[0.13, 16, 12]} />
      </mesh>
      <mesh position={[0, 1.79, 0]} material={mat({ color: hat, rough: 0.4, clip: "none" })} castShadow>
        <sphereGeometry args={[0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`a${s}`} position={[s * 0.31, 1.18, holding && s === 1 ? 0.18 : 0]} rotation={[holding && s === 1 ? -1.0 : -s * swing, 0, 0]} material={mat({ color: vest, rough: 0.7, clip: "none" })} castShadow>
          <boxGeometry args={[0.12, 0.6, 0.14]} />
        </mesh>
      ))}
      {holding === "locator" ? (
        <group position={[0.31, 1.0, 0.45]}>
          <mesh material={mat({ color: "#e2e3e0", rough: 0.5, clip: "none" })} castShadow>
            <boxGeometry args={[0.14, 0.22, 0.55]} />
          </mesh>
          <mesh position={[0, 0.12, -0.1]} rotation={[-0.4, 0, 0]} material={mat({ color: "#1f2a33", rough: 0.2, clip: "none" })}>
            <boxGeometry args={[0.13, 0.02, 0.16]} />
          </mesh>
        </group>
      ) : null}
      {holding === "radio" ? (
        <mesh position={[0.31, 1.45, 0.2]} material={mat({ color: "#222", rough: 0.5, clip: "none" })}>
          <boxGeometry args={[0.07, 0.18, 0.05]} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---------- drilling equipment ----------

const steel = () => mat({ color: "#8b9198", rough: 0.35, metal: 0.7, clip: "none" });
const RIG_BODY = "#d5d7d4";
const RIG_DARK = "#3a3f44";
const RIG_TRIM = "#d9a62b"; // safety yellow, used sparingly on guards and handrails

/** Point on the rack: s = 0 at the vise, s = RACK_LENGTH at the top */
export const rackPoint = (s: number) => new THREE.Vector3(VISE.x - Math.cos(ENTRY_ANGLE) * s, VISE.y + Math.sin(ENTRY_ANGLE) * s, 0);

const DrillRig: React.FC<{ carriage: number }> = ({ carriage }) => {
  const body = mat({ color: RIG_BODY, rough: 0.55, metal: 0.15, clip: "none" });
  const dark = mat({ color: RIG_DARK, rough: 0.6, metal: 0.2, clip: "none" });
  const trim = mat({ color: RIG_TRIM, rough: 0.5, clip: "none" });
  const mid = rackPoint(RACK_LENGTH / 2);
  const car = rackPoint(carriage);
  return (
    <group>
      {/* tracks and chassis */}
      {[-1, 1].map((s) => (
        <Box key={s} p={[mid.x - 0.6, 0.36, s * 0.95]} s={[6.2, 0.72, 0.55]} m={dark} shadow />
      ))}
      <Box p={[mid.x - 0.6, 0.95, 0]} s={[6.6, 0.5, 2.2]} m={body} shadow />
      {/* engine / power unit at the rear */}
      <Box p={[mid.x - 3.0, 1.8, 0]} s={[2.0, 1.4, 2.1]} m={body} shadow />
      <Box p={[mid.x - 3.0, 1.8, 1.06]} s={[1.6, 0.9, 0.02]} m={dark} />
      {/* rack (inclined beam) */}
      <mesh position={[mid.x, mid.y + 0.25, 0]} rotation={[0, 0, -ENTRY_ANGLE]} material={dark} castShadow>
        <boxGeometry args={[RACK_LENGTH, 0.35, 0.7]} />
      </mesh>
      {/* rotation carriage that pushes the drill pipe */}
      <group position={[car.x, car.y + 0.6, 0]} rotation={[0, 0, -ENTRY_ANGLE]}>
        <Box p={[0, 0, 0]} s={[0.9, 0.7, 0.9]} m={body} shadow />
        <Box p={[0.5, 0, 0]} s={[0.12, 0.5, 0.5]} m={dark} />
      </group>
      {/* vise and wrench at the front, and the front stake-down anchor */}
      <group position={[VISE.x + 0.1, VISE.y + 0.25, 0]} rotation={[0, 0, -ENTRY_ANGLE]}>
        <Box p={[0, 0, 0]} s={[0.6, 0.6, 0.8]} m={dark} shadow />
        <Box p={[0, 0.32, 0]} s={[0.62, 0.05, 0.82]} m={trim} />
      </group>
      <Box p={[VISE.x + 0.4, 0.2, 0]} s={[0.5, 0.4, 2.0]} m={dark} shadow />
      {/* rod loader / magazine on the right side */}
      <group position={[mid.x - 0.4, mid.y + 0.75, -0.95]} rotation={[0, 0, -ENTRY_ANGLE]}>
        <Box p={[0, 0, 0]} s={[3.2, 0.7, 0.5]} m={body} shadow />
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[0, 0.42, -0.12 + k * 0.12]} rotation={[0, 0, Math.PI / 2]} material={steel()}>
            <cylinderGeometry args={[0.05, 0.05, 3.0, 10]} />
          </mesh>
        ))}
      </group>
      {/* operator station with canopy, left side */}
      <group position={[mid.x - 1.4, 1.2, 1.55]}>
        <Box p={[0, 0.35, 0]} s={[1.3, 0.7, 0.9]} m={body} shadow />
        <Box p={[0.3, 0.85, 0]} s={[0.5, 0.35, 0.7]} m={dark} />
        {[-0.55, 0.55].map((x) => (
          <Box key={x} p={[x, 1.25, 0.38]} s={[0.06, 1.6, 0.06]} m={trim} />
        ))}
        <Box p={[0, 2.05, 0]} s={[1.5, 0.08, 1.1]} m={body} shadow />
      </group>
    </group>
  );
};

/** Drilling fluid mixing and recycling unit, water truck, rod trailer, crew truck, fence and cones */
const SupportEquipment: React.FC = () => {
  const white = mat({ color: "#dcdcd8", rough: 0.6, clip: "none" });
  const dark = mat({ color: RIG_DARK, rough: 0.6, clip: "none" });
  const tank = mat({ color: "#b9bcbf", rough: 0.4, metal: 0.4, clip: "none" });
  const fence = mat({ color: "#e57d2a", rough: 0.8, clip: "none", opacity: 0.32, side: THREE.DoubleSide });
  const cone = mat({ color: "#e36b1e", rough: 0.6, clip: "none" });
  const posts: React.ReactNode[] = [];
  // work zone fence around the rig lot (x -58..-33, z -9..9)
  const rect: [number, number][] = [
    [-58, -9],
    [-33, -9],
    [-33, 9],
    [-58, 9],
  ];
  rect.forEach(([x0, z0], i) => {
    const [x1, z1] = rect[(i + 1) % 4];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(x1 - x0, z1 - z0);
    posts.push(
      <mesh key={`f${i}`} position={[(x0 + x1) / 2, 0.6, (z0 + z1) / 2]} rotation={[0, ang, 0]} material={fence}>
        <planeGeometry args={[0.01, 1.2]} />
      </mesh>,
    );
    posts.push(
      <mesh key={`fp${i}`} position={[(x0 + x1) / 2, 0.6, (z0 + z1) / 2]} rotation={[0, ang + Math.PI / 2, 0]} material={fence}>
        <planeGeometry args={[len, 1.1]} />
      </mesh>,
    );
  });
  const cones: [number, number][] = [];
  for (let x = -32; x <= -26; x += 2) cones.push([x, 9.4], [x, -9.4]);
  for (let x = 38.8; x <= 44; x += 1.8) cones.push([x, 3.2], [x, -3.2]);
  return (
    <group>
      {/* fluid system */}
      <group position={[-53.5, 0, -5.2]}>
        <Box p={[0, 1.0, 0]} s={[5.2, 2.0, 2.3]} m={white} shadow />
        <Box p={[-1.2, 2.3, 0]} s={[1.4, 0.6, 1.4]} m={dark} shadow />
        <Box p={[1.6, 2.15, 0.3]} s={[1.0, 0.3, 1.0]} m={dark} />
      </group>
      {/* water truck */}
      <group position={[-51.5, 0, 4.6]}>
        <Box p={[3.0, 1.35, 0]} s={[1.9, 1.9, 2.3]} m={white} shadow />
        <Box p={[3.55, 1.75, 0]} s={[0.82, 0.7, 2.32]} m={mat({ color: "#5a6875", rough: 0.1, metal: 0.5, clip: "none" })} />
        <Box p={[0.3, 0.72, 0]} s={[7.0, 0.3, 1.9]} m={dark} shadow />
        <mesh position={[-0.6, 1.75, 0]} rotation={[0, 0, Math.PI / 2]} material={tank} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 4.4, 28]} />
        </mesh>
        {[-2.2, -1.0, 2.9].map((x) =>
          [-1, 1].map((sz) => (
            <mesh key={`${x}${sz}`} position={[x, 0.48, sz * 1.0]} rotation={[Math.PI / 2, 0, 0]} material={mat({ color: "#1d1e20", rough: 0.9, clip: "none" })} castShadow>
              <cylinderGeometry args={[0.48, 0.48, 0.32, 18]} />
            </mesh>
          )),
        )}
      </group>
      {/* drill rod trailer */}
      <group position={[-44, 0, 6.4]}>
        <Box p={[0, 0.5, 0]} s={[5.4, 0.25, 1.8]} m={dark} shadow />
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} position={[0, 0.75 + (k % 2) * 0.11, -0.5 + k * 0.25]} rotation={[0, 0, Math.PI / 2]} material={steel()} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 4.6, 10]} />
          </mesh>
        ))}
      </group>
      {/* crew truck */}
      <group position={[-56.5, 0, 6.8]} rotation={[0, 0, 0]}>
        <Car color="#e8e8e6" kind="suv" />
      </group>
      {posts}
      {cones.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} material={cone} castShadow>
          <coneGeometry args={[0.18, 0.7, 14]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- bore, drill string, tools ----------

/** Points along the bore from u0 to u1 */
const borePoints = (u0: number, u1: number, step = 0.004) => {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(2, Math.ceil(Math.abs(u1 - u0) / step));
  for (let i = 0; i <= n; i++) pts.push(boreAt(u0 + ((u1 - u0) * i) / n).p);
  return pts;
};

const Tube: React.FC<{ pts: THREE.Vector3[]; r: number; m: THREE.Material; shadow?: boolean }> = ({ pts, r, m, shadow }) => {
  const g = useMemo(() => {
    if (pts.length < 2) return null;
    const c = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    return new THREE.TubeGeometry(c, Math.min(600, pts.length * 2), r, 14, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts.length, pts[0]?.x, pts[pts.length - 1]?.x, pts[pts.length - 1]?.y, r]);
  if (!g) return null;
  return <mesh geometry={g} material={m} castShadow={shadow} />;
};

const PlannedPath: React.FC<{ plan: number }> = ({ plan }) => {
  if (plan <= 0) return null;
  const dashes: React.ReactNode[] = [];
  const m = mat({ color: "#ffffff", rough: 0.4, clip: "none", emissive: "#bcbcbc" });
  for (let u = 0; u < plan; u += 0.018) {
    const a = boreAt(u).p;
    const b = boreAt(Math.min(plan, u + 0.011)).p;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    dashes.push(
      <mesh key={u} position={[mid.x, mid.y, 0.05]} rotation={[0, 0, ang]} material={m}>
        <boxGeometry args={[len, 0.09, 0.09]} />
      </mesh>,
    );
  }
  return <group>{dashes}</group>;
};

/** Drill bit (slanted face for steering) with the sonde housing behind it */
const DrillHead: React.FC<{ u: number; reveal: number }> = ({ u, reveal }) => {
  const { p, tan } = boreAt(u);
  const ang = Math.atan2(tan.y, tan.x);
  const housing = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#a9adb2", roughness: 0.3, metalness: 0.75 });
    return m;
  }, []);
  housing.transparent = reveal > 0;
  housing.opacity = 1 - 0.72 * reveal;
  housing.depthWrite = reveal === 0;
  return (
    <group position={[p.x, p.y, 0]} rotation={[0, 0, ang]}>
      {/* sonde housing */}
      <mesh position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={housing} castShadow>
        <cylinderGeometry args={[0.105, 0.105, 0.95, 24]} />
      </mesh>
      {/* sonde (battery-powered transmitter) */}
      <mesh position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat({ color: "#F78228", rough: 0.4, clip: "none", emissive: reveal > 0 ? "#7a3a0a" : undefined })}>
        <capsuleGeometry args={[0.05, 0.5, 6, 16]} />
      </mesh>
      {/* bit with slanted face */}
      <mesh position={[0.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={mat({ color: "#6c7178", rough: 0.35, metal: 0.8, clip: "none" })} castShadow>
        <cylinderGeometry args={[0.06, 0.12, 0.3, 20]} />
      </mesh>
      <mesh position={[0.22, 0.03, 0]} rotation={[0, 0, -0.5]} material={mat({ color: "#8d939a", rough: 0.3, metal: 0.8, clip: "none" })} castShadow>
        <boxGeometry args={[0.2, 0.03, 0.2]} />
      </mesh>
    </group>
  );
};

/** Barrel-style reamer (larger diameter, fluted) */
export const REAMER_R = 0.33;
const Reamer: React.FC<{ u: number }> = ({ u }) => {
  const { p, tan } = boreAt(u);
  const ang = Math.atan2(tan.y, tan.x);
  const m = mat({ color: "#7f858c", rough: 0.35, metal: 0.8, clip: "none" });
  const cutter = mat({ color: "#5a5f65", rough: 0.4, metal: 0.8, clip: "none" });
  return (
    <group position={[p.x, p.y, 0]} rotation={[0, 0, ang]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={m} castShadow>
        <cylinderGeometry args={[REAMER_R * 0.55, REAMER_R, 0.5, 24]} />
      </mesh>
      <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m} castShadow>
        <cylinderGeometry args={[REAMER_R, REAMER_R * 0.6, 0.4, 24]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[0.2, Math.cos((k * Math.PI) / 3) * REAMER_R * 0.85, Math.sin((k * Math.PI) / 3) * REAMER_R * 0.85]} material={cutter}>
          <boxGeometry args={[0.7, 0.06, 0.06]} />
        </mesh>
      ))}
    </group>
  );
};

/** Pullback assembly behind the reamer: swivel, then pulling head, then the conduit */
const PullAssembly: React.FC<{ u: number }> = ({ u }) => {
  const reamerU = u;
  const swivelU = Math.min(1, u + 0.9 / 80);
  const headU = Math.min(1, u + 1.4 / 80);
  const s = boreAt(swivelU);
  const h = boreAt(headU);
  const steelM = mat({ color: "#9aa0a6", rough: 0.3, metal: 0.85, clip: "none" });
  return (
    <group>
      <Reamer u={reamerU} />
      <group position={[s.p.x, s.p.y, 0]} rotation={[0, 0, Math.atan2(s.tan.y, s.tan.x)]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={steelM} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.45, 18]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={mat({ color: "#F78228", rough: 0.5, clip: "none" })}>
          <cylinderGeometry args={[0.105, 0.105, 0.06, 18]} />
        </mesh>
      </group>
      <group position={[h.p.x, h.p.y, 0]} rotation={[0, 0, Math.atan2(h.tan.y, h.tan.x)]}>
        <mesh rotation={[0, 0, -Math.PI / 2]} material={steelM} castShadow>
          <cylinderGeometry args={[0.09, 0.2, 0.4, 20]} />
        </mesh>
      </group>
    </group>
  );
};

export const CONDUIT_R = 0.2;

/** The conduit string from the pulling head out through the exit pit and along the surface on rollers */
const Conduit: React.FC<{ from: number; complete?: boolean }> = ({ from, complete }) => {
  const startU = complete ? 0.004 : Math.min(1, from + 1.6 / 80);
  const pts = useMemo(() => {
    const under = startU < 1 ? borePoints(startU, complete ? 0.996 : 1, 0.006) : [boreAt(1).p];
    if (complete) return under;
    // rises out of the exit pit at the exit angle, then lies on rollers going east
    const end = boreAt(1).p;
    const out = [new THREE.Vector3(end.x + 2.2, end.y + 0.62, 0), new THREE.Vector3(end.x + 4.2, 0.45, 0), new THREE.Vector3(end.x + 6, 0.42, 0), new THREE.Vector3(BOUNDS.x + 5, 0.42, 0)];
    return [...under, ...out];
  }, [startU, complete]);
  return <Tube pts={pts} r={CONDUIT_R} m={mat({ color: "#2b2d30", rough: 0.45, clip: "bounds" })} shadow />;
};

const Rollers: React.FC = () => (
  <group>
    {[44, 49, 54, 59].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        <Box p={[0, 0.12, 0]} s={[0.5, 0.24, 1.0]} m={mat({ color: "#4a4f55", rough: 0.7, clip: "bounds" })} shadow />
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat({ color: "#9aa0a6", rough: 0.4, metal: 0.6, clip: "bounds" })}>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 10]} />
        </mesh>
      </group>
    ))}
  </group>
);

/** Rig-side drill string: from the carriage down the rack, into the pit, along the bore to `to` */
const DrillString: React.FC<{ carriage: number; to: number }> = ({ carriage, to }) => {
  const pts = useMemo(() => {
    const c = rackPoint(carriage);
    const start = boreAt(0).p;
    const above = [new THREE.Vector3(c.x, c.y + 0.6, 0)];
    // straight along the rack line to the pit wall
    const n = 8;
    for (let i = 1; i <= n; i++) above.push(new THREE.Vector3(c.x, c.y + 0.6, 0).lerp(start, i / n));
    return [...above, ...(to > 0.002 ? borePoints(0.002, to, 0.005) : [])];
  }, [carriage, to]);
  return <Tube pts={pts} r={0.065} m={steel()} shadow />;
};

// ---------- the whole site ----------

export const World: React.FC<{ s: WorldState }> = ({ s }) => {
  setCut(s.cut);
  const t = s.frame / 30;
  const cutting = s.cut < BOUNDS.z - 0.01;
  // which tool is at the front of the drill string
  const front = s.pull ?? s.ream ?? s.pilot;
  const ROD = 3 / 80; // one drill rod (about 3 m) as a bore fraction
  // carriage moves down the rack as each rod is pushed (pilot) or up as it is pulled back
  const carriage = front === null ? RACK_LENGTH - 0.8 : 0.9 + (RACK_LENGTH - 1.8) * (s.pilot !== null && s.ream === null && s.pull === null ? 1 - ((front / ROD) % 1) : (front / ROD) % 1);
  const enlargedFrom = s.ream !== null ? s.ream : s.pull !== null || !s.equipment ? 0 : null;
  const locator = boreAt(s.locatorU).p;
  const drilled = s.pilot === null ? 0 : s.ream === null && s.pull === null && s.equipment ? s.pilot : 1;
  const hole: Hole | null = s.pilot === null && s.equipment ? null : { to: s.equipment ? drilled : 1, enlargedFrom };
  /** hidden when inside the removed (cut) region */
  const removed = (x: number, z: number) => z > s.cut && Math.abs(x) < CUT_X;
  return (
    <group>
      <Soil xray={s.xray} />
      <PitFluid level={s.equipment ? 0.55 : 0.0} />
      {s.equipment ? null : (
        // pits backfilled after the installation
        [ENTRY_PIT, EXIT_PIT].map((p, i) => <Box key={i} p={[(p.x0 + p.x1) / 2, -0.02, 0]} s={[p.x1 - p.x0, 0.06, p.z * 2]} m={mat({ color: PAVE, rough: 0.95 })} />)
      )}
      <SectionFace cut={s.cut} hole={s.cut <= 0.01 ? hole : null} />
      <Utilities cut={s.cut} xray={s.xray} />
      <Ground marks={s.marks} />
      <LocateMarks o={s.xray} />
      <Streets />
      {BUILDINGS.map((b, i) => {
        const [wx, wz] = cityToWorld(b.x, b.z);
        if (removed(wx, wz)) return null;
        return (
          <group key={i} rotation={[0, CITY_ANGLE, 0]}>
            <BuildingMesh b={b} />
          </group>
        );
      })}
      <group rotation={[0, CITY_ANGLE, 0]}>
        {TREES.map(([x, z], i) => {
          const [wx, wz] = cityToWorld(x, z);
          return removed(wx, wz - 0.5) ? null : <Tree key={i} x={x} z={z} k={i} />;
        })}
      </group>
      {cutting && s.cut > 0.5 ? null : null}
      <Signals t={t} />
      <Traffic frame={s.frame} cut={s.cut} />
      {hole && cutting && s.cut <= 0.01 ? <BoreGroove hole={hole} /> : null}
      <PlannedPath plan={s.plan} />
      {s.equipment ? (
        <>
          <DrillRig carriage={carriage} />
          <SupportEquipment />
          <Rollers />
          {front !== null ? <DrillString carriage={carriage} to={front} /> : null}
          {s.pilot !== null && s.ream === null && s.pull === null ? <DrillHead u={s.pilot} reveal={s.sondeReveal} /> : null}
          {s.signal > 0 && s.pilot !== null ? <SignalRings u={s.pilot} t={t} strength={s.signal} /> : null}
          {s.ream !== null ? <Reamer u={s.ream} /> : null}
          {s.pull !== null ? <PullAssembly u={s.pull} /> : null}
          {/* crew */}
          <Person p={[rackPoint(RACK_LENGTH / 2).x - 1.4, 1.2, 1.55]} r={Math.PI / 2} holding="radio" />
          <Person p={[VISE.x - 0.6, 0, -1.6]} r={Math.PI / 2} />
          <Person p={[-51, 0, -2.6]} r={0.6} />
          <Person p={[locator.x, 0.2, -1.2]} r={-Math.PI / 2} holding="locator" />
          <Person p={[41.5, 0, -2]} r={-Math.PI / 2} holding="radio" />
        </>
      ) : null}
      {s.pull !== null || !s.equipment ? <Conduit from={s.pull ?? 0} complete={!s.equipment} /> : null}
    </group>
  );
};

export { BORE };
