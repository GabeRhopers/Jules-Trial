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
  const res = await fetch(staticFile(`audio/${video.id}/manifest.json`), { signal: abortSignal });
  if (!res.ok) {
    throw new Error(
      `No narration for "${video.id}". Run: node scripts/narrate.ts ${video.id}  (or scripts/placeholder-narration.ts for a silent test track)`,
    );
  }
  const manifest = (await res.json()) as NarrationManifest;

  const stale = video.scenes.filter((scene, i) => manifest.scenes[i]?.id !== scene.id || manifest.scenes[i]?.text !== scene.text);
  if (stale.length > 0 || manifest.scenes.length !== video.scenes.length) {
    throw new Error(
      `Narration is out of date for scenes: ${stale.map((s) => s.id).join(", ") || "(scene count changed)"}. Re-run the narration script for "${video.id}".`,
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
  return { video, brand, logoSrc: getBrandAsset(brand.id, brand.logo), timeline, music, brollAvailable };
};
