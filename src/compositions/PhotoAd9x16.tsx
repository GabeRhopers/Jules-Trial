import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { QcProbe } from "../components/QcProbe";
import { BrandProvider } from "../lib/brand-context";
import { useBrandFonts } from "../lib/fonts";
import { getBrand, getBrandAsset, getPhotoAdAsset, photoAds } from "../lib/registry";
import { REEL_SAFE_ZONE, reelSafeRect } from "../lib/safe-zones";
import type { Brand, PhotoAdConfig } from "../lib/types";

export const PHOTO_AD_SIZE = { width: 1080, height: 1920, fps: 30 } as const;

export type PhotoAdProps = { adId: string; qc?: boolean };

export const getPhotoAd = (id: string): PhotoAdConfig => {
  const ad = photoAds.find((a) => a.id === id);
  if (!ad) throw new Error(`Photo ad "${id}" not found in photo-ads/`);
  return ad;
};

export const photoAdDuration = (ad: PhotoAdConfig, fps: number) => Math.round((ad.endCard.atSec + ad.endCard.holdSec) * fps);

const SAFE = reelSafeRect(PHOTO_AD_SIZE.width, PHOTO_AD_SIZE.height);
const RAIL = {
  x: PHOTO_AD_SIZE.width - REEL_SAFE_ZONE.rightRail.width,
  y: PHOTO_AD_SIZE.height - REEL_SAFE_ZONE.rightRail.bottom,
  width: REEL_SAFE_ZONE.rightRail.width,
  height: REEL_SAFE_ZONE.rightRail.bottom,
};

/** A sound placed at a time, as its own sequence (so it starts exactly on that frame). */
const Sfx: React.FC<{ file: string; atSec: number; volume: number }> = ({ file, atSec, volume }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(atSec * fps))} name={`sfx ${file} @${atSec}s`} layout="none">
      <Audio src={staticFile(`sfx/${file}`)} volume={volume} />
    </Sequence>
  );
};

/**
 * Still-photo reel: a very slow push-in toward a point (the thermostat), the logo dropping in, text boxes
 * sliding in from the screen edges with their words rising one by one, an optional glow pulse with a beep,
 * then an end card in the brand colors. Every sound starts on the frame of the motion it belongs to.
 */
export const PhotoAd9x16: React.FC<PhotoAdProps> = ({ adId, qc }) => {
  const ad = getPhotoAd(adId);
  const brand = getBrand(ad.brand);
  const fonts = useBrandFonts(brand);
  const logoSrc = getBrandAsset(brand.id, brand.logo);
  const { fps, durationInFrames } = useVideoConfig();
  const end = ad.endCard.atSec;

  return (
    <BrandProvider brand={brand} fonts={fonts} logoSrc={logoSrc}>
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <Sequence durationInFrames={Math.round((end + 0.6) * fps)} name="photo" layout="none">
          <PhotoLayer ad={ad} />
          {ad.logo ? <TopLogo src={logoSrc} {...ad.logo} /> : null}
          {ad.texts.map((t, i) => (
            <TextBox key={i} {...t} brand={brand} font={fonts.heading} />
          ))}
        </Sequence>
        <Sequence from={Math.round(end * fps)} name="end card" layout="none">
          <EndCard brand={brand} logoSrc={logoSrc} headline={ad.endCard.headline} subline={ad.endCard.subline} font={fonts.heading} bodyFont={fonts.body} />
        </Sequence>

        {/* ---- Sound, synced to the motion above ---- */}
        {ad.audio.music ? <Music file={ad.audio.music} endSec={end} totalFrames={durationInFrames} /> : null}
        {ad.audio.wind ? (
          <Sequence durationInFrames={Math.round((end + 0.8) * fps)} name="wind" layout="none">
            <Audio
              src={staticFile("sfx/wind.mp3")}
              volume={(f) => interpolate(f, [0, fps, (end - 0.2) * fps, (end + 0.8) * fps], [0, 0.32, 0.32, 0], { extrapolateRight: "clamp" })}
            />
          </Sequence>
        ) : null}
        {ad.logo ? <Sfx file="pop.mp3" atSec={ad.logo.atSec + 0.12} volume={0.45} /> : null}
        {ad.texts.map((t, i) => (
          <Sfx key={i} file="whoosh.mp3" atSec={Math.max(0, t.atSec - 0.12)} volume={0.55} />
        ))}
        {ad.highlight ? <Sfx file="beep.mp3" atSec={ad.highlight.atSec} volume={0.4} /> : null}
        <Sfx file="whoosh.mp3" atSec={end - 0.1} volume={0.8} />
        <Sfx file="pop.mp3" atSec={end + 0.55} volume={0.6} />
        <Sfx file="chime.mp3" atSec={end + 1.35} volume={1} />

        {qc ? <QcProbe safe={SAFE} keepClear={RAIL} ready={fonts.ready} /> : null}
      </AbsoluteFill>
    </BrandProvider>
  );
};

