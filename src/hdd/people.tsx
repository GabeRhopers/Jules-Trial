// Proportionate, articulated people (about 1.78 m): crew in PPE (hard hat with brim, hi-vis vest with
// reflective bands, safety glasses, gloves, work boots) and pedestrians in everyday clothes.
// Poses are explicit per role, so every action is deliberate and deterministic.
import * as THREE from "three";
import { mat } from "./materials";

export type Pose =
  | "stand"
  | "walk"
  | "locate" // holding the receiver out, reading it
  | "radio" // radio to the mouth
  | "locateRadio" // receiver in one hand, radio in the other
  | "operate" // seated at the controls, hands on the joysticks
  | "tablet" // reviewing the plan on a tablet
  | "monitor" // standing, hand on a valve or rail, watching
  | "point";

type P = {
  p: [number, number, number];
  /** heading: the person faces +z rotated by r */
  r?: number;
  pose?: Pose;
  /** walk phase in seconds (animates legs and arms) */
  t?: number;
  crew?: boolean;
  shirt?: string;
  pants?: string;
  skin?: string;
  hat?: string;
  /** legs walk while the arms keep the pose (e.g. a locator walking with the receiver) */
  moving?: boolean;
};

const SKIN = ["#c79a7c", "#a87656", "#8a5a3e", "#e0b89b", "#6f4a33"];
export const skinTone = (k: number) => SKIN[k % SKIN.length];

const Limb: React.FC<{ len: number; r0: number; r1: number; m: THREE.Material; children?: React.ReactNode; rx?: number; rz?: number; y: number; x: number; z?: number }> = ({ len, r0, r1, m, children, rx = 0, rz = 0, y, x, z = 0 }) => (
  <group position={[x, y, z]} rotation={[rx, 0, rz]}>
    <mesh position={[0, -len / 2, 0]} material={m} castShadow>
      <capsuleGeometry args={[(r0 + r1) / 2, len - (r0 + r1), 4, 10]} />
    </mesh>
    <group position={[0, -len, 0]}>{children}</group>
  </group>
);

