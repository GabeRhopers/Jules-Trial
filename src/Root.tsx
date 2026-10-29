import { Composition, Folder } from "remotion";
import { REEL, SocialReel9x16, calculateReelMetadata } from "./compositions/SocialReel9x16";
import { videos } from "./lib/registry";

// One composition per folder in videos/. The composition id is the video id,
// so rendering is: npx remotion render <video-id> out/<brand>/<video-id>.mp4
export const RemotionRoot: React.FC = () => {
  const reels = videos.filter((v) => v.format === "SocialReel9x16");
  return (
    <Folder name="SocialReel9x16">
      {reels.map((video) => (
        <Composition
          key={video.id}
          id={video.id}
          component={SocialReel9x16}
          width={REEL.width}
          height={REEL.height}
          fps={REEL.fps}
          durationInFrames={REEL.fps * 30}
          defaultProps={{ videoId: video.id, showSafeZones: false }}
          calculateMetadata={calculateReelMetadata}
        />
      ))}
    </Folder>
  );
};
