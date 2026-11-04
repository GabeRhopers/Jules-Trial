// 3D viewport: natural lighting (CC0 sky HDRI as environment light + a warm sun with soft shadows), the
// camera, and the site. Rendered frame-accurately with @remotion/three.
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Assets } from "./assets";
import type { Pose } from "./camera";
import { World, type WorldState } from "./World";

const CameraRig: React.FC<{ pose: Pose; a: Assets }> = ({ pose, a }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  gl.localClippingEnabled = true;
  if (scene.environment !== a.hdri) {
    scene.environment = a.hdri;
    scene.environmentIntensity = 0.55;
  }
  camera.position.set(...pose.pos);
  camera.fov = pose.fov;
  camera.near = 0.1;
  camera.far = 2000;
  camera.lookAt(...pose.target);
  camera.updateProjectionMatrix();
  return null;
};

/** MSAA: off for fast review renders, on for the final (set by the composition via setAntialias) */
let AA = false;
export const setAntialias = (on: boolean) => {
  AA = on;
};
export const Scene: React.FC<{ width: number; height: number; pose: Pose; state: WorldState; a: Assets }> = ({ width, height, pose, state, a }) => (
  <ThreeCanvas
    width={width}
    height={height}
    shadows
    gl={{ antialias: AA, preserveDrawingBuffer: true } as never}
    camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 2000 }}
    onCreated={({ gl }) => {
      gl.localClippingEnabled = true;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
    }}
    style={{ background: "#e9ecef" }}
  >
    <CameraRig pose={pose} a={a} />
    <color attach="background" args={["#e7eaed"]} />
    <fog attach="fog" args={["#e7eaed", 220, 520]} />
    <hemisphereLight args={["#eef3f8", "#8a7a66", 0.45]} />
    <directionalLight
      position={[60, 90, 55]}
      intensity={2.3}
      color="#fff4e4"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-90}
      shadow-camera-right={90}
      shadow-camera-top={90}
      shadow-camera-bottom={-90}
      shadow-camera-near={1}
      shadow-camera-far={320}
      shadow-bias={-0.0003}
      shadow-normalBias={0.04}
      shadow-radius={3}
    />
    <mesh position={[0, -12.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1400, 1400]} />
      <meshStandardMaterial color="#dfe2e5" roughness={1} />
    </mesh>
    <World a={a} s={state} />
  </ThreeCanvas>
);
