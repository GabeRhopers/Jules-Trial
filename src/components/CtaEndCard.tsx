import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedTitle } from "./AnimatedTitle";
import { LogoReveal } from "./LogoReveal";
import type { Brand } from "../lib/types";

type Props = {
  brand: Brand;
  logoSrc: string;
  fonts: { heading: string; body: string };
  headline: string;
  button: string;
  subline: string;
  /** Overall scale, so the same card works in 9:16, 16:9 and 1:1 */
  scale?: number;
};

/** End card: logo reveal, offer headline, pulsing CTA button and contact line. */
export const CtaEndCard: React.FC<Props> = ({ brand, logoSrc, fonts, headline, button, subline, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors } = brand;
  const buttonIn = spring({ frame: frame - 18, fps, config: { damping: 12, mass: 0.6 } });
  const pulse = 1 + 0.03 * Math.sin(((frame - 30) / fps) * Math.PI * 2 * 0.9) * (frame > 30 ? 1 : 0);
  const sublineIn = spring({ frame: frame - 26, fps, config: { damping: 200 } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 * scale }}>
      <LogoReveal src={logoSrc} width={520 * scale} />
      <AnimatedTitle
        text={headline}
        fontFamily={fonts.heading}
        fontSize={104 * scale}
        color={colors.text}
        highlight={headline.match(/\$\d+/g) ?? []}
        highlightColor={colors.accent}
        delay={6}
      />
      <div
        data-qc="cta-button"
        style={{
          alignSelf: "flex-start",
          backgroundColor: colors.primary,
          color: colors.textOnPrimary,
          fontFamily: fonts.heading,
          fontWeight: 800,
          fontSize: 52 * scale,
          padding: `${26 * scale}px ${48 * scale}px`,
          borderRadius: 999,
          transform: `scale(${buttonIn * pulse})`,
          transformOrigin: "left center",
          boxShadow: `0 ${14 * scale}px ${40 * scale}px ${colors.primary}66`,
        }}
      >
        {button}
      </div>
      <div
        data-qc="cta-subline"
        style={{
          fontFamily: fonts.body,
          fontWeight: 700,
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
