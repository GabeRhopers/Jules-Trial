// One vertical (1080x1920) series episode, timed entirely by the audio manifest from make_audio.py.
// Shots are hard cuts (micro-drama style). The camera pushes in slowly on each shot's focus.
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { CtaEndCard } from "../../../src/components/CtaEndCard";
import { BrandProvider, useBrand } from "../../../src/lib/brand-context";
import { useBrandFonts } from "../../../src/lib/fonts";
import { getBrand, getBrandAsset } from "../../../src/lib/registry";
import { Frank, Nefi, Tech, type CharProps } from "./characters";
import { getEpisode, seriesBibles } from "./registry";
import { Basement, CO_ALARM, FURNACE, GROUND, LivingRoom, Outside, Snow, Van } from "./sets";
import type { CastMember, Episode, EpisodeManifest, ManifestLine, SeriesBible, Shot } from "./types";

export const SERIES_FPS = 30;
export type SeriesProps = { episodeId: string; manifest?: EpisodeManifest };

export const calculateSeriesMetadata: CalculateMetadataFunction<SeriesProps> = async ({ props, abortSignal }) => {
  const res = await fetch(staticFile(`audio/series/${props.episodeId}/manifest.json`), { signal: abortSignal });
  if (!res.ok) throw new Error(`No audio for ${props.episodeId}. Run: .venv/bin/python modules/series/scripts/make_audio.py <episode.json>`);
  const manifest = (await res.json()) as EpisodeManifest;
  const episode = getEpisode(props.episodeId);
  if (manifest.shots.length !== episode.shots.length || manifest.shots.some((s, i) => s.id !== episode.shots[i].id)) {
    throw new Error(`Audio is out of date for ${props.episodeId} (shots changed). Re-run make_audio.py.`);
  }
  return { durationInFrames: Math.ceil((manifest.durationMs / 1000) * SERIES_FPS), props: { ...props, manifest } };
};

const SCALE: Record<string, number> = { frank: 0.82, nefi: 0.86, tech: 0.84 };
const HEAD_Y: Record<string, number> = { frank: -950, nefi: -760, tech: -830 };
const CAMERA_ANCHOR = { x: 540, y: 760 };

const lineAt = (lines: ManifestLine[], who: string, ms: number) => lines.find((l) => l.who === who && ms >= l.startMs && ms < l.endMs);

export const SeriesEpisode: React.FC<SeriesProps> = ({ episodeId, manifest }) => {
  const episode = getEpisode(episodeId);
  const series = seriesBibles[episode.series];
  const brand = getBrand(series.brand);
  const fonts = useBrandFonts(brand);
  if (!manifest) return null;
  return (
    <BrandProvider brand={brand} fonts={fonts} logoSrc={getBrandAsset(brand.id, brand.logo)}>
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        {fonts.ready && <Stage episode={episode} series={series} manifest={manifest} />}
        <Audio src={staticFile(manifest.audio)} />
      </AbsoluteFill>
    </BrandProvider>
  );
};

