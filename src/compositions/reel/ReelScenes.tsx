import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedTitle } from "../../components/AnimatedTitle";
import { CtaEndCard } from "../../components/CtaEndCard";
import { NumberBadge } from "../../components/NumberBadge";
import { StatCounter } from "../../components/StatCounter";
import { useBrand } from "../../lib/brand-context";
import type { SceneVisual } from "../../lib/types";

type SceneProps = {
  visual: SceneVisual;
  /** How many numbered points this video has ("Sign 1 of 3") */
  pointCount: number;
  pointLabel: string;
};

const Kicker: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const p = spring({ frame, fps, config: motion.enter.spring });
  return (
    <div
      data-qc="kicker"
      style={{
        alignSelf: "flex-start",
        backgroundColor: brand.colors.accent,
        color: brand.colors.textOnAccent,
        fontFamily: fonts.heading,
        fontWeight: 700,
        fontSize: 44,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "12px 28px",
        borderRadius: brand.style.cornerRadius,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-motion.enter.distance, 0])}px)`,
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

const SceneContent: React.FC<SceneProps> = ({ visual, pointCount, pointLabel }) => {
  const { brand, fonts } = useBrand();

  if (visual.kind === "hook") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        <Kicker text={visual.kicker} />
        <AnimatedTitle text={visual.headline} fontSize={132} highlight={visual.headline.split(" ").slice(0, 2)} stagger={2} />
      </div>
    );
  }

  if (visual.kind === "point") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <NumberBadge number={visual.number} size={150} />
          <div
            data-qc="point-label"
            style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 44, color: brand.colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {pointLabel} {visual.number} of {pointCount}
          </div>
        </div>
        <AnimatedTitle text={visual.headline} fontSize={104} delay={6} />
        {visual.stat ? <StatCounter stat={visual.stat} fontSize={176} delay={14} /> : null}
      </div>
    );
  }

  return (
    <CtaEndCard
      headline={visual.headline ?? brand.cta.headline}
      button={visual.button ?? brand.cta.button}
      subline={visual.subline ?? brand.cta.subline}
      scale={0.85}
    />
  );
};
