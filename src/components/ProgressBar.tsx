import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/** Thin progress bar showing how much of the video is left (keeps viewers watching to the CTA). */
export const ProgressBar: React.FC<{ color: string; trackColor?: string; height?: number; style?: CSSProperties }> = ({
  color,
  trackColor = "rgba(255,255,255,0.18)",
  height = 8,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(durationInFrames - 1, 1));
  return (
    <div data-qc="progress" style={{ height, borderRadius: height, backgroundColor: trackColor, overflow: "hidden", ...style }}>
      <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: height, backgroundColor: color }} />
    </div>
  );
};