/** Music bed: fades in, a little louder on the end card, fades out at the very end. */
const Music: React.FC<{ file: string; endSec: number; totalFrames: number }> = ({ file, endSec, totalFrames }) => {
  const { fps } = useVideoConfig();
  return (
    <Audio
      src={staticFile(`music/${file}`)}
      volume={(f) =>
        interpolate(f, [0, fps * 1.2, endSec * fps, (endSec + 0.6) * fps, totalFrames - fps * 0.9, totalFrames], [0, 0.22, 0.22, 0.36, 0.36, 0], {
          extrapolateRight: "clamp",
        })
      }
    />
  );
};

/** The photo with a slow, eased push-in toward the focus point, and the optional glow pulse. */
const PhotoLayer: React.FC<{ ad: PhotoAdConfig }> = ({ ad }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { focusX, focusY, zoomTo, untilSec } = ad.motion;
  const scale = interpolate(frame, [0, untilSec * fps], [1, zoomTo], { easing: Easing.inOut(Easing.sin), extrapolateRight: "clamp" });
  // A few pixels of drift toward the focus point, so the push-in feels like a slow step forward
  const drift = interpolate(frame, [0, untilSec * fps], [0, 1], { easing: Easing.inOut(Easing.sin), extrapolateRight: "clamp" });
  const h = ad.highlight;
  const glow = h
    ? Math.max(
        ...[0, 0.16].map((offset) => {
          const t = frame / fps - (h.atSec + offset);
          return t < 0 ? 0 : Math.exp(-t * 5) * Math.min(1, t * 30);
        }),
      )
    : 0;
  return (
    <AbsoluteFill style={{ transform: `translate(${-drift * 12}px, ${-drift * 6}px) scale(${scale})`, transformOrigin: `${focusX}px ${focusY}px` }}>
      <Img src={getPhotoAdAsset(ad.id, ad.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {h ? (
        <div
          style={{
            position: "absolute",
            left: h.x - h.radius,
            top: h.y - h.radius,
            width: h.radius * 2,
            height: h.radius * 2,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(170,225,255,0.85) 0%, rgba(120,200,255,0.35) 35%, rgba(120,200,255,0) 70%)",
            mixBlendMode: "screen",
            opacity: glow * 0.9,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const TopLogo: React.FC<{ src: string; atSec: number; width: number; y: number }> = ({ src, atSec, width, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - atSec * fps, fps, config: { damping: 13, stiffness: 140, mass: 0.7 } });
  return (
    <Img
      data-qc={p > 0.98 ? "logo" : undefined}
      src={src}
      style={{
        position: "absolute",
        left: (1080 - width) / 2,
        top: y,
        width,
        opacity: Math.min(1, p * 1.6),
        transform: `translateY(${interpolate(p, [0, 1], [-60, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
        filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.25))",
      }}
    />
  );
};

/**
 * Brand-blue box flush with its screen edge, sized to its text, with a red accent on the inner side.
 * It slides in from that edge, then its words rise one by one. "\n" in the text sets the line breaks.
 */
const TextBox: React.FC<PhotoAdConfig["texts"][number] & { brand: Brand; font: string }> = ({ text, atSec, side, y, fontSize = 44, brand, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - atSec * fps;
  const slide = spring({ frame: t, fps, config: { damping: 20, stiffness: 120, mass: 0.8 } });
  const lines = text.split("\n").map((l) => l.trim().split(/\s+/));
  let wordIndex = 0;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        [side]: 0,
        maxWidth: 1000,
        // Off-screen by its own width plus the shadow, then eased in
        transform: `translateX(${interpolate(slide, [0, 1], [side === "left" ? -110 : 110, 0])}%)`,
        backgroundColor: brand.colors.primary,
        [side === "left" ? "borderRight" : "borderLeft"]: `10px solid ${brand.colors.accent}`,
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        // The screen-edge side keeps words 72 px from the edge (Reels side safe zone is 65 px)
        padding: side === "left" ? "26px 34px 26px 72px" : "26px 72px 26px 34px",
        opacity: t < 0 ? 0 : 1,
      }}
    >
      <div
        data-qc={slide > 0.98 ? "text" : undefined}
        style={{ fontFamily: font, fontWeight: 700, fontSize, lineHeight: 1.22, color: "#FFFFFF", textAlign: "center", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
      >
        {lines.map((words, li) => (
          <div key={li}>
            {words.map((w, i) => {
              const p = spring({ frame: t - 7 - wordIndex++ * 2.5, fps, config: { damping: 18, mass: 0.6 } });
              return (
                <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px)`, marginRight: i < words.length - 1 ? "0.26em" : 0 }}>
                  {w}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/** White card in the logo's colors: red and blue swooshes sweep in, the logo pops, the headline rises word by word. */
const EndCard: React.FC<{ brand: Brand; logoSrc: string; headline: string; subline?: string; font: string; bodyFont: string }> = ({
  brand,
  logoSrc,
  headline,
  subline,
  font,
  bodyFont,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(frame, [0, 0.5 * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp" });
  const swoosh = interpolate(frame, [0.15 * fps, 0.85 * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logo = spring({ frame: frame - 0.45 * fps, fps, config: { damping: 11, stiffness: 150, mass: 0.7 } });
  const underline = interpolate(frame, [1.6 * fps, 2.1 * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const brandWord = brand.displayName.split(/[\s(]/)[0];
  const words = headline.split(" ");
  const { primary, accent } = brand.colors;
  // Diagonal wipe from the right edge, like the logo's slanted swoosh
  const edge = interpolate(wipe, [0, 1], [1380, -300]);
  return (
    <AbsoluteFill style={{ clipPath: `polygon(${edge}px 0, 1080px 0, 1080px 1920px, ${edge - 300}px 1920px)`, backgroundColor: "#FFFFFF" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {/* Red swoosh from the top left, blue swoosh from the bottom right */}
        <path
          d="M -40 330 C 200 160, 520 120, 1120 150 L 1120 0 L -40 0 Z"
          fill={accent}
          transform={`translate(${interpolate(swoosh, [0, 1], [-1100, 0])} 0)`}
        />
        <path
          d="M -40 1700 C 420 1620, 820 1600, 1120 1430 L 1120 1960 L -40 1960 Z"
          fill={primary}
          transform={`translate(${interpolate(swoosh, [0, 1], [1100, 0])} 0)`}
        />
      </svg>
      <div style={{ position: "absolute", left: 90, right: 90, top: 520, display: "flex", flexDirection: "column", alignItems: "center", gap: 56 }}>
        <Img
          data-qc={logo > 0.98 ? "end-logo" : undefined}
          src={logoSrc}
          style={{ width: 640, opacity: Math.min(1, logo * 2), transform: `scale(${interpolate(logo, [0, 1], [0.6, 1])})` }}
        />
        <div data-qc="end-headline" style={{ fontFamily: font, fontWeight: 800, fontSize: 96, lineHeight: 1.12, textAlign: "center", color: primary }}>
          {words.map((w, i) => {
            const p = spring({ frame: frame - 0.85 * fps - i * 3, fps, config: { damping: 15, mass: 0.6 } });
            const isBrand = w.replace(/[^\w]/g, "") === brandWord;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.24em",
                  opacity: p,
                  transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
                  color: isBrand ? accent : primary,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ width: 520 * underline, height: 12, borderRadius: 6, backgroundColor: accent, marginTop: -24 }} />
        {subline ? (
          <div data-qc="end-subline" style={{ fontFamily: bodyFont, fontWeight: 600, fontSize: 44, color: "#3A4660", opacity: underline }}>
            {subline}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
