import type { CalculateMetadataFunction } from "remotion";
import { resolveVideo, type ResolvedProps } from "../lib/load-video";
import { REEL_SAFE_ZONE, reelSafeRect } from "../lib/safe-zones";
import { FormatScene, type SceneSizes } from "./scenes/Scenes";
import { VideoShell, type ShellLayout } from "./VideoShell";

const W = 1080;
const H = 1920;
const SAFE = reelSafeRect(W, H);
const RAIL = { x: W - REEL_SAFE_ZONE.rightRail.width, y: H - REEL_SAFE_ZONE.rightRail.bottom, width: REEL_SAFE_ZONE.rightRail.width, height: REEL_SAFE_ZONE.rightRail.bottom };
/** Captions are centered and kept 10 px clear of the right-side action rail */
const CAPTION_WIDTH = 2 * (RAIL.x - 10 - W / 2);
const PAD = 25;

export const REEL_LAYOUT: ShellLayout = {
  width: W,
  height: H,
  fps: 30,
  safe: SAFE,
  keepClear: RAIL,
  sceneArea: { x: SAFE.x + PAD, y: SAFE.y + 70, width: SAFE.width - PAD * 2, height: 680 },
  captions: { left: (W - CAPTION_WIDTH) / 2, width: CAPTION_WIDTH, bottom: H - (SAFE.y + SAFE.height - 10), scale: 1, maxWordsPerPage: 3 },
  progress: { x: SAFE.x + PAD, y: SAFE.y + 16, width: SAFE.width - PAD * 2, height: 8 },
};

const SIZES: SceneSizes = {
  hook: 132,
  headline: 104,
  body: 48,
  stat: 176,
  badge: 150,
  label: 44,
  kicker: 44,
  cta: 0.85,
  pointLayout: "stack",
  lowerThird: { x: SAFE.x + PAD, bottom: H - (SAFE.y + 70 + 680), scale: 1 },
  whiteboard: { title: 52, label: 42, icon: 220 },
};

export const calculateReelMetadata: CalculateMetadataFunction<ResolvedProps> = async ({ props, abortSignal }) => {
  const resolved = await resolveVideo(props, REEL_LAYOUT.fps, abortSignal);
  return { durationInFrames: resolved.timeline.durationInFrames, props: { ...props, resolved } };
};

/** 1080x1920 social reel (Instagram, TikTok, LinkedIn, Shorts): big kinetic captions, strict safe zones. */
export const SocialReel9x16: React.FC<ResolvedProps> = (props) => (
  <VideoShell {...props} layout={REEL_LAYOUT} renderScene={(args) => <FormatScene {...args} area={REEL_LAYOUT.sceneArea} sizes={SIZES} />} />
);
