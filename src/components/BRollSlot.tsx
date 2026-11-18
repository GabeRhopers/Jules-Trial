import { AbsoluteFill, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand } from "../lib/brand-context";

const isImage = (src: string) => /\.(png|jpe?g|webp|avif)$/i.test(src);

/**
 * Full-frame footage (video or image) with a slow push-in and a brand-colored gradient so text on
 * top stays readable. If the file is missing, shows a clearly labeled placeholder with the shot
 * prompt instead, so a missing clip can never slip into a final render unnoticed.
 */
export const BRollSlot: React.FC<{ src?: string; available: boolean; prompt?: string }> = ({ src, available, prompt }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const { brand, fonts } = useBrand();
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.08]);
  const shade = (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${brand.colors.background}55 0%, ${brand.colors.background}00 35%, ${brand.colors.background}AA 70%, ${brand.colors.background}F2 100%)`,
      }}
    />
  );

  if (src && available) {
    const style = { width: "100%", height: "100%", objectFit: "cover" as const, transform: `scale(${zoom})` };
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {isImage(src) ? <Img src={staticFile(src)} style={style} /> : <OffthreadVideo src={staticFile(src)} muted style={style} />}
        {shade}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${brand.colors.backgroundAlt} 0 ${width / 40}px, ${brand.colors.background} ${width / 40}px ${width / 20}px)`,
          transform: `scale(${zoom})`,
        }}
      />
      <div
        data-qc-placeholder={src ?? "no src"}
        style={{
          position: "absolute",
          top: "8%",
          left: "8%",
          right: "8%",
          padding: width * 0.02,
          border: `${Math.max(3, width / 400)}px dashed ${brand.colors.accent}`,
          borderRadius: 12,
          fontFamily: fonts.body,
          fontSize: Math.max(26, width / 45),
          color: brand.colors.text,
          backgroundColor: `${brand.colors.background}CC`,
        }}
      >
        <div style={{ fontWeight: 700, color: brand.colors.accent }}>B-ROLL SLOT{src ? `: ${src} not found` : ""}</div>
        {prompt ? <div style={{ marginTop: 8, opacity: 0.85 }}>Shot: {prompt}</div> : null}
      </div>
      {shade}
    </AbsoluteFill>
  );
};
