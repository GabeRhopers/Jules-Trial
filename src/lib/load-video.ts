import { staticFile } from "remotion";
import { getBrand, getBrandAsset, getVideo } from "./registry";
import { buildTimeline, type Timeline } from "./timeline";
import type { Brand, NarrationManifest, VideoConfig } from "./types";

export type InputProps = {
  /** Folder name in videos/ */
  videoId: string;
  /** Optional brand override, to preview the same video in another brand */
  brandId?: string;
  /** Show safe-zone guides (Studio only, never in final renders) */
  showSafeZones?: boolean;
  /** Quality-check mode used by scripts/qc.ts */
  qc?: boolean;
};

export type ResolvedProps = InputProps & {
  resolved?: { video: VideoConfig; brand: Brand; logoSrc: string; timeline: Timeline; music: string | null; brollAvailable: string[] };
};

/**
 * Loads the video config, brand and narration manifest, and checks the audio is not stale.
 * Shared by every format's calculateMetadata.
 */
export const resolveVideo = async (props: InputProps, fps: number, abortSignal?: AbortSignal) => {
  const video = getVideo(props.videoId);
  const brand = getBrand(props.brandId ?? video.brand);
  const { resolved, staleScenes, orderChanged } = await resolveVideoConfig(video, brand, fps, { abortSignal });
  if (staleScenes.length > 0 || orderChanged) {
    throw new Error(
      `Narration is out of date for scenes: ${staleScenes.join(", ") || "(scenes added, removed or reordered)"}. Re-run the narration script for "${video.id}".`,
    );
  }
  return resolved;
};

/**
 * Same as resolveVideo, but for a config passed in directly (the editor's unsaved changes).
 * With `allowStale`, scenes whose text changed since the last narration keep their old audio and timing
 * (so the preview still plays) and are listed in `staleScenes`.
 */
export const resolveVideoConfig = async (
  video: VideoConfig,
  brand: Brand,
  fps: number,
  options: { abortSignal?: AbortSignal; allowStale?: boolean; cacheBust?: string } = {},
) => {
  const { abortSignal, allowStale = false, cacheBust } = options;
  const bust = cacheBust ? `?v=${cacheBust}` : "";
  const res = await fetch(staticFile(`audio/${video.id}/manifest.json`) + bust, { signal: abortSignal });
  if (!res.ok) {
    throw new Error(
      `No narration for "${video.id}". Run: node scripts/narrate.ts ${video.id}  (or scripts/placeholder-narration.ts for a silent test track)`,
    );
  }
  const manifest = (await res.json()) as NarrationManifest;

  // A scene is stale when its text changed (or it has no audio yet). Separately, the narration's scene order
  // must match the video's: adding, removing or reordering scenes needs a quick re-run (unchanged audio is reused).
  const staleScenes = video.scenes.filter((scene) => manifest.scenes.find((m) => m.id === scene.id)?.text !== scene.text).map((s) => s.id);
  const orderChanged = manifest.scenes.map((m) => m.id).join("|") !== video.scenes.map((s) => s.id).join("|");
  if (orderChanged && !allowStale) {
    throw new Error(`Narration is out of date (scenes added, removed or reordered). Re-run the narration script for "${video.id}".`);
  }
  if (orderChanged) {
    // Preview only: line up audio by scene id where possible; new scenes get a short silent placeholder
    manifest.scenes = video.scenes.map(
      (scene) =>
        manifest.scenes.find((m) => m.id === scene.id) ?? {
          id: scene.id,
          text: scene.text,
          audio: "",
          durationMs: 2500,
          hash: "",
          words: [{ text: "…", startMs: 0, endMs: 2500 }],
        },
    );
  }

  const timeline = buildTimeline(manifest, fps);

  // B-roll files that actually exist (missing ones render as labeled placeholders)
  const brollSrcs = video.scenes.flatMap((s) => (s.visual.kind === "broll" && s.visual.src ? [s.visual.src] : []));
  const brollAvailable: string[] = [];
  for (const src of brollSrcs) {
    const head = await fetch(staticFile(src), { method: "HEAD", signal: abortSignal }).catch(() => null);
    if (head?.ok) brollAvailable.push(src);
  }

  const music = video.music !== undefined ? video.music : brand.music;
  return {
    resolved: { video, brand, logoSrc: getBrandAsset(brand.id, brand.logo), timeline, music, brollAvailable },
    staleScenes,
    orderChanged,
  };
};
