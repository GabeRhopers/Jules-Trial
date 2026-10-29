import { useMemo, type CSSProperties } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { paginateWords } from "../lib/timeline";
import type { Brand, Word } from "../lib/types";

type Props = {
  brand: Brand;
  fontFamily: string;
  /** Every narrated word, times on the global timeline (ms) */
  words: Word[];
  style?: CSSProperties;
};

/**
 * Big word-by-word captions synced to the narration timestamps.
 * Each page shows up to `captionStyle.maxWordsPerPage` words; every word pops in when it is
 * spoken and the word being spoken right now gets the brand highlight.
 */
export const KineticCaptions: React.FC<Props> = ({ brand, fontFamily, words, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cs = brand.captionStyle;
  const nowMs = (frame / fps) * 1000;
  const pages = useMemo(() => paginateWords(words, cs.maxWordsPerPage), [words, cs.maxWordsPerPage]);
  const page = pages.find((p) => nowMs >= p.startMs && nowMs < p.endMs);
  if (!page) return null;

  return (
    <div
      data-qc="captions"
      data-qc-page={page.words.map((w) => w.text).join(" ")}
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "flex-end",
        columnGap: cs.fontSizePx * 0.22,
        rowGap: cs.fontSizePx * 0.08,
        fontFamily,
        fontWeight: cs.fontWeight,
        fontSize: cs.fontSizePx,
        lineHeight: 1.1,
        textTransform: cs.textTransform,
        textAlign: "center",
        ...style,
      }}
    >
      {page.words.map((word, i) => {
        const startFrame = (word.startMs / 1000) * fps;
        const pop = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 220, mass: 0.5 } });
        const visible = nowMs >= word.startMs;
        const next = page.words[i + 1];
        const isActive = visible && nowMs < (next ? next.startMs : page.endMs);
        return (
          <span
            key={`${word.startMs}-${word.text}`}
            data-qc-active={isActive ? word.text : undefined}
            style={{
              display: "inline-block",
              padding: `0 ${cs.fontSizePx * 0.12}px`,
              borderRadius: cs.fontSizePx * 0.16,
              opacity: visible ? 1 : 0,
              transform: `scale(${visible ? interpolate(pop, [0, 1], [0.7, 1]) : 0.7})`,
              color: isActive ? cs.activeColor : cs.baseColor,
              backgroundColor: isActive ? cs.activeBackground : "transparent",
              WebkitTextStroke: isActive ? undefined : `${Math.round(cs.fontSizePx * 0.09)}px ${cs.strokeColor}`,
              paintOrder: "stroke fill",
              textShadow: isActive ? undefined : `0 ${cs.fontSizePx * 0.06}px ${cs.fontSizePx * 0.2}px rgba(0,0,0,0.45)`,
            }}
          >
            {word.text.replace(/[.,;:!?]+$/, "")}
          </span>
        );
      })}
    </div>
  );
};
