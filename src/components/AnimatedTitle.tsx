import type { CSSProperties } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  /** Words (case-insensitive) painted in the highlight color */
  highlight?: string[];
  highlightColor?: string;
  /** Frames between each word's entrance */
  stagger?: number;
  delay?: number;
  fontWeight?: number;
  uppercase?: boolean;
  style?: CSSProperties;
};

/** Headline with a staggered, spring-driven word-by-word reveal. */
export const AnimatedTitle: React.FC<Props> = ({
  text,
  fontFamily,
  fontSize,
  color,
  highlight = [],
  highlightColor,
  stagger = 3,
  delay = 0,
  fontWeight = 800,
  uppercase = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marks = highlight.map((h) => h.toLowerCase());

  return (
    <div
      data-qc="title"
      style={{
        fontFamily,
        fontSize,
        fontWeight,
        color,
        lineHeight: 1.05,
        letterSpacing: "-0.01em",
        textTransform: uppercase ? "uppercase" : "none",
        display: "flex",
        flexWrap: "wrap",
        columnGap: fontSize * 0.25,
        ...style,
      }}
    >
      {text.split(" ").map((word, i) => {
        const progress = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 200, mass: 0.6 } });
        const isMarked = marks.includes(word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity: progress,
              transform: `translateY(${interpolate(progress, [0, 1], [fontSize * 0.45, 0])}px)`,
              color: isMarked && highlightColor ? highlightColor : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
