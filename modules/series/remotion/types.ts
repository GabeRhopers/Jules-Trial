// Types for the series module: series bible, episode scripts and the audio manifest
// written by modules/series/scripts/make_audio.py.

export type Expr = "neutral" | "happy" | "worried" | "scared" | "annoyed" | "sheepish";
export type Pose =
  | "stand" | "shrug" | "hug" | "arms-up" | "cables" | "point" | "carry" | "carried" | "wave" | "meter" | "rod";

export type CastMember = {
  id: string;
  x: number;
  pose: Pose;
  expr: Expr;
  outfit: string;
  singed?: boolean;
};

export type Beat =
  | { type: "line"; who: string; text: string; expr?: Expr; gapMs?: number }
  | { type: "sfx"; name: string; label?: string; react?: Record<string, Partial<CastMember> & { arrive?: boolean }> }
  | { type: "pause"; ms: number };

export type Shot = {
  id: string;
  location: "living-room" | "basement" | "outside" | "card" | "endcard";
  camera: { focus: string; zoom: number };
  cast: CastMember[];
  fx: string[];
  card?: { title: string; subtitle?: string };
  /** Recap shot showing an earlier state on purpose (skipped by the continuity check) */
  flashback?: boolean;
  beats: Beat[];
};

export type Episode = {
  id: string;
  series: string;
  number: number;
  title: string;
  cta?: { headline: string; button: string; subline: string };
  shots: Shot[];
};

export type SeriesBible = {
  id: string;
  title: string;
  tagline: string;
  brand: string;
  fps: number;
  characters: { id: string; name: string; captionColor: string }[];
};

export type TimedWord = { text: string; startMs: number; endMs: number };
export type ManifestLine = {
  who: string;
  shot: string;
  text: string;
  expr?: Expr | null;
  startMs: number;
  endMs: number;
  words: TimedWord[];
  mouth: number[];
};
export type ManifestEffect = {
  name: string;
  label?: string | null;
  shot: string;
  startMs: number;
  react?: Record<string, Partial<CastMember> & { arrive?: boolean }> | null;
};
export type EpisodeManifest = {
  episode: string;
  durationMs: number;
  audio: string;
  shots: { id: string; startMs: number; endMs: number }[];
  lines: ManifestLine[];
  effects: ManifestEffect[];
};
