import { Composition, Folder, type CalculateMetadataFunction } from "remotion";
import { calculateExplainerMetadata, EXPLAINER_LAYOUT, Explainer16x9 } from "./compositions/Explainer16x9";
import { calculatePromoMetadata, PROMO_LAYOUT, PromoSquare1x1 } from "./compositions/PromoSquare1x1";
import { getPhotoAd, PHOTO_AD_SIZE, PhotoAd9x16, photoAdDuration } from "./compositions/PhotoAd9x16";
import { calculateReelMetadata, REEL_LAYOUT, SocialReel9x16 } from "./compositions/SocialReel9x16";
import type { ShellLayout } from "./compositions/VideoShell";
import type { ResolvedProps } from "./lib/load-video";
import { photoAds, videos } from "./lib/registry";
import { LorinTotalCost, STORY_SIZES, storyDurationSec } from "./stories/LorinTotalCost";
import { LookDev } from "./hdd/LookDev";
import { DtiHddCaptionLayer, DtiHddExplainer, HDD_DURATION_FRAMES, HDD_FPS } from "./hdd/DtiHddExplainer";
import { FIREARMS_SIZES, firearmsDurationSec, LorinFirearms } from "./stories/LorinFirearms";
import type { VideoFormat } from "./lib/types";

const FORMATS: Record<VideoFormat, { component: React.FC<ResolvedProps>; layout: ShellLayout; calculateMetadata: CalculateMetadataFunction<ResolvedProps> }> = {
  SocialReel9x16: { component: SocialReel9x16, layout: REEL_LAYOUT, calculateMetadata: calculateReelMetadata },
  Explainer16x9: { component: Explainer16x9, layout: EXPLAINER_LAYOUT, calculateMetadata: calculateExplainerMetadata },
  PromoSquare1x1: { component: PromoSquare1x1, layout: PROMO_LAYOUT, calculateMetadata: calculatePromoMetadata },
};

// One composition per folder in videos/, grouped by format. The composition id is the video id,
// so rendering is: npx remotion render <video-id> out/<brand>/<video-id>.mp4
// In Studio, change the brandId prop to preview the same video in another brand.
export const RemotionRoot: React.FC = () => (
  <>
    {(Object.keys(FORMATS) as VideoFormat[]).map((format) => {
      const { component, layout, calculateMetadata } = FORMATS[format];
      return (
        <Folder key={format} name={format}>
          {videos
            .filter((v) => v.format === format)
            .map((video) => (
              <Composition
                key={video.id}
                id={video.id}
                component={component}
                width={layout.width}
                height={layout.height}
                fps={layout.fps}
                // Placeholder only: calculateMetadata replaces it with the narration length
                durationInFrames={layout.fps * 30}
                defaultProps={{ videoId: video.id, brandId: video.brand, showSafeZones: false }}
                calculateMetadata={calculateMetadata}
              />
            ))}
        </Folder>
      );
    })}
    {/* Custom stories (one composition each, text and timing in stories/<id>/config.json) */}
    <Folder name="Stories">
      {(["9x16", "16x9"] as const).map((format) => (
        <Composition
          key={format}
          id={format === "9x16" ? "lorin-total-cost" : "lorin-total-cost-16x9"}
          component={LorinTotalCost}
          width={STORY_SIZES[format].width}
          height={STORY_SIZES[format].height}
          fps={STORY_SIZES[format].fps}
          durationInFrames={Math.round(storyDurationSec * STORY_SIZES[format].fps)}
          defaultProps={{ qc: false, format }}
        />
      ))}
      {(["9x16", "16x9"] as const).map((format) => (
        <Composition
          key={`firearms-${format}`}
          id={format === "9x16" ? "lorin-firearms" : "lorin-firearms-16x9"}
          component={LorinFirearms}
          width={FIREARMS_SIZES[format].width}
          height={FIREARMS_SIZES[format].height}
          fps={FIREARMS_SIZES[format].fps}
          durationInFrames={Math.round(firearmsDurationSec * FIREARMS_SIZES[format].fps)}
          defaultProps={{ qc: false, format }}
        />
      ))}
    </Folder>
    <Folder name="HDD">
      {/* DTI HDD explainer (3D remake): with burned-in captions, and clean (no captions) */}
      <Composition id="dti-hdd-explainer-captions" component={DtiHddExplainer} width={1920} height={1080} fps={HDD_FPS} durationInFrames={HDD_DURATION_FRAMES} defaultProps={{ captions: true, draft: true }} />
      <Composition id="dti-hdd-explainer" component={DtiHddExplainer} width={1920} height={1080} fps={HDD_FPS} durationInFrames={HDD_DURATION_FRAMES} defaultProps={{ captions: false, draft: true }} />
      <Composition id="dti-hdd-caption-layer" component={DtiHddCaptionLayer} width={1920} height={1080} fps={HDD_FPS} durationInFrames={HDD_DURATION_FRAMES} />
      <Composition id="hdd-lookdev" component={LookDev} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{ view: "aerial" }} />
    </Folder>
    {/* Photo ads: one still image + animated text + sound effects, no narration (photo-ads/<id>/config.json) */}
    <Folder name="PhotoAd9x16">
      {photoAds.map((ad) => (
        <Composition
          key={ad.id}
          id={ad.id}
          component={PhotoAd9x16}
          width={PHOTO_AD_SIZE.width}
          height={PHOTO_AD_SIZE.height}
          fps={PHOTO_AD_SIZE.fps}
          durationInFrames={photoAdDuration(getPhotoAd(ad.id), PHOTO_AD_SIZE.fps)}
          defaultProps={{ adId: ad.id }}
        />
      ))}
    </Folder>
  </>
);
