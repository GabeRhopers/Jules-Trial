import { AnimatedTitle } from "../../components/AnimatedTitle";
import { CtaEndCard } from "../../components/CtaEndCard";
import { NumberBadge } from "../../components/NumberBadge";
import { StatCounter } from "../../components/StatCounter";
import type { Brand, SceneVisual } from "../../lib/types";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type SceneProps = {
  visual: SceneVisual;
  brand: Brand;
  fonts: { heading: string; body: string };
  logoSrc: string;
  /** How many numbered points this video has ("Sign 1 of 3") */
  pointCount: number;
};

const Kicker: React.FC<{ text: string; brand: Brand; font: string }> = ({ text, brand, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div
      data-qc="kicker"
      style={{
        alignSelf: "flex-start",
        backgroundColor: brand.colors.accent,
        color: brand.colors.textOnAccent,
        fontFamily: font,
        fontWeight: 800,
        fontSize: 44,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "12px 28px",
        borderRadius: 999,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

/** Renders the foreground of one scene, vertically centered in the reel's content area. */
export const ReelScene: React.FC<SceneProps> = (props) => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
    <SceneContent {...props} />
  </div>
);

const SceneContent: React.FC<SceneProps> = ({ visual, brand, fonts, logoSrc, pointCount }) => {
  const { colors } = brand;

  if (visual.kind === "hook") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        <Kicker text={visual.kicker} brand={brand} font={fonts.heading} />
        <AnimatedTitle
          text={visual.headline}
          fontFamily={fonts.heading}
          fontSize={136}
          color={colors.text}
          highlight={visual.headline.split(" ").slice(0, 2)}
          highlightColor={colors.accent}
          stagger={2}
        />
      </div>
    );
  }

  if (visual.kind === "point") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <NumberBadge number={visual.number} size={150} fontFamily={fonts.heading} background={colors.primary} color={colors.textOnPrimary} />
          <div data-qc="point-label" style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 44, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Sign {visual.number} of {pointCount}
          </div>
        </div>
        <AnimatedTitle text={visual.headline} fontFamily={fonts.heading} fontSize={104} color={colors.text} delay={6} />
        {visual.stat ? (
          <StatCounter
            stat={visual.stat}
            fontFamily={fonts.heading}
            labelFontFamily={fonts.body}
            color={colors.accent}
            labelColor={colors.text}
            fontSize={176}
            delay={14}
          />
        ) : null}
      </div>
    );
  }

  return (
    <CtaEndCard
      brand={brand}
      logoSrc={logoSrc}
      fonts={fonts}
      headline={visual.headline ?? brand.cta.headline}
      button={visual.button ?? brand.cta.button}
      subline={visual.subline ?? brand.cta.subline}
    />
  );
};
