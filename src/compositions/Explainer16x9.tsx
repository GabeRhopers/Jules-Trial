import type { CalculateMetadataFunction } from "remotion";
import { resolveVideo, type ResolvedProps } from "../lib/load-video";
import { FormatScene, type SceneSizes } from "./scenes/Scenes";
import { VideoShell, type ShellLayout } from "./VideoShell";

const W = 1920;
const H = 1080;
/** Title-safe area: 90% of the frame (5% margin on every side), the broadcast and web standard */
const SAFE = { x: W * 0.05, y: H * 0.05, width: W * 0.9, height: H * 0.9 };
const CAPTION_WIDTH = 1400;

export const EXPLAINER_LAYOUT: ShellLayout = {
  width: W,
  height: H,
  fps: 30,
  safe: SAFE,
  sceneArea: { x: 150, y: 110, width: 1620, height: 730 },
  captions: { left: (W - CAPTION_WIDTH) / 2, width: CAPTION_WIDTH, bottom: 70, scale: 0.62, maxWordsPerPage: 7 },
  progress: { x: SAFE.x, y: SAFE.y + 6, width: SAFE.width, height: 6 },
};

const SIZES: SceneSizes = {
  hook: 120,
  headline: 92,
  body: 40,
  stat: 200,
  badge: 120,
  label: 32,
  kicker: 34,
  cta: 0.9,
  pointLayout: "split",
  lowerThird: { x: 150, bottom: 220, scale: 0.9 },
};

export const calculateExplainerMetadata: CalculateMetadataFunction<ResolvedProps> = async ({ props, abortSignal }) => {
  const resolved = await resolveVideo(props, EXPLAINER_LAYOUT.fps, abortSignal);
  return { durationInFrames: resolved.timeline.durationInFrames, props: { ...props, resolved } };
};

/** 1920x1080 explainer (website, YouTube, LinkedIn, sales decks): hook, problem, solution, benefits with proof, CTA. */
export const Explainer16x9: React.FC<ResolvedProps> = (props) => (
  <VideoShell {...props} layout={EXPLAINER_LAYOUT} renderScene={(args) => <FormatScene {...args} area={EXPLAINER_LAYOUT.sceneArea} sizes={SIZES} />} />
);
