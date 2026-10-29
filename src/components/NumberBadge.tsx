import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Circle with a list number ("1", "2", "3") that pops in with a small overshoot. */
export const NumberBadge: React.FC<{
  number: number;
  size: number;
  fontFamily: string;
  background: string;
  color: string;
  delay?: number;
}> = ({ number, size, fontFamily, background, color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 160, mass: 0.6 } });
  return (
    <div
      data-qc="badge"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: background,
        color,
        fontFamily,
        fontWeight: 800,
        fontSize: size * 0.58,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${pop}) rotate(${interpolate(pop, [0, 1], [-25, 0])}deg)`,
        boxShadow: `0 ${size * 0.08}px ${size * 0.25}px rgba(0,0,0,0.35)`,
        flexShrink: 0,
      }}
    >
      {number}
    </div>
  );
};
