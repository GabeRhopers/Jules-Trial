// Shared types for brands, video configs and narration manifests.
// Used by Remotion compositions (src/) and by Node scripts (scripts/).

export type BrandFont = {
  family: string;
  weights: string[];
  /**
   * Optional local font files inside brands/<id>/, keyed by weight ("700", or "100 900" for a
   * variable font). When set, these are used instead of Google Fonts: required for licensed
   * corporate fonts, and makes renders independent of the network.
   */
  files?: Record<string, string>;
};

export type Brand = {
  id: string;
  displayName: string;
  description?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundAlt: string;
    text: string;
    textMuted: string;
    textOnPrimary: string;
    textOnAccent: string;
  };
  fonts: { heading: BrandFont; body: BrandFont };
  /** File name inside brands/<id>/ */
  logo: string;
  toneOfVoice: string[];
  voice: {
    provider: "elevenlabs";
    voiceId: string;
    modelId: string;
    settings: Record<string, number | boolean>;
  };
  pronunciations: { term: string; say: string }[];
  captionStyle: {
    fontFamily: "heading" | "body";
    fontWeight: number;
    fontSizePx: number;
    textTransform: "uppercase" | "none";
    baseColor: string;
    activeColor: string;
    activeBackground: string;
    strokeColor: string;
    maxWordsPerPage: number;
  };
  cta: { headline: string; button: string; subline: string };
  /** File name inside public/music/, or null for no music bed */
  music: string | null;
};

export type Stat = { prefix: string; value: number; suffix: string; label: string };

export type SceneVisual =
  | { kind: "hook"; kicker: string; headline: string }
  | { kind: "point"; number: number; headline: string; stat?: Stat }
  | { kind: "cta"; headline?: string; button?: string; subline?: string };

export type SceneConfig = { id: string; text: string; visual: SceneVisual };

export type VideoFormat = "SocialReel9x16" | "Explainer16x9" | "PromoSquare1x1";

export type VideoConfig = {
  id: string;
  brand: string;
  format: VideoFormat;
  title: string;
  audience?: string;
  goal?: "lead" | "sale" | "awareness";
  narrationSource: "placeholder" | "elevenlabs";
  scenes: SceneConfig[];
};

/** One spoken word, times in ms relative to the start of its scene audio. */
export type Word = { text: string; startMs: number; endMs: number };

export type SceneNarration = {
  id: string;
  /** Exact narration text this audio was made from (stale-audio check) */
  text: string;
  /** Path relative to public/, for staticFile() */
  audio: string;
  durationMs: number;
  /** Hash of text + voice settings, used to skip regenerating unchanged scenes */
  hash: string;
  words: Word[];
};

/** Written to public/audio/<video-id>/manifest.json by scripts/narrate.ts or scripts/placeholder-narration.ts */
export type NarrationManifest = {
  video: string;
  source: "placeholder" | "elevenlabs";
  generatedAt: string;
  scenes: SceneNarration[];
};
