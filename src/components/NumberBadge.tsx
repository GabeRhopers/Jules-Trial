import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";

/** List number ("1", "2", "3") in a brand-shaped badge: a circle for pill brands, a rounded square otherwise. */
export const NumberBadge: React.FC<{ number: number; size: number; delay?: number }> = ({ number, size, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const pop = spring({ frame: frame - delay, fps, config: motion.pop.spring });
  return (
    <div
      data-qc="badge"
      style={{
        width: size,
        height: size,
        borderRadius: Math.min(brand.style.cornerRadius, size / 2),
        backgroundColor: brand.colors.primary,
        color: brand.colors.textOnPrimary,
        fontFamily: fonts.heading,
        fontWeight: 700,
        fontSize: size * 0.58,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: Math.min(1, pop * 1.5),
        transform: `scale(${interpolate(pop, [0, 1], [brand.style.motion === "bold" ? 0 : 0.85, 1])}) rotate(${interpolate(pop, [0, 1], [motion.pop.rotate, 0])}deg)`,
        boxShadow: `0 ${size * 0.08}px ${size * 0.25}px rgba(0,0,0,0.35)`,
        flexShrink: 0,
      }}
    >
      {number}
    </div>
  );
};