const Stage: React.FC<{ episode: Episode; series: SeriesBible; manifest: EpisodeManifest }> = ({ episode, series, manifest }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand } = useBrand();
  const ms = (frame / fps) * 1000;
  const t = frame / fps;
  const idx = Math.max(0, manifest.shots.findIndex((s) => ms >= s.startMs && ms < s.endMs));
  const timing = manifest.shots[idx] ?? manifest.shots[manifest.shots.length - 1];
  const shot: Shot = episode.shots[idx];
  const progress = Math.min(1, (ms - timing.startMs) / Math.max(1, timing.endMs - timing.startMs));
  const fx = new Set(shot.fx);
  const shotEffects = manifest.effects.filter((e) => e.shot === shot.id && ms >= e.startMs);
  const lastEffect = (names: string[]) => [...manifest.effects].reverse().find((e) => names.includes(e.name) && ms >= e.startMs);

  if (shot.location === "card" || shot.location === "endcard") {
    return (
      <>
        {shot.location === "card" ? <Card shot={shot} series={series} episode={episode} localMs={ms - timing.startMs} /> : (
          <Sequence from={Math.round((timing.startMs / 1000) * fps)} layout="none">
            <EndCard episode={episode} />
          </Sequence>
        )}
        {shot.location === "card" && <Captions manifest={manifest} series={series} ms={ms} />}
      </>
    );
  }

  // Cast with expression overrides from the current line and reactions to sound effects
  const cast: CastMember[] = shot.cast.map((c) => {
    let member = { ...c };
    for (const e of shotEffects) if (e.react?.[c.id]) member = { ...member, ...e.react[c.id] };
    const line = lineAt(manifest.lines, c.id, ms);
    if (line?.expr) member.expr = line.expr;
    return member;
  });

  // Camera
  const focusMember = cast.find((c) => c.id === shot.camera.focus);
  const focus =
    shot.camera.focus === "furnace" ? FURNACE
    : focusMember ? { x: focusMember.x, y: GROUND + HEAD_Y[focusMember.id] * (SCALE[focusMember.id] ?? 0.85) * 0.78 }
    : { x: 540, y: 900 };
  const zoom = shot.camera.zoom * (1 + 0.045 * progress);
  const zap = lastEffect(["zap"]);
  const zapAge = zap ? ms - zap.startMs : Infinity;
  const shake = zapAge < 500 ? Math.sin(frame * 3) * 14 * (1 - zapAge / 500) : 0;

  // World state from the sound effects so far
  const flame = lastEffect(["ignite", "cutoff", "zap"]);
  const furnaceOn = flame?.name === "ignite";
  const chirp = manifest.effects.some((e) => e.name === "chirp" && ms >= e.startMs && ms < e.startMs + 450);
  const vanFx = manifest.effects.find((e) => e.shot === shot.id && e.name === "van");
  const vanX = fx.has("van-parked") ? 560 : vanFx && ms >= vanFx.startMs ? interpolate(ms - vanFx.startMs, [0, 1300], [1200, 620], { extrapolateRight: "clamp" }) : null;

  const charProps = (c: CastMember): CharProps => {
    const line = lineAt(manifest.lines, c.id, ms);
    const mouth = line ? (line.mouth[Math.floor(((ms - line.startMs) / 1000) * fps)] ?? 0) : 0;
    const seed = c.id.length * 37;
    return {
      pose: c.pose, expr: c.expr, mouth, t: t + seed,
      blink: (frame + seed) % 104 < 4, outfit: c.outfit, singed: c.singed,
      shiver: fx.has("cold") && c.id === "nefi", primary: brand.colors.primary, accent: brand.colors.accent,
    };
  };

  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <g transform={`translate(${CAMERA_ANCHOR.x + shake} ${CAMERA_ANCHOR.y}) scale(${zoom}) translate(${-focus.x} ${-focus.y})`}>
          {shot.location === "living-room" && <LivingRoom t={t} cold={fx.has("cold")} warm={fx.has("warm")} chirp={chirp} />}
          {shot.location === "basement" && <Basement t={t} furnaceOn={furnaceOn} puddle={fx.has("puddle")} />}
          {shot.location === "outside" && <Outside t={t} powerOn={false} />}
          {vanX !== null && <Van x={vanX} primary={brand.colors.primary} accent={brand.colors.accent} name={brand.displayName.replace(/ Co\.$/, "")} />}
          {cast.map((c) => {
            const s = SCALE[c.id] ?? 0.85;
            const p = charProps(c);
            if (c.pose === "carried") {
              return (
                <g key={c.id} transform={`translate(${c.x - 190} ${GROUND - 455}) scale(${s * 0.85}) rotate(78)`}>
                  <Nefi {...p} />
                </g>
              );
            }
            const El = c.id === "frank" ? Frank : c.id === "nefi" ? Nefi : Tech;
            return (
              <g key={c.id} transform={`translate(${c.x} ${GROUND}) scale(${s})`}>
                <El {...p} />
              </g>
            );
          })}
          {zapAge < 350 && <Bolt />}
          {shotEffects.map((e) => (e.label ? <SoundWord key={`${e.name}-${e.startMs}`} label={e.label} name={e.name} ageMs={ms - e.startMs} location={shot.location} /> : null))}
          {fx.has("snow") && <Snow t={t} />}
        </g>
      </svg>
      {fx.has("cold") && <AbsoluteFill style={{ backgroundColor: "rgba(120,170,255,0.10)" }} />}
      {fx.has("warm") && <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 60%, rgba(255,170,80,0.22), rgba(255,120,40,0.05) 70%)" }} />}
      {fx.has("dark") && <AbsoluteFill style={{ background: "radial-gradient(circle at 25% 30%, rgba(40,60,110,0.55), rgba(3,5,14,0.86) 60%)" }} />}
      {fx.has("recap") && <Recap />}
      {zapAge < 400 && <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: interpolate(zapAge, [0, 400], [1, 0]) }} />}
      <Vignette />
      {fx.has("title") && <TitleOverlay series={series} episode={episode} ms={ms} />}
      {fx.has("next") && ms - timing.startMs > 1200 && <NextTag text="NEXT EPISODE: THE WATER HEATER" />}
      <Captions manifest={manifest} series={series} ms={ms} />
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />;

