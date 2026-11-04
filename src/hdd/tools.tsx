// Downhole tooling and product pipe, proportionate to each other (illustrative sizes in site.SIZES):
// drill string from the rig carriage through the vise into the bore, drill bit + sonde housing, reamer,
// swivel, pulling head, trailing rods behind the reamer, and the product pipe on rollers at the exit side.
import { useMemo } from "react";
import * as THREE from "three";
import { mat } from "./materials";
import { Box, Cyl, spindlePoint } from "./rig";
import { BOUNDS, boreAt, EXIT_LOT, SIZES } from "./site";

const steel = () => mat({ color: "#8c939a", rough: 0.32, metal: 0.8, clip: "none" });

const borePoints = (u0: number, u1: number, step = 0.004) => {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(2, Math.ceil(Math.abs(u1 - u0) / step));
  for (let i = 0; i <= n; i++) pts.push(boreAt(u0 + ((u1 - u0) * i) / n).p);
  return pts;
};

export const Tube: React.FC<{ pts: THREE.Vector3[]; r: number; m: THREE.Material; shadow?: boolean }> = ({ pts, r, m, shadow }) => {
  const key = pts.length ? `${pts.length}:${pts[0].x.toFixed(3)}:${pts[pts.length - 1].x.toFixed(3)}:${pts[pts.length - 1].y.toFixed(3)}` : "";
  const g = useMemo(() => {
    if (pts.length < 2) return null;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), Math.min(800, pts.length * 3), r, 14, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, r]);
  if (!g) return null;
  return <mesh geometry={g} material={m} castShadow={shadow} />;
};

/** Rig-side drill string: from the carriage spindle, down the frame, through the vise, into the bore to `to` */
export const DrillString: React.FC<{ carriage: number; to: number }> = ({ carriage, to }) => {
  const pts = useMemo(() => {
    const c = spindlePoint(carriage - 0.5);
    const entry = boreAt(0).p;
    const above: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) above.push(c.clone().lerp(entry, i / 10));
    return [...above, ...(to > 0.004 ? borePoints(0.004, to, 0.004) : [])];
  }, [carriage, to]);
  return <Tube pts={pts} r={SIZES.rod} m={steel()} shadow />;
};

/** Rods trailing behind the reamer to the exit pit (added at the exit, so the string stays in the hole) */
export const TrailingRods: React.FC<{ from: number }> = ({ from }) => {
  const pts = useMemo(() => {
    const end = boreAt(1).p;
    const tan = boreAt(1).tan;
    return [...borePoints(Math.min(1, from + 0.006), 1, 0.004), end.clone().addScaledVector(tan, 1.0)];
  }, [from]);
  if (from > 0.99) return null;
  return <Tube pts={pts} r={SIZES.rod} m={steel()} shadow />;
};

/** Drill bit (slanted steering face) and sonde housing; `reveal` makes the housing see-through to show the sonde */
export const DrillHead: React.FC<{ u: number; reveal: number; roll: number }> = ({ u, reveal, roll }) => {
  const { p, tan } = boreAt(u);
  const ang = Math.atan2(tan.y, tan.x);
  const housing = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a8adb3", roughness: 0.3, metalness: 0.8 }), []);
  housing.transparent = reveal > 0;
  housing.opacity = 1 - 0.75 * reveal;
  housing.depthWrite = reveal === 0;
  const R = SIZES.sondeHousing;
  return (
    <group position={[p.x, p.y, 0]} rotation={[0, 0, ang]}>
      <group rotation={[roll, 0, 0]}>
        {/* sonde housing: slots along its length let the signal out */}
        <mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={housing} castShadow>
          <cylinderGeometry args={[R, R, 0.72, 24]} />
        </mesh>
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[-0.42 + (k - 1) * 0.18, R * 0.98, 0]} material={mat({ color: "#2b2f33", rough: 0.6, clip: "none" })}>
            <boxGeometry args={[0.12, 0.006, 0.02]} />
          </mesh>
        ))}
        {/* sonde (battery-powered transmitter) */}
        <mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat({ color: "#F78228", rough: 0.4, clip: "none" })}>
          <capsuleGeometry args={[R * 0.6, 0.45, 6, 16]} />
        </mesh>
        {/* bit body and slanted face */}
        <mesh position={[0.02, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={mat({ color: "#6b7077", rough: 0.35, metal: 0.8, clip: "none" })} castShadow>
          <cylinderGeometry args={[R * 0.9, SIZES.bit, 0.16, 20]} />
        </mesh>
        <mesh position={[0.13, SIZES.bit * 0.25, 0]} rotation={[0, 0, -0.55]} material={mat({ color: "#959ba2", rough: 0.3, metal: 0.85, clip: "none" })} castShadow>
          <boxGeometry args={[0.16, 0.02, SIZES.bit * 1.8]} />
        </mesh>
      </group>
    </group>
  );
};

