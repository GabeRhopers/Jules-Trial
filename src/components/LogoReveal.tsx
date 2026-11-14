import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";

/** Brand logo that scales up and wipes in from the left. */
export const LogoReveal: React.FC<{ width: number; delay?: number }> = ({ width, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { logoSrc } = useBrand();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.7) });
  return (
    <div
      data-qc="logo"
      style={{
        width,
        clipPath: `inset(0 ${interpolate(progress, [0, 1], [100, 0])}% 0 0)`,
        transform: `scale(${interpolate(progress, [0, 1], [0.92, 1])})`,
        transformOrigin: "left center",
      }}
    >
      <Img src={logoSrc} style={{ width: "100%", display: "block" }} />
    </div>
  );
};
