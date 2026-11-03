// Look-development still: one camera pose and site state per `view` (used to check the 3D site).
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { Pose } from "./camera";
import { Scene } from "./Scene";
import type { WorldState } from "./World";

const base: WorldState = { frame: 300, cut: 40, xray: 0, plan: 0, pilot: null, ream: null, pull: null, equipment: true, sondeReveal: 0, locatorU: 0.5, marks: 0, signal: 0 };
export const VIEWS: Record<string, { pose: Pose; state: Partial<WorldState> }> = {
  aerial: { pose: { pos: [70, 75, 95], target: [0, 0, 0], fov: 38 }, state: {} },
  street: { pose: { pos: [12, 4, 30], target: [-6, 3, 0], fov: 45 }, state: {} },
  cutaway: { pose: { pos: [18, 22, 78], target: [0, -2, 0], fov: 38 }, state: { cut: 0, pilot: 0.55, locatorU: 0.55 } },
  rig: { pose: { pos: [-30, 9, 22], target: [-46, 1, 0], fov: 40 }, state: { pilot: 0.05, cut: 0 } },
  head: { pose: { pos: [-7.5, -3.6, 4.5], target: [-10.2, -4.7, 0], fov: 32 }, state: { cut: 0, pilot: 0.37, sondeReveal: 1, locatorU: 0.37 } },
  ream: { pose: { pos: [22, 2, 26], target: [14, -4, 0], fov: 38 }, state: { cut: 0, pilot: 1, ream: 0.65 } },
  pull: { pose: { pos: [48, 6, 22], target: [36, -0.5, 0], fov: 40 }, state: { cut: 0, pilot: 1, pull: 0.9 } },
  plan: { pose: { pos: [0, 120, 30], target: [0, 0, 0], fov: 40 }, state: { xray: 1, plan: 1, marks: 1, equipment: true } },
};

export const LookDev: React.FC<{ view: string }> = ({ view }) => {
  const { width, height } = useVideoConfig();
  const v = VIEWS[view] ?? VIEWS.aerial;
  return (
    <AbsoluteFill>
      <Scene width={width} height={height} pose={v.pose} state={{ ...base, ...v.state }} />
    </AbsoluteFill>
  );
};
