// Example site for "wetlands, streams and river crossings": a stream with wetland banks, the bore passing
// beneath the channel, conduit installed, pits set back from the banks. Cut along the bore (z = 0).
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { Pose } from "./camera";

const W = 34;
const D = 16;
const DEPTH = 8;
const CHANNEL = { x0: -5, x1: 5, depth: 1.6 };

// bore beneath the channel, entering and exiting well back from the banks
const PATH = new THREE.CatmullRomCurve3(
  [
    [-15, -0.2],
    [-11, -1.6],
    [-6, -3.6],
    [0, -4.2],
    [6, -3.6],
    [11, -1.6],
    [15, -0.2],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
  false,
  "centripetal",
);

const Cam: React.FC<{ pose: Pose }> = ({ pose }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pose.pos);
  camera.fov = pose.fov;
  camera.lookAt(...pose.target);
  camera.updateProjectionMatrix();
  return null;
};

/** Section outline of the ground (x-y), with the channel notch */
const groundShape = () => {
  const s = new THREE.Shape();
  s.moveTo(-W / 2, -DEPTH);
  s.lineTo(W / 2, -DEPTH);
  s.lineTo(W / 2, 0);
  s.lineTo(CHANNEL.x1 + 1.5, 0);
  s.quadraticCurveTo(CHANNEL.x1, -0.2, CHANNEL.x1 - 1.2, -CHANNEL.depth);
  s.lineTo(CHANNEL.x0 + 1.2, -CHANNEL.depth);
  s.quadraticCurveTo(CHANNEL.x0, -0.2, CHANNEL.x0 - 1.5, 0);
  s.lineTo(-W / 2, 0);
  s.closePath();
  return s;
};

const CreekWorld: React.FC = () => {
  const ground = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(groundShape(), { depth: D / 2, bevelEnabled: false });
    g.translate(0, 0, -D / 2);
    return g;
  }, []);
  const conduit = useMemo(() => new THREE.TubeGeometry(PATH, 200, 0.2, 14, false), []);
  const groove = useMemo(() => {
    // half-pipe behind the section face
    const n = 160;
    const seg = 10;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = PATH.getPointAt(t);
      const tan = PATH.getTangentAt(t);
      for (let k = 0; k <= seg; k++) {
        const a = Math.PI / 2 + (Math.PI * k) / seg;
        pos.push(p.x - tan.y * 0.33 * Math.sin(a), p.y + tan.x * 0.33 * Math.sin(a), Math.cos(a) * 0.33 + 0.002);
      }
    }
    for (let i = 0; i < n; i++)
      for (let k = 0; k < seg; k++) {
        const a = i * (seg + 1) + k;
        const b = a + seg + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  const reeds = useMemo(() => {
    const out: [number, number, number, number][] = [];
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const x = side * (CHANNEL.x1 + 0.6 + rnd() * 5.5);
      const z = -D / 2 + 0.3 + rnd() * (D / 2 - 0.6);
      out.push([x, z, 0.5 + rnd() * 0.9, rnd()]);
    }
    return out;
  }, []);
  const soil = new THREE.MeshStandardMaterial({ color: "#8f7257", roughness: 1 });
  const top = new THREE.MeshStandardMaterial({ color: "#7f9163", roughness: 1 });
  return (
    <group>
      <mesh geometry={ground} material={[soil, soil]} receiveShadow />
      {/* wetland ground cover on the top surface */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 4 + CHANNEL.x1 / 2 + 0.75), 0.01, -D / 4]} rotation={[-Math.PI / 2, 0, 0]} material={top} receiveShadow>
          <planeGeometry args={[W / 2 - CHANNEL.x1 - 1.5, D / 2]} />
        </mesh>
      ))}
      {/* water */}
      <mesh position={[0, -0.35, -D / 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CHANNEL.x1 - CHANNEL.x0 + 2.6, D / 2]} />
        <meshStandardMaterial color="#5f7f8c" roughness={0.08} metalness={0.2} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -0.95, 0.001]}>
        <planeGeometry args={[CHANNEL.x1 - CHANNEL.x0 + 1.8, 1.2]} />
        <meshStandardMaterial color="#4f6f7d" roughness={0.3} transparent opacity={0.7} />
      </mesh>
      {reeds.map(([x, z, h, k], i) => (
        <mesh key={i} position={[x, h / 2, z]} rotation={[0, 0, (k - 0.5) * 0.25]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, h, 5]} />
          <meshStandardMaterial color={k > 0.5 ? "#6f7f4f" : "#8a8a55"} roughness={0.9} />
        </mesh>
      ))}
      <mesh geometry={groove}>
        <meshStandardMaterial color="#5a4636" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={conduit} castShadow>
        <meshStandardMaterial color="#2b2d30" roughness={0.45} />
      </mesh>
      {/* entry and exit points, set back from the banks */}
      {[-15, 15].map((x) => (
        <mesh key={x} position={[x, 0.02, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshStandardMaterial color="#6a6d70" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

export const CREEK_ANCHORS = {
  channel: [0, -0.4, 0] as [number, number, number],
  conduit: [3, -4.1, 0.2] as [number, number, number],
};

export const CreekScene: React.FC<{ width: number; height: number; pose: Pose }> = ({ width, height, pose }) => (
  <ThreeCanvas width={width} height={height} shadows camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 500 }}>
    <Cam pose={pose} />
    <color attach="background" args={["#e6e9ec"]} />
    <hemisphereLight args={["#eef3f8", "#8a7a66", 1.1]} />
    <directionalLight position={[20, 30, 18]} intensity={2.2} color="#fff6ea" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} />
    <mesh position={[0, -DEPTH - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#dfe2e5" roughness={1} />
    </mesh>
    <CreekWorld />
  </ThreeCanvas>
);
