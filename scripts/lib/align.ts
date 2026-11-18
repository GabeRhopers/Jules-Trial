// Text and timing helpers for narration. Pure functions, unit-tested in scripts/lib/align.test.ts.
//
// The captions show the script text exactly as written ("AAMA 611", "18 µm"), but the voice may
// need different words ("A-A-M-A six eleven", "18 microns"). applyPronunciations() builds the
// spoken text plus a map from every spoken character back to the original text, and
// wordsFromCharTimings() turns per-character times from the voice into per-word times for the
// original words.
import type { Word } from "../../src/lib/types.ts";

export type Pronunciation = { term: string; say: string };
export type Spoken = {
  /** Text sent to the voice */
  text: string;
  /** For each spoken character: index of the original character it came from */
  origin: number[];
};
/** Time range of one spoken character, in ms. null = no timing (e.g. whitespace the voice skipped). */
export type CharTiming = { startMs: number; endMs: number } | null;

const isAlnum = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

export const applyPronunciations = (original: string, pronunciations: Pronunciation[]): Spoken => {
  // Longest terms first, so "AAMA 611" wins over a shorter overlapping term
  const terms = [...pronunciations].sort((a, b) => b.term.length - a.term.length);
  let text = "";
  const origin: number[] = [];
  let i = 0;
  while (i < original.length) {
    const match = terms.find(({ term }) => {
      if (!original.startsWith(term, i)) return false;
      if (isAlnum(term[0]) && isAlnum(original[i - 1])) return false;
      if (isAlnum(term[term.length - 1]) && isAlnum(original[i + term.length])) return false;
      return true;
    });
    if (match) {
      // Spread the replacement's characters evenly over the original term's characters,
      // so a multi-word term ("AAMA 611") still gives each caption word its own time slice.
      for (let k = 0; k < match.say.length; k++) {
        origin.push(i + Math.min(match.term.length - 1, Math.floor((k / match.say.length) * match.term.length)));
      }
      text += match.say;
      i += match.term.length;
    } else {
      text += original[i];
      origin.push(i);
      i++;
    }
  }
  return { text, origin };
};

/** Character spans [start, end) of each whitespace-separated word, matching how captions split words. */
export const wordSpans = (original: string): { text: string; start: number; end: number }[] => {
  const spans: { text: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  for (let m = re.exec(original); m; m = re.exec(original)) spans.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return spans;
};

/**
 * Per-word timings for the ORIGINAL words, from per-character timings of the SPOKEN text.
 * Words that got no timing at all are placed between their neighbors.
 */
export const wordsFromCharTimings = (original: string, spoken: Spoken, timings: CharTiming[], durationMs: number): Word[] => {
  const spans = wordSpans(original);
  const ranges = spans.map(() => ({ start: Infinity, end: -Infinity }));
  spoken.origin.forEach((orig, k) => {
    const t = timings[k];
    if (!t || /\s/.test(spoken.text[k])) return;
    const w = spans.findIndex((s) => orig >= s.start && orig < s.end);
    if (w === -1) return;
    ranges[w].start = Math.min(ranges[w].start, t.startMs);
    ranges[w].end = Math.max(ranges[w].end, t.endMs);
  });
  const words: Word[] = spans.map((s, i) => ({ text: s.text, startMs: ranges[i].start, endMs: ranges[i].end }));
  // Fill gaps (no timing) by interpolating between neighbors
  for (let i = 0; i < words.length; i++) {
    if (Number.isFinite(words[i].startMs)) continue;
    const prevEnd = i > 0 ? words[i - 1].endMs : 0;
    let j = i;
    while (j < words.length && !Number.isFinite(words[j].startMs)) j++;
    const nextStart = j < words.length ? words[j].startMs : durationMs;
    const step = (nextStart - prevEnd) / (j - i);
    for (let k = i; k < j; k++) {
      words[k].startMs = prevEnd + step * (k - i);
      words[k].endMs = prevEnd + step * (k - i + 1);
    }
  }
  return words.map((w) => ({ text: w.text, startMs: Math.round(w.startMs), endMs: Math.round(Math.max(w.endMs, w.startMs + 40)) }));
};

/** Per-character timings from word/token timings that carry character offsets in the spoken text (Kokoro). */
export const charTimingsFromTokens = (
  spokenLength: number,
  tokens: { charStart: number; charEnd: number; startMs: number; endMs: number }[],
): CharTiming[] => {
  const timings: CharTiming[] = new Array(spokenLength).fill(null);
  for (const t of tokens) for (let k = t.charStart; k < t.charEnd && k < spokenLength; k++) timings[k] = { startMs: t.startMs, endMs: t.endMs };
  return timings;
};
