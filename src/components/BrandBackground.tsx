import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Brand } from "../lib/types";

/** Slow-moving brand gradient. Gives every frame subtle motion without distracting from text. */
export const BrandBackground: React.FC<{ brand: Brand }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const t = frame / Math.max(durationInFrames, 1);
  const drift = (from: number, to: number) => interpolate(t, [0, 1], [from, to]);
  const { colors } = brand;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: width * 1.4,
          height: width * 1.4,
          left: drift(-0.5, -0.2) * width,
          top: drift(-0.15, 0.05) * height,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.secondary}55 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: width * 1.3,
          height: width * 1.3,
          right: drift(-0.6, -0.3) * width,
          bottom: drift(-0.1, 0.1) * height,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.primary}44 0%, transparent 65%)`,
        }}
      />
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg, ${colors.background}00 40%, ${colors.background}CC 100%)` }}
      />
    </AbsoluteFill>
  );
};
