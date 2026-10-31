// Turns a whiteboard scene config into strokes: single open paths, in drawing order, in frame pixels.
// Icons come from Tabler (MIT), handwriting from single-line OFL fonts (fonts.json), arrows, circles and
// underlines from Rough.js (MIT) with a fixed seed so every frame renders the same wobble.
import { getBoundingBox, getLength, getPointAtLength, getSubpaths, normalizePath, parsePath, reduceInstructions, serializeInstructions } from "@remotion/paths";
import rough from "roughjs";
import type { Rect } from "../lib/safe-zones";
import type { WhiteboardFont, WhiteboardItem } from "../lib/types";
import fontData from "./fonts.json";
import iconData from "./icons.json";

export type Point = { x: number; y: number };

export type Stroke = { d: string; length: number; color: string; width: number; from: Point; to: Point };

/** Strokes drawn in one go: the title, or one item (arrow in, icon, label, circle). */
export type StrokeGroup = { strokes: Stroke[]; cue?: string; isTitle: boolean };

export type WhiteboardSizes = {
  /** Cap height of the handwritten title, px */
  title: number;
  /** Cap height of item labels, px */
  label: number;
  /** Largest icon size, px (icons shrink to fit when there are many items) */
  icon: number;
};

const ICONS = (iconData as unknown as { icons: Record<string, string[]> }).icons;

type Glyph = { a: number; d?: string };
type FontDef = { capHeight: number; defaultAdvance: number; glyphs: Record<string, Glyph> };
const FONTS = fontData as unknown as Record<WhiteboardFont, FontDef>;

export const iconExists = (name: string) => name in ICONS;

/** Icon names that contain the given text, for error messages */
export const similarIcons = (name: string, max = 8) => {
  const parts = name.toLowerCase().split(/[-\s]+/).filter(Boolean);
  return Object.keys(ICONS)
    .filter((k) => parts.some((p) => k.includes(p)))
    .slice(0, max);
};

/** Applies x' = x*sx + tx, y' = y*sy + ty to every point of a path. Returns absolute M/L/C/Z. */
const transformPath = (d: string, sx: number, sy: number, tx: number, ty: number): string => {
  const reduced = reduceInstructions(parsePath(normalizePath(d)));
  const mapped = reduced.map((ins) => {
    const out: Record<string, unknown> = { ...ins };
    for (const [k, v] of Object.entries(ins)) {
      if (typeof v !== "number") continue;
      if (k.endsWith("x")) out[k] = v * sx + tx;
      else if (k.endsWith("y")) out[k] = v * sy + ty;
    }
    return out as typeof ins;
  });
  return serializeInstructions(mapped);
};

/** Splits a path into single subpaths and measures them. Tiny fragments (dots) are kept but cost little time. */
const toStrokes = (d: string, color: string, width: number): Stroke[] =>
  getSubpaths(d).flatMap((sub) => {
    const length = getLength(sub);
    if (!Number.isFinite(length)) return [];
    const from = getPointAtLength(sub, 0);
    const to = getPointAtLength(sub, length);
    if (!from || !to) return [];
    return [{ d: sub, length: Math.max(length, 0.5), color, width, from, to }];
  });

// ---------- Icons ----------

/** Tabler icons are 24x24 with a 2 px stroke; they are scaled to `size`. */
export const iconStrokes = (name: string, center: Point, size: number, color: string): Stroke[] => {
  const nodes = ICONS[name];
  if (!nodes) {
    const close = similarIcons(name);
    throw new Error(`Whiteboard icon "${name}" does not exist. ${close.length ? `Similar: ${close.join(", ")}. ` : ""}Search with: npm run icon -- <keyword>`);
  }
  const s = size / 24;
  // Same marker weight as the handwriting, so icons and text look drawn with one pen
  const width = Math.max(3, size * 0.034);
  return nodes.flatMap((d) => toStrokes(transformPath(d, s, s, center.x - size / 2, center.y - size / 2), color, width));
};

// ---------- Handwriting ----------

const glyphFor = (font: FontDef, ch: string): Glyph => font.glyphs[ch] ?? font.glyphs[ch.normalize("NFD")[0]] ?? { a: font.defaultAdvance };

/** Width of a line of handwriting at the given cap height */
export const measureText = (text: string, fontName: WhiteboardFont, cap: number) => {
  const font = FONTS[fontName];
  const s = cap / font.capHeight;
  return [...text].reduce((w, ch) => w + glyphFor(font, ch).a * s, 0);
};

