import type { CSSProperties } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";
import type { LowerThirdContent } from "../lib/types";

/**
 * Name/title bar ("Mike Torres · Lead technician", "6063-T5 extrusions · Class I finish").
 * Slides in with an accent bar, holds, and slides out before the scene ends.
 */
export const LowerThird: React.FC<{ content: LowerThirdContent; scale?: number; durationInFrames: number; style?: CSSProperties }> = ({
  content,
  scale = 1,
  durationInFrames,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const inP = spring({ frame: frame - Math.round(fps * 0.3), fps, config: motion.enter.spring });
  const outP = spring({ frame: frame - (durationInFrames - Math.round(fps * 0.6)), fps, config: { damping: 200 } });
  const p = inP - outP;
  const radius = Math.min(brand.style.cornerRadius, 12) * scale;

  return (
    <div
      data-qc="lower-third"
      style={{
        display: "flex",
        alignItems: "stretch",
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-60 * scale, 0])}px)`,
        ...style,
      }}
    >
      <div style={{ width: 10 * scale, backgroundColor: brand.colors.accent, borderRadius: radius }} />
      <div
        style={{
          marginLeft: 14 * scale,
          padding: `${14 * scale}px ${24 * scale}px`,
          backgroundColor: `${brand.colors.background}E6`,
          borderRadius: radius,
          clipPath: `inset(0 ${interpolate(inP, [0, 1], [100, 0])}% 0 0)`,
        }}
      >
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 44 * scale, color: brand.colors.text, lineHeight: 1.1 }}>{content.title}</div>
        {content.subtitle ? (
          <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 30 * scale, color: brand.colors.textMuted, marginTop: 4 * scale }}>{content.subtitle}</div>
        ) : null}
      </div>
    </div>
  );
};
