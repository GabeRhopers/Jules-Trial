import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedTitle } from "../../components/AnimatedTitle";
import { BRollSlot } from "../../components/BRollSlot";
import { CtaEndCard } from "../../components/CtaEndCard";
import { LogoReveal } from "../../components/LogoReveal";
import { LowerThird } from "../../components/LowerThird";
import { NumberBadge } from "../../components/NumberBadge";
import { StatCounter } from "../../components/StatCounter";
import { useBrand } from "../../lib/brand-context";
import type { Rect } from "../../lib/safe-zones";
import type { WhiteboardSizes } from "../../whiteboard/geometry";
import { WhiteboardScene } from "../../whiteboard/WhiteboardScene";
import { SceneArea, type SceneRenderArgs } from "../VideoShell";

/** Type sizes and layout choices for one format. */
export type SceneSizes = {
  hook: number;
  headline: number;
  body: number;
  stat: number;
  badge: number;
  label: number;
  kicker: number;
  /** Scale for the CTA end card */
  cta: number;
  /** "stack" = text above stat (tall formats). "split" = text left, stat right (16:9). */
  pointLayout: "stack" | "split";
  /** Lower third: left edge and distance from the bottom of the frame */
  lowerThird: { x: number; bottom: number; scale: number };
  /** Handwriting and icon sizes for whiteboard scenes */
  whiteboard: WhiteboardSizes;
};

const Kicker: React.FC<{ text: string; size: number }> = ({ text, size }) => {
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
        fontSize: size,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: `${size * 0.27}px ${size * 0.64}px`,
        borderRadius: brand.style.cornerRadius,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-motion.enter.distance, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

const Body: React.FC<{ text: string; size: number; delay?: number }> = ({ text, size, delay = 10 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const p = spring({ frame: frame - delay, fps, config: motion.enter.spring });
  return (
    <div
      data-qc="body"
      style={{
        fontFamily: fonts.body,
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1.3,
        color: brand.colors.textMuted,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [motion.enter.distance * 0.6, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

const Proof: React.FC<{ text: string; size: number }> = ({ text, size }) => {
  const { brand } = useBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.5 }}>
      <div style={{ width: size * 0.35, height: size * 0.35, borderRadius: Math.min(brand.style.cornerRadius, size), backgroundColor: brand.colors.secondary, flexShrink: 0 }} />
      <Body text={text} size={size} delay={20} />
    </div>
  );
};

/** Renders any scene kind for a format, given that format's scene area and sizes. */
export const FormatScene: React.FC<SceneRenderArgs & { area: Rect; sizes: SceneSizes }> = ({ config, scene, pointCount, pointLabel, brollAvailable, area, sizes }) => {
  const { brand, fonts } = useBrand();
  const visual = config.visual;

  switch (visual.kind) {
    case "hook":
      return (
        <SceneArea rect={area}>
          <div style={{ display: "flex", flexDirection: "column", gap: sizes.kicker }}>
            {visual.logo ? <LogoReveal width={sizes.hook * 2.6} /> : null}
            <Kicker text={visual.kicker} size={sizes.kicker} />
            <AnimatedTitle text={visual.headline} fontSize={sizes.hook} highlight={visual.headline.split(" ").slice(0, 2)} stagger={2} />
          </div>
        </SceneArea>
      );

    case "statement":
      return (
        <SceneArea rect={area}>
          <div style={{ display: "flex", flexDirection: "column", gap: sizes.kicker * 0.8 }}>
            {visual.kicker ? <Kicker text={visual.kicker} size={sizes.kicker} /> : null}
            <AnimatedTitle text={visual.headline} fontSize={sizes.headline} delay={4} />
            {visual.body ? <Body text={visual.body} size={sizes.body} /> : null}
          </div>
        </SceneArea>
      );

    case "point": {
      const header = (
        <div style={{ display: "flex", alignItems: "center", gap: sizes.badge * 0.19 }}>
          <NumberBadge number={visual.number} size={sizes.badge} />
          <div
            data-qc="point-label"
            style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: sizes.label, color: brand.colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {pointLabel} {visual.number} of {pointCount}
          </div>
        </div>
      );
      const text = (
        <div style={{ display: "flex", flexDirection: "column", gap: sizes.label * 0.8 }}>
          {header}
          <AnimatedTitle text={visual.headline} fontSize={sizes.headline} delay={6} />
          {visual.proof ? <Proof text={visual.proof} size={sizes.body} /> : null}
        </div>
      );
      const stat = visual.stat ? <StatCounter stat={visual.stat} fontSize={sizes.stat} delay={14} /> : null;
      return (
        <SceneArea rect={area}>
          {sizes.pointLayout === "split" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: area.width * 0.05 }}>
              <div style={{ flex: "1 1 58%" }}>{text}</div>
              {stat ? <div style={{ flex: "0 1 37%" }}>{stat}</div> : null}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: sizes.label * 0.8 }}>
              {text}
              {stat}
            </div>
          )}
        </SceneArea>
      );
    }

    case "broll":
      return (
        <>
          <BRollSlot src={visual.src} available={!!visual.src && brollAvailable.includes(visual.src)} prompt={visual.prompt} />
          {visual.headline ? (
            <SceneArea rect={area} align="end">
              <AnimatedTitle text={visual.headline} fontSize={sizes.headline} delay={4} style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
            </SceneArea>
          ) : null}
          {visual.lowerThird ? (
            <LowerThird
              content={visual.lowerThird}
              scale={sizes.lowerThird.scale}
              durationInFrames={scene.durationInFrames}
              style={{ position: "absolute", left: sizes.lowerThird.x, bottom: sizes.lowerThird.bottom }}
            />
          ) : null}
        </>
      );

    case "whiteboard":
      return <WhiteboardScene visual={visual} sceneId={config.id} scene={scene} area={area} sizes={sizes.whiteboard} />;

    case "cta":
      return (
        <SceneArea rect={area}>
          <CtaEndCard
            headline={visual.headline ?? brand.cta.headline}
            button={visual.button ?? brand.cta.button}
            subline={visual.subline ?? brand.cta.subline}
            scale={sizes.cta}
          />
        </SceneArea>
      );
  }
};
