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
  /** Optional look for `whiteboard` scenes. Without it, defaults are used (see src/whiteboard/style.ts). */
  whiteboard?: WhiteboardStyle;
};

/** Brand look for whiteboard (draw-on) scenes. Every field is optional. */
export type WhiteboardStyle = {
  /** Board color. Default "#FBFAF6" (warm white). */
  paper?: string;
  /** Marker color for drawings and handwriting. Default "#1F2328". */
  ink?: string;
  /** Second marker color, for circles and underlines. Default: the brand's primary color. */
  highlight?: string;
  /** Handwriting: "marker" (whiteboard print), "clean" (neat sans), "script" (cursive). Default "marker". */
  font?: WhiteboardFont;
  /**
   * Your own hand image (PNG with transparent background) in brands/<id>/, instead of the built-in marker.
   * `tipX`/`tipY`: where the pen tip is in the image, in % of its width and height (e.g. 8 and 12).
   * `height`: display height in px for a 1080 px tall frame (scaled for other sizes).
   */
  hand?: { file: string; tipX: number; tipY: number; height: number };
};

export type WhiteboardFont = "marker" | "clean" | "script";

/** Options for one node of a whiteboard diagram. The node, its label and the arrows into it draw together. */
export type WhiteboardNode = {
  /** Word from this scene's narration that starts drawing this node. Without it, nodes are spread evenly. */
  at?: string;
  /** Tabler outline icon drawn inside the node, above its text */
  icon?: string;
  /** Draw this node's outline in the highlight color (the answer, the key step) */
  highlight?: boolean;
};

/** One drawing on a whiteboard scene. Drawn when its cue word is spoken. */
export type WhiteboardItem = {
  /** Tabler outline icon name (find one with `npm run icon -- <keyword>`), e.g. "building-factory-2" */
  icon?: string;
  /** Short handwritten label under the icon (1 to 3 words reads best) */
  label?: string;
  /** Word from this scene's narration that starts this drawing. Without it, drawings are spread evenly. */
  at?: string;
  /** Draw a hand-drawn circle around this item, in the highlight color */
  circle?: boolean;
  /** "free" layout only: center of the icon and icon size, in % of the scene area (size % of its height) */
  x?: number;
  y?: number;
  size?: number;
};

export type Stat = { prefix: string; value: number; suffix: string; label: string };

export type LowerThirdContent = { title: string; subtitle?: string };

export type SceneVisual =
  /** `logo: true` shows the brand logo above the kicker, so viewers who scroll early still see who it is */
  | { kind: "hook"; kicker: string; headline: string; logo?: boolean }
  /** Problem / solution style scene: a kicker ("The problem"), a headline, optional supporting line */
  | { kind: "statement"; kicker?: string; headline: string; body?: string }
  /** Numbered point or benefit, with an optional stat and a short proof line ("Based on 1,200 lots in 2025") */
  | { kind: "point"; number: number; headline: string; stat?: Stat; proof?: string }
  /**
   * Footage slot. `src` is a file in public/ (e.g. "broll/<video-id>/shot-1.mp4", or an image).
   * Without `src` (or if the file is missing) a labeled placeholder shows the `prompt`, so gaps are obvious.
   */
  | { kind: "broll"; src?: string; prompt?: string; headline?: string; lowerThird?: LowerThirdContent }
  | { kind: "cta"; headline?: string; button?: string; subline?: string }
  /**
   * Whiteboard explainer: a handwritten title, then icons and labels drawn stroke by stroke by a moving
   * marker, each starting on its cue word. "flow" (default) = up to 4 items in a row joined by arrows,
   * for processes. "free" = you place each item with x/y/size.
   */
  | {
      kind: "whiteboard";
      title?: string;
      layout?: "flow" | "free" | "diagram";
      /** "flow" and "free" layouts */
      items?: WhiteboardItem[];
      /**
       * "diagram" layout: a Mermaid flowchart (boxes, {decisions}, arrows with labels), laid out
       * automatically. Same syntax as Mermaid in GitHub/Notion; see src/whiteboard/flowchart.ts for what is supported.
       */
      diagram?: string;
      /** "diagram" layout: per-node options, keyed by the node id used in `diagram` */
      nodes?: Record<string, WhiteboardNode>;
    };

export type SceneConfig = { id: string; text: string; visual: SceneVisual };

export type VideoFormat = "SocialReel9x16" | "Explainer16x9" | "PromoSquare1x1";

export type VideoConfig = {
  id: string;
  brand: string;
  format: VideoFormat;
  title: string;
  /** Word shown on numbered points, e.g. "Sign" -> "Sign 1 of 3". Defaults to "Point". */
  pointLabel?: string;
  /** Word between the number and the total on numbered points, e.g. "de" -> "Ferramenta 1 de 3". Defaults to "of". */
  pointOfWord?: string;
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
