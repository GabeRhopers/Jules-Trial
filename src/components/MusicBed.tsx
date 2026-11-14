import { Audio } from "@remotion/media";
import { interpolate, staticFile, useVideoConfig } from "remotion";

type Props = {
  /** File in public/music/ */
  file: string;
  /** Frame ranges where narration is speaking: [startFrame, endFrame] */
  speech: [number, number][];
  volume?: number;
  duckedVolume?: number;
  /** Frames to fade between full and ducked volume */
  rampFrames?: number;
};

/** Looping music bed that automatically ducks under the narration and fades out at the end. */
export const MusicBed: React.FC<Props> = ({ file, speech, volume = 0.3, duckedVolume = 0.08, rampFrames = 8 }) => {
  const { durationInFrames, fps } = useVideoConfig();

  const volumeAt = (f: number) => {
    // 0 = no speech nearby, 1 = fully ducked
    const duck = speech.reduce((max, [start, end]) => {
      const d = interpolate(f, [start - rampFrames, start, end, end + rampFrames], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return Math.max(max, d);
    }, 0);
    const fade = interpolate(f, [0, fps * 0.5, durationInFrames - fps, durationInFrames], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return interpolate(duck, [0, 1], [volume, duckedVolume]) * fade;
  };

  return <Audio src={staticFile(`music/${file}`)} loop volume={volumeAt} />;
};