export const Person: React.FC<P> = ({ p, r = 0, pose = "stand", t = 0, crew = true, shirt = "#4d6378", pants = "#2f3a48", skin = "#c79a7c", hat = "#f4f4f1", moving = false }) => {
  const walking = pose === "walk" || moving;
  const ph = t * 5.2;
  const swing = walking ? Math.sin(ph) * 0.45 : 0;
  const knee = walking ? Math.max(0, Math.sin(ph + 1.2)) * 0.6 : 0;
  const knee2 = walking ? Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * 0.6 : 0;
  const bob = walking ? Math.abs(Math.cos(ph)) * 0.03 : 0;
  const seated = pose === "operate";
  const mPants = mat({ color: pants, rough: 0.9, clip: "none" });
  const mShirt = mat({ color: crew ? "#3f4d5c" : shirt, rough: 0.85, clip: "none" });
  const mVest = mat({ color: "#cddc2a", rough: 0.75, clip: "none" });
  const mBand = mat({ color: "#e8e9ea", rough: 0.25, metal: 0.4, clip: "none" });
  const mSkin = mat({ color: skin, rough: 0.75, clip: "none" });
  const mBoot = mat({ color: crew ? "#4a3a2a" : "#2b2b2d", rough: 0.8, clip: "none" });
  const mGlove = mat({ color: crew ? "#d7c48a" : skin, rough: 0.9, clip: "none" });
  const mHat = mat({ color: hat, rough: 0.35, clip: "none" });
  const mDark = mat({ color: "#1f2326", rough: 0.4, clip: "none" });
  const hipY = seated ? 0.52 : 0.94 + bob;

  // arm angles per pose: [shoulder x-rotation (forward = negative), shoulder z (out), elbow x]
  const arm = (side: 1 | -1): [number, number, number] => {
    switch (pose) {
      case "walk":
        return [-swing * side * 0.8, side * 0.06, -0.25];
      case "stand":
        return [0.05, side * 0.07, -0.15];
      case "locate":
        return side === 1 ? [-0.75, 0.05, -0.55] : [0.05, -0.06, -0.15];
      case "locateRadio":
        return side === 1 ? [-0.75, 0.05, -0.55] : [-0.35, -0.55, -2.1];
      case "radio":
        return side === -1 ? [-0.35, -0.55, -2.1] : [0.05, 0.06, -0.15];
      case "operate":
        return [-0.95, side * 0.12, -0.55];
      case "tablet":
        return [-0.6, side * 0.22, -1.05];
      case "monitor":
        return side === 1 ? [-0.9, 0.12, -0.2] : [0.05, -0.06, -0.2];
      case "point":
        return side === 1 ? [-1.45, 0.1, 0] : [0.05, -0.06, -0.15];
      default:
        return [0.05, side * 0.07, -0.15];
    }
  };
  const Arm: React.FC<{ side: 1 | -1 }> = ({ side }) => {
    const [sx, sz, ex] = arm(side);
    const hold = (pose === "locate" || pose === "locateRadio") && side === 1;
    const radio = ((pose === "radio" || pose === "locateRadio") && side === -1) || (pose === "operate" && false);
    return (
      <Limb x={side * 0.21} y={1.42 + bob} len={0.3} r0={0.05} r1={0.045} m={crew ? mShirt : mShirt} rx={sx} rz={sz}>
        <Limb x={0} y={0} len={0.27} r0={0.042} r1={0.036} m={crew ? mShirt : mSkin} rx={ex}>
          <mesh position={[0, -0.04, 0]} material={mGlove} castShadow>
            <sphereGeometry args={[0.045, 10, 8]} />
          </mesh>
          {hold ? (
            // walkover receiver: handle, body, display facing the user
            <group position={[0, -0.06, 0.12]} rotation={[0.5 - sx - ex, 0, 0]}>
              <mesh material={mat({ color: "#e4e5e1", rough: 0.45, clip: "none" })} castShadow>
                <boxGeometry args={[0.13, 0.16, 0.5]} />
              </mesh>
              <mesh position={[0, 0.085, -0.12]} rotation={[-0.35, 0, 0]} material={mat({ color: "#16212a", rough: 0.15, clip: "none", emissive: "#0d2a3c" })}>
                <boxGeometry args={[0.11, 0.01, 0.13]} />
              </mesh>
              <mesh position={[0, -0.2, 0.2]} material={mat({ color: "#3a3f44", rough: 0.6, clip: "none" })}>
                <boxGeometry args={[0.1, 0.28, 0.08]} />
              </mesh>
            </group>
          ) : null}
          {radio ? (
            <mesh position={[0, -0.05, 0.03]} material={mDark}>
              <boxGeometry args={[0.055, 0.15, 0.035]} />
            </mesh>
          ) : null}
          {pose === "tablet" && side === 1 ? (
            <mesh position={[-0.19, -0.04, 0.08]} rotation={[0.9, 0, 0]} material={mDark}>
              <boxGeometry args={[0.3, 0.012, 0.22]} />
            </mesh>
          ) : null}
        </Limb>
      </Limb>
    );
  };
  const legX = (side: 1 | -1): [number, number] => {
    if (seated) return [-1.5, 1.45];
    if (walking) return side === 1 ? [swing, knee] : [-swing, knee2];
    return [0, 0.02];
  };
  return (
    <group position={p} rotation={[0, r, 0]}>
      {/* legs */}
      {([1, -1] as const).map((side) => {
        const [hx, kx] = legX(side);
        return (
          <Limb key={side} x={side * 0.1} y={hipY} len={0.46} r0={0.075} r1={0.06} m={mPants} rx={hx}>
            <Limb x={0} y={0} len={0.44} r0={0.058} r1={0.048} m={mPants} rx={kx}>
              <mesh position={[0, -0.03, 0.05]} material={mBoot} castShadow>
                <boxGeometry args={[0.11, 0.1, 0.27]} />
              </mesh>
            </Limb>
          </Limb>
        );
      })}
      {/* torso and hips */}
      <mesh position={[0, hipY + 0.06, 0]} material={mPants} castShadow>
        <boxGeometry args={[0.33, 0.16, 0.2]} />
      </mesh>
      <group position={[0, seated ? 0.52 - 0.94 : bob, 0]}>
        <mesh position={[0, 1.2, 0]} material={mShirt} castShadow>
          <capsuleGeometry args={[0.165, 0.3, 4, 12]} />
        </mesh>
        {crew ? (
          <>
            <mesh position={[0, 1.2, 0]} scale={[1.07, 1, 1.12]} material={mVest} castShadow>
              <capsuleGeometry args={[0.165, 0.26, 4, 12]} />
            </mesh>
            {[1.1, 1.26].map((y) => (
              <mesh key={y} position={[0, y, 0]} scale={[1.09, 1, 1.15]} material={mBand}>
                <cylinderGeometry args={[0.168, 0.168, 0.035, 16, 1, true]} />
              </mesh>
            ))}
          </>
        ) : null}
        {/* neck and head */}
        <mesh position={[0, 1.55, 0]} material={mSkin}>
          <cylinderGeometry args={[0.05, 0.055, 0.08, 10]} />
        </mesh>
        <mesh position={[0, 1.66, 0.01]} scale={[0.92, 1.08, 1]} material={mSkin} castShadow>
          <sphereGeometry args={[0.105, 18, 14]} />
        </mesh>
        {crew ? (
          <>
            {/* hard hat: shell and brim; safety glasses */}
            <mesh position={[0, 1.715, 0.005]} material={mHat} castShadow>
              <sphereGeometry args={[0.122, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh position={[0, 1.712, 0.03]} material={mHat}>
              <cylinderGeometry args={[0.15, 0.15, 0.012, 20]} />
            </mesh>
            <mesh position={[0, 1.67, 0.095]} material={mat({ color: "#2b3a44", rough: 0.1, metal: 0.4, clip: "none" })}>
              <boxGeometry args={[0.15, 0.03, 0.02]} />
            </mesh>
          </>
        ) : (
          <mesh position={[0, 1.71, -0.01]} material={mat({ color: "#3b2f26", rough: 0.9, clip: "none" })}>
            <sphereGeometry args={[0.108, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        )}
        <Arm side={1} />
        <Arm side={-1} />
      </group>
    </group>
  );
};
