// Song timing for "Save Me From Me": every visual change follows these numbers.
// Source: videos/save-me-from-me/analysis (81 BPM beat grid, cue times, strong drum hits).
import grid from "../../../videos/save-me-from-me/analysis/grid.json";
import hits from "../../../videos/save-me-from-me/analysis/drum-hits.json";

export const FPS = 30;
export const SONG_SECONDS = 272.7;
export const BEAT = 60 / 80.7;
export const BAR = BEAT * 4;
export const CUE = grid.cues as Record<string, number>;
export const HITS: number[] = hits.strong_hits;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/** Hits between a and b (seconds). */
export const hitsIn = (a: number, b: number) => HITS.filter((h) => h >= a && h < b);

/** 0 to 1, rising by one step per drum hit between a and b, each step easing in over 0.18 s. */
const stepped = (t: number, a: number, b: number) => {
  const hs = hitsIn(a, b);
  if (t <= a || hs.length === 0) return t <= a ? 0 : clamp01((t - a) / (b - a));
  let done = 0;
  for (const h of hs) done += smooth((t - h) / 0.18);
  return done / hs.length;
};

/**
 * How broken the world is, 0 (whole) to 1 (shattered).
 * First crack on the first "From me!", growth through chorus 1, the instrumental break, verse 2 and chorus 2,
 * frozen through the transition and bridge, then pulled back one step per drum hit until the last "Save me".
 */
export const crackLevel = (t: number): number => {
  if (t < CUE.from_me_1) return 0;
  if (t < CUE.from_me_2) return 0.06 + 0.24 * stepped(t, CUE.from_me_1, CUE.from_me_2);
  if (t < CUE.break) return 0.3 + 0.2 * stepped(t, CUE.from_me_2, CUE.break);
  if (t < CUE.CH2) return 0.5 + 0.25 * stepped(t, CUE.break, CUE.CH2);
  if (t < CUE.transition) return 0.75 + 0.25 * stepped(t, CUE.CH2, CUE.transition);
  if (t < CUE.instr2) return 1;
  const healEnd = CUE.vocals_end - 0.6;
  if (t < healEnd) return 1 - stepped(t, CUE.instr2, healEnd);
  return 0;
};

/** Short flash after each strong drum hit: 1 on the hit, decaying in about 0.25 s. */
export const hitPulse = (t: number): number => {
  let p = 0;
  for (const h of HITS) {
    if (h > t) break;
    const d = t - h;
    if (d < 0.4) p = Math.max(p, Math.exp(-d * 12));
  }
  return p;
};

/** Color grade weights: cold blue night, purple and pink breakage glow, warm healing light. */
export const gradeAt = (t: number) => {
  const cold = 1 - smooth((t - CUE.bridge) / (CUE.FC - CUE.bridge));
  const warm = smooth((t - CUE.bridge) / (CUE.vocals_end - CUE.bridge));
  const breakage = t < CUE.from_me_1 ? 0 : t < CUE.CH2 ? 0.45 : t < CUE.transition ? 0.9 : t < CUE.instr2 ? 0.3 : 0.5 * (1 - smooth((t - CUE.FC) / 20));
  return { cold, warm, glow: breakage * (0.45 + 0.55 * hitPulse(t)) };
};

export const sec = (s: number) => Math.round(s * FPS);
