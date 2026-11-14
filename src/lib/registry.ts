// Auto-discovers every brands/<id>/brand.json and videos/<id>/config.json at bundle time.
// Adding a brand or a video needs no code changes: just add the folder.
import type { Brand, VideoConfig } from "./types";

type Context = { keys(): string[]; (id: string): unknown };
declare global {
  interface ImportMeta {
    webpackContext(dir: string, options: { recursive: boolean; regExp: RegExp }): Context;
  }
}

const brandFiles = import.meta.webpackContext("../../brands", { recursive: true, regExp: /brand\.json$/ });
const brandAssets = import.meta.webpackContext("../../brands", { recursive: true, regExp: /\.(svg|png|jpe?g|webp|woff2?|ttf|otf)$/ });
const videoFiles = import.meta.webpackContext("../../videos", { recursive: true, regExp: /config\.json$/ });

const unwrap = <T,>(mod: unknown): T => ((mod as { default?: T }).default ?? mod) as T;

export const brands: Record<string, Brand> = Object.fromEntries(
  brandFiles.keys().map((key) => {
    const brand = unwrap<Brand>(brandFiles(key));
    return [brand.id, brand];
  }),
);

export const videos: VideoConfig[] = videoFiles.keys().map((key) => unwrap<VideoConfig>(videoFiles(key)));

export const getBrand = (id: string): Brand => {
  const brand = brands[id];
  if (!brand) throw new Error(`Brand "${id}" not found. Available: ${Object.keys(brands).join(", ")}`);
  return brand;
};

export const getVideo = (id: string): VideoConfig => {
  const video = videos.find((v) => v.id === id);
  if (!video) throw new Error(`Video "${id}" not found in videos/. Available: ${videos.map((v) => v.id).join(", ")}`);
  return video;
};

/** URL of a brand asset (logo, font file), resolved by the bundler. */
export const getBrandAsset = (brandId: string, file: string): string => {
  const key = brandAssets.keys().find((k) => k.endsWith(`${brandId}/${file}`));
  if (!key) throw new Error(`Asset "${file}" not found in brands/${brandId}/`);
  return unwrap<string>(brandAssets(key));
};
