import { Composition, Folder, type CalculateMetadataFunction } from "remotion";
import { calculateExplainerMetadata, EXPLAINER_LAYOUT, Explainer16x9 } from "./compositions/Explainer16x9";
import { calculatePromoMetadata, PROMO_LAYOUT, PromoSquare1x1 } from "./compositions/PromoSquare1x1";
import { getPhotoAd, PHOTO_AD_SIZE, PhotoAd9x16, photoAdDuration } from "./compositions/PhotoAd9x16";
import { calculateReelMetadata, REEL_LAYOUT, SocialReel9x16 } from "./compositions/SocialReel9x16";
import type { ShellLayout } from "./compositions/VideoShell";
import type { ResolvedProps } from "./lib/load-video";
import { photoAds, videos } from "./lib/registry";
import { LorinTotalCost, STORY_SIZE, storyDurationSec } from "./stories/LorinTotalCost";
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
      <Composition
        id="lorin-total-cost"
        component={LorinTotalCost}
        width={STORY_SIZE.width}
        height={STORY_SIZE.height}
        fps={STORY_SIZE.fps}
        durationInFrames={Math.round(storyDurationSec * STORY_SIZE.fps)}
        defaultProps={{ qc: false }}
      />
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
