// Camera poses and smooth interpolation between keyframes (eased, no sudden moves).
import * as THREE from "three";

export type Pose = { pos: [number, number, number]; target: [number, number, number]; fov: number };
export type Key = Pose & { t: number };

const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Pose at time t along keyframes (held before the first and after the last) */
export const poseAt = (keys: Key[], t: number): Pose => {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const k = smooth((t - a.t) / Math.max(1e-6, b.t - a.t));
      return { pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), fov: a.fov + (b.fov - a.fov) * k };
    }
  }
  return keys[keys.length - 1];
};

/** Project a world point to pixel coordinates for 2D labels (same math as the 3D camera) */
const cam = new THREE.PerspectiveCamera();
export const project = (pose: Pose, p: [number, number, number], width: number, height: number) => {
  cam.fov = pose.fov;
  cam.aspect = width / height;
  cam.near = 0.1;
  cam.far = 2000;
  cam.position.set(...pose.pos);
  cam.lookAt(...pose.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, visible: v.z < 1 && v.z > -1 };
};
