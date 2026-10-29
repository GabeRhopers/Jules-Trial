import { useMemo, type CSSProperties } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";
import { paginateWords } from "../lib/timeline";
import type { Word } from "../lib/types";

type Props = {
  /** Every narrated word, times on the global timeline (ms) */
  words: Word[];
  style?: CSSProperties;
};

/**
 * Big word-by-word captions synced to the narration timestamps.
 * Each page shows up to `captionStyle.maxWordsPerPage` words; every word appears when it is
 * spoken and the word being spoken right now is highlighted (box or color, per brand).
 */
export const KineticCaptions: React.FC<Props> = ({ words, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, fonts, motion } = useBrand();
  const cs = brand.captionStyle;
  const nowMs = (frame / fps) * 1000;
  const pages = useMemo(() => paginateWords(words, cs.maxWordsPerPage), [words, cs.maxWordsPerPage]);
  const page = pages.find((p) => nowMs >= p.startMs && nowMs < p.endMs);
  if (!page) return null;
  const boxed = cs.highlight === "box";

  return (
    <div
      data-qc="captions"
      data-qc-page={page.words.map((w) => w.text).join(" ")}
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "flex-end",
        columnGap: cs.fontSizePx * (boxed ? 0.22 : 0.28),
        rowGap: cs.fontSizePx * 0.08,
        fontFamily: cs.fontFamily === "heading" ? fonts.heading : fonts.body,
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
        const pop = spring({ frame: frame - startFrame, fps, config: motion.caption.spring });
        const visible = nowMs >= word.startMs;
        const next = page.words[i + 1];
        const isActive = visible && nowMs < (next ? next.startMs : page.endMs);
        const outlined = !(isActive && boxed);
        return (
          <span
            key={`${word.startMs}-${word.text}`}
            data-qc-active={isActive ? word.text : undefined}
            style={{
              display: "inline-block",
              padding: boxed ? `0 ${cs.fontSizePx * 0.12}px` : 0,
              borderRadius: Math.min(brand.style.cornerRadius, cs.fontSizePx * 0.16),
              opacity: visible ? interpolate(pop, [0, 1], [0.4, 1]) : 0,
              transform: `scale(${visible ? interpolate(pop, [0, 1], [motion.caption.scaleFrom, 1]) : motion.caption.scaleFrom})`,
              color: isActive ? (boxed ? cs.activeColor : cs.activeBackground) : cs.baseColor,
              backgroundColor: isActive && boxed ? cs.activeBackground : "transparent",
              WebkitTextStroke: outlined ? `${Math.round(cs.fontSizePx * 0.09)}px ${cs.strokeColor}` : undefined,
              paintOrder: "stroke fill",
              textShadow: outlined ? `0 ${cs.fontSizePx * 0.06}px ${cs.fontSizePx * 0.2}px rgba(0,0,0,0.45)` : undefined,
            }}
          >
            {word.text.replace(/[.,;:!?]+$/, "")}
          </span>
        );
      })}
    </div>
  );
};
