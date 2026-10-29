import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";
import type { Stat } from "../lib/types";

/** Number that counts up to its value, with prefix/suffix and a short label. */
export const StatCounter: React.FC<{ stat: Stat; fontSize: number; delay?: number }> = ({ stat, fontSize, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const count = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.9) });
  const enter = spring({ frame: frame - delay, fps, config: motion.enter.spring });
  const decimals = Number.isInteger(stat.value) ? 0 : 1;

  return (
    <div data-qc="stat" style={{ opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [motion.enter.distance, 0])}px)` }}>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize, color: brand.colors.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {stat.prefix}
        {(stat.value * count).toFixed(decimals)}
        {stat.suffix}
      </div>
      <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: Math.max(fontSize * 0.26, 40), color: brand.colors.text, marginTop: 10 }}>
        {stat.label}
      </div>
    </div>
  );
};
