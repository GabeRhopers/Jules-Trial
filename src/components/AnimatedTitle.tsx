import type { CSSProperties } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";

type Props = {
  text: string;
  fontSize: number;
  color?: string;
  /** Words (case-insensitive) painted in the brand accent color */
  highlight?: string[];
  delay?: number;
  /** Override the brand's motion preset stagger (frames between words) */
  stagger?: number;
  fontWeight?: number;
  style?: CSSProperties;
};

/** Headline with a staggered, spring-driven word-by-word reveal. Case and motion follow the brand. */
export const AnimatedTitle: React.FC<Props> = ({ text, fontSize, color, highlight = [], delay = 0, stagger, fontWeight = 700, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const marks = highlight.map((h) => h.toLowerCase().replace(/[^\p{L}\p{N}$]/gu, ""));
  const step = stagger ?? motion.title.stagger;

  return (
    <div
      data-qc="title"
      style={{
        fontFamily: fonts.heading,
        fontSize,
        fontWeight,
        color: color ?? brand.colors.text,
        lineHeight: 1.05,
        letterSpacing: brand.style.headlineCase === "upper" ? "-0.01em" : "-0.02em",
        textTransform: brand.style.headlineCase === "upper" ? "uppercase" : "none",
        display: "flex",
        flexWrap: "wrap",
        columnGap: fontSize * 0.25,
        ...style,
      }}
    >
      {text.split(" ").map((word, i) => {
        const progress = spring({ frame: frame - delay - i * step, fps, config: motion.title.spring });
        const isMarked = marks.includes(word.toLowerCase().replace(/[^\p{L}\p{N}$]/gu, ""));
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity: progress,
              transform: `translateY(${interpolate(progress, [0, 1], [fontSize * motion.title.rise, 0])}px)`,
              color: isMarked ? brand.colors.accent : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