const Bolt: React.FC = () => (
  <path d="M 420 520 L 360 760 L 460 740 L 380 1020 L 560 700 L 450 720 L 520 520 Z" fill="#FFF36B" stroke="#FFFFFF" strokeWidth={10} />
);

const SOUND_POS: Record<string, { x: number; y: number }> = {
  click: { x: FURNACE.x + 180, y: 760 }, ignite: { x: FURNACE.x - 150, y: 920 }, cutoff: { x: FURNACE.x + 150, y: 960 },
  zap: { x: 560, y: 560 }, chirp: { x: CO_ALARM.x + 150, y: CO_ALARM.y + 40 }, hum: { x: FURNACE.x, y: 700 },
  van: { x: 820, y: 1000 }, pop: { x: 760, y: 560 }, drip: { x: 200, y: 1250 },
};

const SoundWord: React.FC<{ label: string; name: string; ageMs: number; location: string }> = ({ label, name, ageMs, location }) => {
  const { fps } = useVideoConfig();
  const { fonts } = useBrand();
  if (ageMs > 1100) return null;
  const pos = name === "chirp" && location !== "living-room" ? { x: 760, y: 520 } : SOUND_POS[name] ?? { x: 540, y: 600 };
  const pop = spring({ frame: (ageMs / 1000) * fps, fps, config: { damping: 9, stiffness: 180 } });
  const opacity = interpolate(ageMs, [800, 1100], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rot = ((label.length * 7) % 14) - 7;
  return (
    <g transform={`translate(${pos.x} ${pos.y}) rotate(${rot}) scale(${pop})`} opacity={opacity}>
      <text textAnchor="middle" fontFamily={fonts.heading} fontWeight={800} fontStyle="italic" fontSize={name === "zap" ? 150 : 96} fill="#FFE14D" stroke="#1B1A22" strokeWidth={14} paintOrder="stroke">
        {label}
      </text>
    </g>
  );
};

const Recap: React.FC = () => {
  const { fonts } = useBrand();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "rgba(80,50,20,0.28)", mixBlendMode: "multiply" }} />
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: fonts.heading, fontWeight: 800, fontSize: 54, letterSpacing: 6, color: "#FFFFFF", textShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>
        PREVIOUSLY ON
      </div>
    </AbsoluteFill>
  );
};

const TitleOverlay: React.FC<{ series: SeriesBible; episode: Episode; ms: number }> = ({ series, episode, ms }) => {
  const { fonts } = useBrand();
  const { fps } = useVideoConfig();
  const inP = spring({ frame: (ms / 1000) * fps - 4, fps, config: { damping: 14 } });
  const out = interpolate(ms, [3200, 3700], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: episode.number === 1 ? 300 : 380, left: 0, right: 0, textAlign: "center", opacity: out, transform: `translateY(${(1 - inP) * -40}px)` }}>
      <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 120, color: "#BFE8FF", letterSpacing: 4, WebkitTextStroke: "10px #10213F", paintOrder: "stroke fill", lineHeight: 1 }}>{series.title}</div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 44, color: "#FFFFFF", marginTop: 12, textShadow: "0 3px 12px rgba(0,0,0,0.8)" }}>
        Episode {episode.number}: {episode.title}
      </div>
    </div>
  );
};

const NextTag: React.FC<{ text: string }> = ({ text }) => {
  const { fonts, brand } = useBrand();
  return (
    <div style={{ position: "absolute", top: 320, left: 65, right: 65, textAlign: "center" }}>
      <span style={{ display: "inline-block", backgroundColor: brand.colors.accent, color: brand.colors.textOnAccent, fontFamily: fonts.heading, fontWeight: 800, fontSize: 44, padding: "14px 30px", borderRadius: 999 }}>
        {text}
      </span>
    </div>
  );
};

