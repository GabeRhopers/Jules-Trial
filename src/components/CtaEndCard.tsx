import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";
import { AnimatedTitle } from "./AnimatedTitle";
import { LogoReveal } from "./LogoReveal";

type Props = {
  headline: string;
  button: string;
  subline: string;
  /** Overall scale, so the same card works in 9:16, 16:9 and 1:1 */
  scale?: number;
};

/** End card: logo reveal, offer headline, CTA button and contact line. */
export const CtaEndCard: React.FC<Props> = ({ headline, button, subline, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const { colors } = brand;
  const buttonIn = spring({ frame: frame - 18, fps, config: motion.pop.spring });
  // Bold brands get a gentle pulse on the button; calm brands keep it still
  const pulse = brand.style.motion === "bold" && frame > 30 ? 1 + 0.03 * Math.sin(((frame - 30) / fps) * Math.PI * 2 * 0.9) : 1;
  const sublineIn = spring({ frame: frame - 26, fps, config: motion.enter.spring });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 * scale }}>
      <LogoReveal width={520 * scale} />
      <AnimatedTitle text={headline} fontSize={100 * scale} highlight={headline.match(/\$\d+|\d+/g) ?? []} delay={6} />
      <div
        data-qc="cta-button"
        style={{
          alignSelf: "flex-start",
          backgroundColor: colors.primary,
          color: colors.textOnPrimary,
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 52 * scale,
          padding: `${24 * scale}px ${46 * scale}px`,
          borderRadius: Math.min(brand.style.cornerRadius, 999),
          opacity: Math.min(1, buttonIn * 1.5),
          transform: `scale(${interpolate(buttonIn, [0, 1], [brand.style.motion === "bold" ? 0 : 0.92, 1]) * pulse})`,
          transformOrigin: "left center",
          boxShadow: `0 ${14 * scale}px ${40 * scale}px ${colors.primary}55`,
        }}
      >
        {button}
      </div>
      <div
        data-qc="cta-subline"
        style={{
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: 44 * scale,
          color: colors.textMuted,
          opacity: sublineIn,
          transform: `translateY(${interpolate(sublineIn, [0, 1], [20, 0])}px)`,
        }}
      >
        {subline}
      </div>
    </div>
  );
};