/** Fluted barrel reamer; `spin` rotates it with the drill string */
export const Reamer: React.FC<{ u: number; spin: number }> = ({ u, spin }) => {
  const { p, tan } = boreAt(u);
  const ang = Math.atan2(tan.y, tan.x);
  const body = mat({ color: "#7d838a", rough: 0.35, metal: 0.8, clip: "none" });
  const cutter = mat({ color: "#53585e", rough: 0.4, metal: 0.8, clip: "none" });
  const R = SIZES.reamer;
  return (
    <group position={[p.x, p.y, 0]} rotation={[0, 0, ang]}>
      <group rotation={[spin, 0, 0]}>
        {/* tapered toward the rig (it is pulled in -x direction) */}
        <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={body} castShadow>
          <cylinderGeometry args={[R * 0.4, R, 0.36, 24]} />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={body} castShadow>
          <cylinderGeometry args={[R, R, 0.32, 24]} />
        </mesh>
        <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={body} castShadow>
          <cylinderGeometry args={[R, R * 0.45, 0.2, 24]} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={k} position={[0, Math.cos((k * Math.PI) / 3) * R * 0.92, Math.sin((k * Math.PI) / 3) * R * 0.92]} rotation={[(k * Math.PI) / 3, 0, 0]} material={cutter}>
            <boxGeometry args={[0.62, 0.035, 0.05]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Offsets (m along the bore) from the reamer to the swivel and the pulling head */
export const SWIVEL_OFF = 0.75;
export const HEAD_OFF = 1.25;
export const PIPE_OFF = 1.55;
const L = () => boreAt(1).p.distanceTo(boreAt(0).p) * 1.03; // ~ bore length

/** Pullback assembly: reamer (rotating) -> swivel (isolates rotation) -> pulling head (fixed to the pipe) */
export const PullAssembly: React.FC<{ u: number; spin: number }> = ({ u, spin }) => {
  const len = L();
  const s = boreAt(Math.min(1, u + SWIVEL_OFF / len));
  const h = boreAt(Math.min(1, u + HEAD_OFF / len));
  const st = mat({ color: "#9aa0a6", rough: 0.3, metal: 0.85, clip: "none" });
  const dark = mat({ color: "#3b4045", rough: 0.4, metal: 0.6, clip: "none" });
  return (
    <group>
      <Reamer u={u} spin={spin} />
      {/* short link from the reamer to the swivel */}
      <Tube pts={[boreAt(u).p, s.p]} r={SIZES.rod * 0.9} m={steel()} />
      <group position={[s.p.x, s.p.y, 0]} rotation={[0, 0, Math.atan2(s.tan.y, s.tan.x)]}>
        {/* swivel: rotating front half (with the reamer), fixed rear half (with the pipe) */}
        <group rotation={[spin, 0, 0]}>
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={st} castShadow>
            <cylinderGeometry args={[0.085, 0.085, 0.24, 20]} />
          </mesh>
          <Box p={[-0.12, 0.086, 0]} s={[0.2, 0.01, 0.03]} m={dark} shadow={false} />
        </group>
        <mesh position={[0.0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat({ color: "#F78228", rough: 0.5, clip: "none" })}>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 20]} />
        </mesh>
        <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={st} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.24, 20]} />
        </mesh>
      </group>
      <Tube pts={[s.p, h.p]} r={0.03} m={dark} />
      <group position={[h.p.x, h.p.y, 0]} rotation={[0, 0, Math.atan2(h.tan.y, h.tan.x)]}>
        {/* pulling head: tapered nose with an eye, fused into the pipe */}
        <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={st} castShadow>
          <cylinderGeometry args={[0.04, SIZES.conduit, 0.32, 24]} />
        </mesh>
        <mesh position={[-0.11, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={dark}>
          <torusGeometry args={[0.045, 0.014, 8, 16]} />
        </mesh>
      </group>
    </group>
  );
};

/** Roller stands along the exit-side staging area (pipe supported, smooth approach into the exit pit) */
export const ROLLERS = [44.5, 48, 51.5, 55, 58.5, 62, 65.5, 69];
export const PIPE_Y = 0.62;
export const Rollers: React.FC = () => (
  <group>
    {ROLLERS.filter((x) => x < BOUNDS.x).map((x) => (
      <group key={x} position={[x, 0.03, 0]}>
        <Box p={[0, 0.03, 0]} s={[0.6, 0.06, 1.0]} m={mat({ color: "#4a4f55", rough: 0.7, clip: "bounds" })} />
        {[-0.38, 0.38].map((z) => (
          <Box key={z} p={[0, 0.23, z]} s={[0.08, 0.4, 0.08]} m={mat({ color: "#4a4f55", rough: 0.7, clip: "bounds" })} />
        ))}
        <Cyl p={[0, PIPE_Y - SIZES.conduit - 0.05 - 0.03, 0]} r={0.05} h={0.72} m={mat({ color: "#9aa0a6", rough: 0.4, metal: 0.6, clip: "bounds" })} rot={[Math.PI / 2, 0, 0]} />
      </group>
    ))}
  </group>
);

/** Product pipe (HDPE): installed part from `from` to the exit, then up out of the exit pit onto the rollers */
export const ProductPipe: React.FC<{ from: number; installed?: boolean }> = ({ from, installed }) => {
  const pts = useMemo(() => {
    const len = L();
    const start = installed ? 0.004 : Math.min(0.999, from + PIPE_OFF / len);
    const under = borePoints(start, installed ? 0.996 : 1, 0.004);
    if (installed) return under;
    // smooth, supported approach: exit tangent, gentle sag bend, then level on the rollers
    const e = boreAt(1);
    const out = [
      e.p.clone().addScaledVector(e.tan, 1.2),
      new THREE.Vector3(e.p.x + 3.6, 0.32, 0),
      new THREE.Vector3(e.p.x + 6.0, PIPE_Y - 0.02, 0),
      new THREE.Vector3(ROLLERS[1], PIPE_Y, 0),
      new THREE.Vector3(EXIT_LOT.x1 + 6, PIPE_Y, 0),
    ];
    return [...under, ...out];
  }, [from, installed]);
  return (
    <group>
      <Tube pts={pts} r={SIZES.conduit} m={mat({ color: "#2b2d30", rough: 0.42, clip: "bounds" })} shadow />
    </group>
  );
};
