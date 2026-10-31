// Narration drives timing: every scene length comes from its audio duration.
// Pure functions only (no "remotion" import), so Node scripts can reuse them.
import type { NarrationManifest, Word } from "./types";

/** Breathing room after each scene's narration before the next scene starts. */
export const SCENE_TAIL_MS = 250;
/** Extra hold on the last scene (CTA) after the narration ends. */
export const END_HOLD_MS = 1500;
/** Length of the visual transition between scenes. */
export const TRANSITION_MS = 400;

export type TimedScene = {
  id: string;
  audio: string;
  /** First frame of this scene on the global timeline */
  startFrame: number;
  durationInFrames: number;
  /** Words with times on the global timeline (ms) */
  words: Word[];
};

export type Timeline = { scenes: TimedScene[]; durationInFrames: number };

const msToFrames = (ms: number, fps: number) => Math.ceil((ms / 1000) * fps);

export const buildTimeline = (manifest: NarrationManifest, fps: number): Timeline => {
  let cursor = 0;
  const scenes = manifest.scenes.map((scene, i) => {
    const isLast = i === manifest.scenes.length - 1;
    const durationInFrames = msToFrames(scene.durationMs + (isLast ? END_HOLD_MS : SCENE_TAIL_MS), fps);
    const startFrame = cursor;
    const offsetMs = (startFrame / fps) * 1000;
    cursor += durationInFrames;
    return {
      id: scene.id,
      audio: scene.audio,
      startFrame,
      durationInFrames,
      words: scene.words.map((w) => ({ text: w.text, startMs: w.startMs + offsetMs, endMs: w.endMs + offsetMs })),
    };
  });
  return { scenes, durationInFrames: cursor };
};

export type CaptionPage = { words: Word[]; startMs: number; endMs: number };

/**
 * Groups words into caption pages: at most `maxWords` per page, and a new page
 * after sentence punctuation or a pause, so captions never straddle a sentence.
 */
export const paginateWords = (words: Word[], maxWords: number, pauseMs = 300): CaptionPage[] => {
  const pages: CaptionPage[] = [];
  let current: Word[] = [];
  const flush = () => {
    if (current.length === 0) return;
    pages.push({ words: current, startMs: current[0].startMs, endMs: current[current.length - 1].endMs });
    current = [];
  };
  words.forEach((word, i) => {
    current.push(word);
    const next = words[i + 1];
    const endsSentence = /[.!?]$/.test(word.text);
    const endsClause = /[,;:]$/.test(word.text);
    const pause = next ? next.startMs - word.endMs > pauseMs : true;
    if (current.length >= maxWords || endsSentence || (endsClause && current.length >= 2) || pause) flush();
  });
  flush();
  // Keep each page on screen until the next one starts, so captions don't flicker off between words.
  return pages.map((p, i) => ({ ...p, endMs: pages[i + 1] ? pages[i + 1].startMs : p.endMs + 600 }));
};
