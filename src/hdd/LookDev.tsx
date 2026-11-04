// Look-development still: one camera pose and site state per `view` (used to check the 3D site).
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useAssets } from "./assets";
import type { Pose } from "./camera";
import { Scene } from "./Scene";
import type { WorldState } from "./World";

export const BASE_STATE: WorldState = {
  frame: 300,
  cut: 45,
  xray: 0,
  planSurface: 0,
  planProfile: 0,
  marks: 0,
  pothole: false,
  pilot: null,
  ream: null,
  pull: null,
  complete: false,
  sondeReveal: 0,
  signal: 0,
  ghostFront: 0,
  pipeStaged: true,
  locatorPose: "locate",
  operatorTalking: false,
  exitWork: false,
  planReview: false,
  bitAttached: true,
  roll: 0,
  enlargedFrom: null,
};
export const VIEWS: Record<string, { pose: Pose; state: Partial<WorldState> }> = {
  overview: { pose: { pos: [0, 62, 108], target: [0, -2, -4], fov: 40 }, state: { planSurface: 1 } },
  rig: { pose: { pos: [-28, 10, 24], target: [-47, 1, -1], fov: 40 }, state: { pilot: 0.05 } },
  section: { pose: { pos: [0, 6, 70], target: [0, -3, 0], fov: 38 }, state: { cut: 0, pilot: 0.55, ghostFront: 1 } },
  entry: { pose: { pos: [-35.5, 1.6, 9], target: [-40, -0.3, 0], fov: 40 }, state: { cut: 0, pilot: 0.03, ghostFront: 1 } },
  head: { pose: { pos: [-7.8, -4.3, 3.2], target: [-10.2, -4.85, 0], fov: 32 }, state: { cut: 0, pilot: 0.37, sondeReveal: 1, ghostFront: 1 } },
  ream: { pose: { pos: [30, -1.6, 8], target: [26, -3, 0], fov: 38 }, state: { cut: 0, pilot: 1, ream: 0.82, ghostFront: 1, bitAttached: false, enlargedFrom: 0.82 } },
  pull: { pose: { pos: [36, 2.2, 10], target: [42, 0, 0], fov: 42 }, state: { cut: 0, pilot: 1, pull: 0.985, ghostFront: 1, bitAttached: false, enlargedFrom: 0 } },
  plan: { pose: { pos: [0, 120, 34], target: [0, 0, 0], fov: 40 }, state: { xray: 1, planSurface: 1, marks: 1, pothole: true } },
  pothole: { pose: { pos: [4, 6, 9], target: [-2.6, -0.4, -1], fov: 40 }, state: { marks: 1, pothole: true, planSurface: 1 } },
  rigside: { pose: { pos: [-44, 3.2, 13], target: [-46.5, 1.4, 0], fov: 40 }, state: { pilot: 0.05 } },
  rigrear: { pose: { pos: [-56, 3.5, -9], target: [-47, 1.4, 0], fov: 40 }, state: { pilot: 0.05 } },
  people: { pose: { pos: [-41, 2.6, 6.5], target: [-47, 1.4, 0.5], fov: 40 }, state: { pilot: 0.05 } },
};

export const LookDev: React.FC<{ view: string }> = ({ view }) => {
  const { width, height } = useVideoConfig();
  const a = useAssets();
  const v = VIEWS[view] ?? VIEWS.overview;
  if (!a) return null;
  return (
    <AbsoluteFill>
      <Scene width={width} height={height} pose={v.pose} state={{ ...BASE_STATE, ...v.state }} a={a} />
    </AbsoluteFill>
  );
};
