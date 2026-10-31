// When each whiteboard drawing starts and ends. Pure functions (no Remotion import) so tests can run them.
import type { Word } from "../lib/types";

/** One thing the marker draws in one go (the title, or one item with its arrow, label and circle). */
export type DrawGroup = {
  /** Word in the scene narration that starts this group */
  cue?: string;
  /** Fixed start time (ms from the scene start), used for the title */
  fixedMs?: number;
  /** How long the drawing takes at normal pen speed */
  naturalMs: number;
};

export type GroupWindow = { startMs: number; endMs: number; compressed: boolean };

/** Pause between the end of one drawing and the start of the next */
export const PEN_GAP_MS = 120;
/** A drawing never gets less time than this, even when cue words are very close together */
export const MIN_DRAW_MS = 300;
/** Leave this much of the scene free after the last drawing ends */
const END_MARGIN_MS = 250;

const clean = (w: string) =>
  w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}%$-]/gu, "");

/**
 * Finds each cue word in the narration, in order: every cue is searched from the word after the previous
 * cue, so the same word can be used twice ("first ... then ... then"). Matching ignores case, accents and
 * punctuation. Throws a clear error for a cue that is not in the narration.
 */
export const findCues = (cues: (string | undefined)[], words: Word[], sceneId: string): (number | undefined)[] => {
  let from = 0;
  return cues.map((cue) => {
    if (cue === undefined) return undefined;
    const target = clean(cue);
    const idx = words.findIndex((w, i) => i >= from && clean(w.text) === target);
    if (idx < 0) {
      throw new Error(
        `Whiteboard scene "${sceneId}": cue word "${cue}" is not in the narration (after the previous cue). ` +
          `Use a single word that is spoken in this scene, in order. Words: ${words.map((w) => w.text).join(" ")}`,
      );
    }
    from = idx + 1;
    return words[idx].startMs;
  });
};

/**
 * Start and end of every group (ms from the scene start).
 * - Groups with a cue start when that word is spoken; groups with `fixedMs` start then.
 * - Groups without either are spread evenly between their neighbors.
 * - Drawings never overlap (there is one marker): a group starts after the previous one ends plus a short
 *   pause, and is sped up (down to MIN_DRAW_MS) if the next cue comes sooner than its natural length.
 */
export const scheduleGroups = (groups: DrawGroup[], words: Word[], sceneDurationMs: number, sceneId: string): GroupWindow[] => {
  if (groups.length === 0) return [];
  const cueMs = findCues(
    groups.map((g) => g.cue),
    words,
    sceneId,
  );
  const fixed: (number | undefined)[] = groups.map((g, i) => g.fixedMs ?? cueMs[i]);

  const speechStart = words[0]?.startMs ?? 0;
  const speechEnd = words[words.length - 1]?.endMs ?? sceneDurationMs;
  // Free groups never start before a leading fixed group (the title) has had time to finish
  let floor = speechStart;
  groups.forEach((g, i) => {
    if (g.fixedMs !== undefined && i === 0) floor = Math.max(floor, g.fixedMs + g.naturalMs + PEN_GAP_MS);
  });

  const starts: number[] = fixed.map((ms) => ms ?? NaN);
  let i = 0;
  while (i < groups.length) {
    if (!Number.isNaN(starts[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < groups.length && Number.isNaN(starts[j + 1])) j++;
    const n = j - i + 1;
    // A leading title is not an anchor: free items start once it has had time to finish (`floor`)
    const hasLeft = i > 0 && !(i === 1 && groups[0].fixedMs !== undefined);
    const left = hasLeft ? starts[i - 1] : floor;
    const right = j + 1 < groups.length ? starts[j + 1] : Math.max(left, speechEnd - MIN_DRAW_MS);
    const offset = hasLeft ? 1 : 0;
    for (let k = 0; k < n; k++) starts[i + k] = left + ((k + offset) * (right - left)) / (n + offset);
    i = j + 1;
  }

  const windows: GroupWindow[] = [];
  let prevEnd = -Infinity;
  groups.forEach((g, k) => {
    const startMs = Math.max(starts[k], prevEnd + PEN_GAP_MS, 0);
    const nextStart = k + 1 < groups.length ? starts[k + 1] : sceneDurationMs - END_MARGIN_MS;
    const room = nextStart - PEN_GAP_MS - startMs;
    const duration = Math.max(MIN_DRAW_MS, Math.min(g.naturalMs, room));
    windows.push({ startMs, endMs: startMs + duration, compressed: duration < g.naturalMs * 0.6 });
    prevEnd = startMs + duration;
  });
  return windows;
};

/**
 * Splits a group's window across its strokes, in proportion to each stroke's length, with a short pen lift
 * (counted as `liftPx` of extra length) after every stroke. Returns [start, end] ms per stroke.
 */
export const strokeWindows = (lengths: number[], window: { startMs: number; endMs: number }, liftPx: number): [number, number][] => {
  const total = lengths.reduce((sum, l) => sum + l + liftPx, 0) - liftPx;
  const span = window.endMs - window.startMs;
  let cursor = window.startMs;
  return lengths.map((len) => {
    const draw = total > 0 ? (len / total) * span : 0;
    const res: [number, number] = [cursor, cursor + draw];
    cursor += draw + (total > 0 ? (liftPx / total) * span : 0);
    return res;
  });
};
