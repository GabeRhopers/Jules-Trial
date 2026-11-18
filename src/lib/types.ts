// Shared types for brands, video configs and narration manifests.
// Used by Remotion compositions (src/) and by Node scripts (scripts/).

export type VoiceProvider = "elevenlabs" | "kokoro";

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
  /** Narration voice. `provider` picks which of the two configs below is used. */
  voice: {
    provider: VoiceProvider;
    elevenlabs?: { voiceId: string; modelId: string; settings: Record<string, number | boolean> };
    kokoro?: { voice: string; lang: string; speed: number };
  };
  /** Words the voice should say differently. Captions still show `term`; the voice says `say`. */
  pronunciations: { term: string; say: string }[];
  /** Look and feel beyond colors and fonts. Switching brand swaps all of this. */
  style: {
    /** Corner radius in px for buttons, pills and tags. 999 = fully rounded pill. */
    cornerRadius: number;
    headlineCase: "upper" | "sentence";
    /** "bold" = springy pops and overshoot (B2C, social). "calm" = smooth, restrained (B2B, technical). */
    motion: "bold" | "calm";
    background: "glow" | "grid" | "hearts";
    transition: "fade" | "slide" | "wipe";
  };
  captionStyle: {
    fontFamily: "heading" | "body";
    /** "box" = highlighted word in a colored box. "color" = highlighted word changes color only. */
    highlight: "box" | "color";
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

export type LowerThirdContent = { title: string; subtitle?: string };

export type SceneVisual =
  | { kind: "hook"; kicker: string; headline: string }
  /** Problem / solution style scene: a kicker ("The problem"), a headline, optional supporting line */
  | { kind: "statement"; kicker?: string; headline: string; body?: string }
  /** Numbered point or benefit, with an optional stat and a short proof line ("Based on 1,200 lots in 2025") */
  | { kind: "point"; number: number; headline: string; stat?: Stat; proof?: string }
  /**
   * Footage slot. `src` is a file in public/ (e.g. "broll/<video-id>/shot-1.mp4", or an image).
   * Without `src` (or if the file is missing) a labeled placeholder shows the `prompt`, so gaps are obvious.
   */
  | { kind: "broll"; src?: string; prompt?: string; headline?: string; lowerThird?: LowerThirdContent }
  | { kind: "cta"; headline?: string; button?: string; subline?: string };

export type SceneConfig = { id: string; text: string; visual: SceneVisual };

export type VideoFormat = "SocialReel9x16" | "Explainer16x9" | "PromoSquare1x1";

export type VideoConfig = {
  id: string;
  brand: string;
  format: VideoFormat;
  title: string;
  /** Word shown on numbered points, e.g. "Sign" -> "Sign 1 of 3". Defaults to "Point". */
  pointLabel?: string;
  /** Music file in public/music/ for this video. Overrides brand.music; null = no music. */
  music?: string | null;
  audience?: string;
  goal?: "lead" | "sale" | "awareness";
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
  source: "placeholder" | VoiceProvider;
  generatedAt: string;
  scenes: SceneNarration[];
};