/** Greedy word wrap to `maxWidth` */
export const wrapText = (text: string, fontName: WhiteboardFont, cap: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measureText(next, fontName, cap) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};

/** One line of handwriting, horizontally centered on `centerX`, sitting on `baseline`. */
export const textStrokes = (text: string, fontName: WhiteboardFont, cap: number, centerX: number, baseline: number, color: string): Stroke[] => {
  const font = FONTS[fontName];
  const s = cap / font.capHeight;
  const width = Math.max(2.5, cap * 0.1);
  let x = centerX - measureText(text, fontName, cap) / 2;
  const strokes: Stroke[] = [];
  for (const ch of text) {
    const g = glyphFor(font, ch);
    // Font units are y-up; the frame is y-down, so flip y
    if (g.d) strokes.push(...toStrokes(transformPath(g.d, s, -s, x, baseline), color, width));
    x += g.a * s;
  }
  return strokes;
};

// ---------- Hand-drawn shapes ----------

const seedFrom = (key: string) => {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 2147483647 || 1;
};

const roughStrokes = (key: string, make: (g: ReturnType<typeof rough.generator>, seed: number) => Parameters<ReturnType<typeof rough.generator>["toPaths"]>[0], color: string, width: number) => {
  const gen = rough.generator();
  return gen.toPaths(make(gen, seedFrom(key))).flatMap((p) => toStrokes(p.d, color, width));
};

const roughOpts = (seed: number, roughness: number) => ({ seed, roughness, bowing: 1.2, disableMultiStroke: true, preserveVertices: true });

export const arrowStrokes = (key: string, from: Point, to: Point, color: string, width: number): Stroke[] => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.min(36, Math.hypot(to.x - from.x, to.y - from.y) * 0.3);
  const wing = (side: 1 | -1) => ({ x: to.x - head * Math.cos(angle + side * 0.5), y: to.y - head * Math.sin(angle + side * 0.5) });
  const l = wing(1);
  const r = wing(-1);
  return [
    ...roughStrokes(`${key}-shaft`, (g, seed) => g.line(from.x, from.y, to.x, to.y, roughOpts(seed, 1.1)), color, width),
    ...roughStrokes(`${key}-head`, (g, seed) => g.linearPath([[l.x, l.y], [to.x, to.y], [r.x, r.y]], roughOpts(seed, 0.6)), color, width),
  ];
};

export const circleStrokes = (key: string, center: Point, w: number, h: number, color: string, width: number): Stroke[] =>
  roughStrokes(key, (g, seed) => g.ellipse(center.x, center.y, w, h, { ...roughOpts(seed, 1.4), curveStepCount: 14 }), color, width);

export const underlineStrokes = (key: string, from: Point, to: Point, color: string, width: number): Stroke[] =>
  roughStrokes(key, (g, seed) => g.line(from.x, from.y, to.x, to.y, { ...roughOpts(seed, 1.8), bowing: 2.5 }), color, width);

// ---------- Layout ----------

export type WhiteboardLayoutInput = {
  sceneId: string;
  title?: string;
  layout: "flow" | "free";
  items: WhiteboardItem[];
  area: Rect;
  sizes: WhiteboardSizes;
  font: WhiteboardFont;
  ink: string;
  highlight: string;
};

export type WhiteboardLayout = { groups: StrokeGroup[]; bounds: Rect };

