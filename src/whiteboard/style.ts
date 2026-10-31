import type { Brand, WhiteboardFont } from "../lib/types";

/** Whiteboard look for a brand: brand.whiteboard fields, with defaults for anything left out. */
export const resolveWhiteboardStyle = (brand: Brand) => {
  const wb = brand.whiteboard ?? {};
  return {
    paper: wb.paper ?? "#FBFAF6",
    ink: wb.ink ?? "#1F2328",
    highlight: wb.highlight ?? brand.colors.primary,
    font: (wb.font ?? "marker") as WhiteboardFont,
    hand: wb.hand ?? null,
  };
};

/** Pen speed in px per second at a 1080 px tall frame ("calm" brands draw a bit slower) */
export const PEN_SPEED = { bold: 3400, calm: 2800 } as const;
/** Pen lift between strokes, counted as this much extra length (px at 1080p) */
export const PEN_LIFT_PX = 45;
/** Longest a single drawing may take at natural speed, so items never drag */
export const MAX_GROUP_MS = { title: 2000, item: 1800 } as const;