/** Dialogue captions: speaker chip + the line in pages of up to 6 words, spoken word highlighted. */
const Captions: React.FC<{ manifest: EpisodeManifest; series: SeriesBible; ms: number }> = ({ manifest, series, ms }) => {
  const { fonts } = useBrand();
  const line = manifest.lines.find((l) => ms >= l.startMs && ms < l.endMs + 250);
  if (!line) return null;
  const who = series.characters.find((c) => c.id === line.who);
  const pages: (typeof line.words)[] = [];
  for (let i = 0; i < line.words.length; i += 6) pages.push(line.words.slice(i, i + 6));
  const page = [...pages].reverse().find((p) => ms >= p[0].startMs) ?? pages[0];
  const color = who?.captionColor ?? "#FFFFFF";
  const narrator = line.who === "narrator";
  return (
    <div data-qc="captions" style={{ position: "absolute", left: 65, right: 65, top: 1010, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      {!narrator && (
        <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 38, letterSpacing: 3, color: "#10131C", backgroundColor: color, padding: "6px 22px", borderRadius: 999 }}>
          {who?.name.toUpperCase()}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 18, rowGap: 4, fontFamily: fonts.heading, fontWeight: 800, fontSize: 68, lineHeight: 1.12, textAlign: "center", fontStyle: narrator ? "italic" : "normal" }}>
        {page.map((w) => {
          const active = ms >= w.startMs && ms < w.endMs + 120;
          return (
            <span key={w.startMs} style={{ color: active ? color : "#FFFFFF", WebkitTextStroke: "10px #0B0D14", paintOrder: "stroke fill", textShadow: "0 5px 16px rgba(0,0,0,0.6)" }}>
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Card: React.FC<{ shot: Shot; series: SeriesBible; episode: Episode; localMs: number }> = ({ shot, series, localMs }) => {
  const { fonts, brand } = useBrand();
  const { fps } = useVideoConfig();
  const p = spring({ frame: (localMs / 1000) * fps, fps, config: { damping: 12 } });
  const tip = shot.id.includes("tip");
  return (
    <AbsoluteFill style={{ background: tip ? `linear-gradient(180deg, ${brand.colors.background}, ${brand.colors.backgroundAlt})` : "radial-gradient(circle at 50% 40%, #1C2B55, #05070F 75%)", alignItems: "center", justifyContent: "flex-start", paddingTop: 360 }}>
      <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 52, color: tip ? brand.colors.accent : "#BFE8FF", letterSpacing: 6, opacity: p }}>{tip ? "DEMO HVAC" : series.title}</div>
      <div style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: tip ? 110 : 120, color: "#FFFFFF", textAlign: "center", lineHeight: 1.02, marginTop: 30, padding: "0 70px", transform: `scale(${0.8 + 0.2 * p})` }}>
        {shot.card?.title}
      </div>
      {tip && (
        <svg width={420} height={420} viewBox="0 0 420 420" style={{ marginTop: 50, transform: `scale(${p})` }}>
          <path d="M 230 40 L 120 230 L 200 225 L 160 380 L 300 170 L 215 178 L 270 40 Z" fill="#FFE14D" stroke="#1B1A22" strokeWidth={10} />
          <circle cx={210} cy={210} r={185} fill="none" stroke="#FF3B30" strokeWidth={34} />
          <path d="M 80 80 L 340 340" stroke="#FF3B30" strokeWidth={34} strokeLinecap="round" />
        </svg>
      )}
      {!tip && shot.card?.subtitle && (
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 48, color: brand.colors.accent, marginTop: 36, opacity: p }}>{shot.card.subtitle}</div>
      )}
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ episode: Episode }> = ({ episode }) => {
  const { brand } = useBrand();
  const cta = episode.cta ?? brand.cta;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 20%, ${brand.colors.backgroundAlt}, ${brand.colors.background} 70%)`, padding: "300px 80px 0" }}>
      <CtaEndCard headline={cta.headline} button={cta.button} subline={cta.subline} scale={1} />
    </AbsoluteFill>
  );
};