export const layoutWhiteboard = ({ sceneId, title, layout, items, area, sizes, font, ink, highlight }: WhiteboardLayoutInput): WhiteboardLayout => {
  const groups: StrokeGroup[] = [];
  const labelLineH = sizes.label * 1.55;
  const markerW = Math.max(3, sizes.label * 0.13);
  let top = area.y;

  if (title) {
    const lines = wrapText(title, font, sizes.title, area.width * 0.95);
    const lineH = sizes.title * 1.6;
    const strokes: Stroke[] = [];
    lines.forEach((line, i) => strokes.push(...textStrokes(line, font, sizes.title, area.x + area.width / 2, area.y + sizes.title * 1.15 + i * lineH, ink)));
    const widest = Math.max(...lines.map((l) => measureText(l, font, sizes.title)));
    const underlineY = area.y + sizes.title * 1.15 + (lines.length - 1) * lineH + sizes.title * 0.62;
    strokes.push(
      ...underlineStrokes(`${sceneId}-underline`, { x: area.x + area.width / 2 - widest / 2, y: underlineY }, { x: area.x + area.width / 2 + widest / 2, y: underlineY }, highlight, markerW * 1.3),
    );
    groups.push({ strokes, isTitle: true });
    top = underlineY + sizes.title * 0.9;
  }

  const region = { x: area.x, y: top, width: area.width, height: area.y + area.height - top };

  if (layout === "free") {
    items.forEach((item, i) => {
      const size = ((item.size ?? 22) / 100) * area.height;
      const center = { x: area.x + ((item.x ?? 50) / 100) * area.width, y: area.y + ((item.y ?? 50) / 100) * area.height };
      groups.push({ strokes: itemStrokes(`${sceneId}-${i}`, item, center, size, size * 3, font, sizes.label, labelLineH, ink, highlight, markerW), cue: item.at, isTitle: false });
    });
  } else {
    const n = items.length;
    const slotW = region.width / Math.max(n, 1);
    const maxLabelLines = Math.max(1, ...items.map((it) => (it.label ? wrapText(it.label, font, sizes.label, slotW * 0.9).length : 0)));
    const labelBlock = items.some((it) => it.label) ? sizes.label * 0.9 + maxLabelLines * labelLineH : 0;
    const size = Math.max(40, Math.min(sizes.icon, slotW * (n <= 3 ? 0.6 : 0.5), region.height - labelBlock - sizes.label * 1.5));
    const blockH = size + labelBlock;
    const iconY = region.y + (region.height - blockH) / 2 + size / 2;
    items.forEach((item, i) => {
      const center = { x: region.x + slotW * (i + 0.5), y: iconY };
      const strokes: Stroke[] = [];
      if (i > 0) {
        const gap = Math.min(size * 0.28, (slotW - size) * 0.2);
        const fromX = region.x + slotW * (i - 0.5) + size / 2 + gap;
        const toX = center.x - size / 2 - gap;
        if (toX - fromX > 30) strokes.push(...arrowStrokes(`${sceneId}-arrow-${i}`, { x: fromX, y: iconY }, { x: toX, y: iconY }, ink, markerW));
      }
      strokes.push(...itemStrokes(`${sceneId}-${i}`, item, center, size, slotW * 0.9, font, sizes.label, labelLineH, ink, highlight, markerW));
      groups.push({ strokes, cue: item.at, isTitle: false });
    });
  }

  // Bounds of everything drawn, for the quality check (safe zones, caption overlap)
  const all = groups.flatMap((g) => g.strokes);
  let bounds: Rect = { x: area.x, y: area.y, width: 0, height: 0 };
  if (all.length > 0) {
    const boxes = all.map((s) => getBoundingBox(s.d));
    const pad = Math.max(...all.map((s) => s.width)) / 2;
    const x1 = Math.min(...boxes.map((b) => b.x1)) - pad;
    const y1 = Math.min(...boxes.map((b) => b.y1)) - pad;
    bounds = { x: x1, y: y1, width: Math.max(...boxes.map((b) => b.x2)) + pad - x1, height: Math.max(...boxes.map((b) => b.y2)) + pad - y1 };
  }
  return { groups, bounds };
};

const itemStrokes = (
  key: string,
  item: WhiteboardItem,
  center: Point,
  size: number,
  labelWidth: number,
  font: WhiteboardFont,
  labelCap: number,
  lineH: number,
  ink: string,
  highlight: string,
  markerW: number,
): Stroke[] => {
  const strokes: Stroke[] = [];
  if (item.icon) strokes.push(...iconStrokes(item.icon, center, size, ink));
  const lines = item.label ? wrapText(item.label, font, labelCap, labelWidth) : [];
  const firstBaseline = center.y + (item.icon ? size / 2 : 0) + labelCap * 0.9 + labelCap;
  lines.forEach((line, i) => strokes.push(...textStrokes(line, font, labelCap, center.x, firstBaseline + i * lineH, ink)));
  if (item.circle) {
    const textW = Math.max(0, ...lines.map((l) => measureText(l, font, labelCap)));
    const top = center.y - (item.icon ? size / 2 : 0);
    const bottom = lines.length ? firstBaseline + (lines.length - 1) * lineH + labelCap * 0.35 : center.y + size / 2;
    // Never wider than the item's slot, so the circle does not cross the arrows
    // An ellipse needs about sqrt(2) times a box's size to contain it fully
    const w = Math.min(labelWidth * 1.1, Math.max(item.icon ? size : 0, textW) * 1.42);
    const h = (bottom - top) * 1.42;
    strokes.push(...circleStrokes(`${key}-circle`, { x: center.x, y: (top + bottom) / 2 }, w, h, highlight, markerW * 1.3));
  }
  return strokes;
};
