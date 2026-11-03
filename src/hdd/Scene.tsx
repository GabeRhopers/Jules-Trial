// 3D viewport: lighting, camera and the HDD site. Rendered with @remotion/three (frame-accurate).
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Pose } from "./camera";
import { World, type WorldState } from "./World";

const CameraRig: React.FC<{ pose: Pose }> = ({ pose }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  gl.localClippingEnabled = true;
  camera.position.set(...pose.pos);
  camera.fov = pose.fov;
  camera.near = 0.1;
  camera.far = 2000;
  camera.lookAt(...pose.target);
  camera.updateProjectionMatrix();
  return null;
};

export const Scene: React.FC<{ width: number; height: number; pose: Pose; state: WorldState }> = ({ width, height, pose, state }) => (
  <ThreeCanvas
    width={width}
    height={height}
    shadows
    gl={{ antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true } as never}
    camera={{ fov: pose.fov, position: pose.pos, near: 0.1, far: 2000 }}
    onCreated={({ gl }) => {
      gl.localClippingEnabled = true;
    }}
    style={{ background: "#e8ebee" }}
  >
    <CameraRig pose={pose} />
    <color attach="background" args={["#e6e9ec"]} />
    <fog attach="fog" args={["#e6e9ec", 160, 420]} />
    <hemisphereLight args={["#eef3f8", "#8a7a66", 1.1]} />
    <directionalLight
      position={[55, 95, 45]}
      intensity={2.4}
      color="#fff6ea"
      castShadow
      shadow-mapSize-width={4096}
      shadow-mapSize-height={4096}
      shadow-camera-left={-80}
      shadow-camera-right={80}
      shadow-camera-top={80}
      shadow-camera-bottom={-80}
      shadow-camera-near={1}
      shadow-camera-far={300}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
    />
    <directionalLight position={[-60, 40, 80]} intensity={0.55} color="#dfe8f3" />
    {/* soft floor under the diorama */}
    <mesh position={[0, -10.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1200, 1200]} />
      <meshStandardMaterial color="#dfe2e5" roughness={1} />
    </mesh>
    <World s={state} />
  </ThreeCanvas>
);
