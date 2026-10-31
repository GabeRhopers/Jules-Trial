import type { CalculateMetadataFunction } from "remotion";
import { resolveVideo, type ResolvedProps } from "../lib/load-video";
import { FormatScene, type SceneSizes } from "./scenes/Scenes";
import { VideoShell, type ShellLayout } from "./VideoShell";

const W = 1080;
const H = 1080;
/** Feed posts have little overlaid UI; keep a 60 px margin so nothing touches the edge or a rounded crop */
const SAFE = { x: 60, y: 60, width: 960, height: 960 };
const CAPTION_WIDTH = 880;

export const PROMO_LAYOUT: ShellLayout = {
  width: W,
  height: H,
  fps: 30,
  safe: SAFE,
  sceneArea: { x: 100, y: 120, width: 880, height: 560 },
  captions: { left: (W - CAPTION_WIDTH) / 2, width: CAPTION_WIDTH, bottom: 90, scale: 0.8, maxWordsPerPage: 4 },
  progress: { x: 100, y: 76, width: 880, height: 6 },
};

const SIZES: SceneSizes = {
  hook: 96,
  headline: 76,
  body: 34,
  stat: 140,
  badge: 100,
  label: 30,
  kicker: 32,
  cta: 0.7,
  pointLayout: "stack",
  lowerThird: { x: 100, bottom: 290, scale: 0.8 },
  whiteboard: { title: 52, label: 32, icon: 170 },
};

export const calculatePromoMetadata: CalculateMetadataFunction<ResolvedProps> = async ({ props, abortSignal }) => {
  const resolved = await resolveVideo(props, PROMO_LAYOUT.fps, abortSignal);
  return { durationInFrames: resolved.timeline.durationInFrames, props: { ...props, resolved } };
};

/** 1080x1080 promo (feeds, ads): full-bleed B-roll slots with headline and lower thirds, CTA. */
export const PromoSquare1x1: React.FC<ResolvedProps> = (props) => (
  <VideoShell {...props} layout={PROMO_LAYOUT} renderScene={(args) => <FormatScene {...args} area={PROMO_LAYOUT.sceneArea} sizes={SIZES} />} />
);
