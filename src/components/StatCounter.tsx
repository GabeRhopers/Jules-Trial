import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Stat } from "../lib/types";

type Props = {
  stat: Stat;
  fontFamily: string;
  labelFontFamily: string;
  color: string;
  labelColor: string;
  fontSize: number;
  delay?: number;
};

/** Number that counts up to its value, with prefix/suffix and a short label. */
export const StatCounter: React.FC<Props> = ({ stat, fontFamily, labelFontFamily, color, labelColor, fontSize, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.9) });
  const enter = spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.6 } });
  const decimals = Number.isInteger(stat.value) ? 0 : 1;

  return (
    <div
      data-qc="stat"
      style={{
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
      }}
    >
      <div style={{ fontFamily, fontWeight: 800, fontSize, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {stat.prefix}
        {(stat.value * count).toFixed(decimals)}
        {stat.suffix}
      </div>
      <div style={{ fontFamily: labelFontFamily, fontWeight: 500, fontSize: fontSize * 0.26, color: labelColor, marginTop: 8 }}>
        {stat.label}
      </div>
    </div>
  );
};
