import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";

/**
 * Slow-moving brand background. Gives every frame subtle motion without distracting from text.
 * "glow" = soft color blobs (friendly). "grid" = fine technical grid that drifts slowly (industrial).
 */
export const BrandBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const { brand } = useBrand();
  const t = frame / Math.max(durationInFrames, 1);
  const drift = (from: number, to: number) => interpolate(t, [0, 1], [from, to]);
  const { colors } = brand;

  if (brand.style.background === "grid") {
    const cell = Math.round(width / 18);
    return (
      <AbsoluteFill style={{ backgroundColor: colors.background, overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${colors.secondary}1A 1px, transparent 1px), linear-gradient(90deg, ${colors.secondary}1A 1px, transparent 1px)`,
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${drift(0, cell * 2)}px ${drift(0, cell)}px`,
          }}
        />
        <AbsoluteFill
          style={{ background: `radial-gradient(ellipse at ${drift(30, 60)}% 20%, ${colors.primary}33 0%, transparent 60%)` }}
        />
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${colors.background}00 35%, ${colors.background}E6 100%)` }} />
      </AbsoluteFill>
    );
  }

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
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${colors.background}00 40%, ${colors.background}CC 100%)` }} />
    </AbsoluteFill>
  );
};
