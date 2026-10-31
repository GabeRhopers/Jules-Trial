import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";

/**
 * Slow-moving brand background. Gives every frame subtle motion without distracting from text.
 * "glow" = soft color blobs (friendly). "grid" = fine technical grid that drifts slowly (industrial).
 * "hearts" = glow plus hearts floating up (personal messages, celebrations).
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
      {brand.style.background === "hearts" ? <FloatingHearts /> : null}
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

const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/** Hearts rising from the bottom with a gentle sway. Deterministic per index, so every render is identical. */
const FloatingHearts: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const { brand } = useBrand();
  const palette = [brand.colors.primary, brand.colors.secondary, brand.colors.accent];
  const count = 18;
  return (
    <AbsoluteFill>
      {Array.from({ length: count }, (_, i) => {
        const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
        const size = width * (0.04 + r(1) * 0.07);
        const period = fps * (7 + r(2) * 6);
        const p = ((frame + r(3) * period) % period) / period;
        const y = height + size - p * (height + size * 2);
        const x = r(4) * width + Math.sin(p * Math.PI * 4 + i) * width * 0.04;
        const opacity = interpolate(p, [0, 0.15, 0.85, 1], [0, 0.45, 0.45, 0]);
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            style={{ position: "absolute", left: x - size / 2, top: y, opacity, transform: `rotate(${Math.sin(p * 6 + i) * 15}deg)` }}
          >
            <path d={HEART_PATH} fill={palette[i % palette.length]} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};
