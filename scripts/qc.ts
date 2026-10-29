// Automated quality check for a video. Renders sample frames in QC mode and checks:
//  - every text element stays inside the platform safe zone (and off the Reels action rail)
//  - no text overflows its box or the frame
//  - the highlighted caption word matches the narration timestamps at that moment
//  - caption size is readable on a phone, and caption colors have enough contrast
//
// Usage: node scripts/qc.ts <video-id> [--every=<frames>]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildTimeline } from "../src/lib/timeline.ts";
import type { Brand, NarrationManifest, VideoConfig } from "../src/lib/types.ts";

/** Smallest caption size that stays readable when a 1080 px wide video is shown on a ~390 pt phone screen. */
const MIN_CAPTION_PX = 64;
/** WCAG AA contrast for large text */
const MIN_CONTRAST = 3;

type QcLine = { frame: number; issues: string[]; page: string | null; active: string | null; captionFontPx: number | null };

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const clean = (w: string) => w.replace(/[.,;:!?]+$/, "");

const main = async () => {
  const videoId = process.argv[2];
  const every = Number(process.argv.find((a) => a.startsWith("--every="))?.split("=")[1] ?? 6);
  if (!videoId) {
    console.error("Usage: node scripts/qc.ts <video-id> [--every=<frames>]");
    process.exit(1);
  }
  const video: VideoConfig = JSON.parse(readFileSync(path.join("videos", videoId, "config.json"), "utf8"));
  const brand: Brand = JSON.parse(readFileSync(path.join("brands", video.brand, "brand.json"), "utf8"));
  const manifest: NarrationManifest = JSON.parse(readFileSync(path.join("public", "audio", videoId, "manifest.json"), "utf8"));

  console.log(`QC for "${videoId}" (brand ${brand.id}), checking every ${every} frames...`);
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
  const logLevel = "error" as const;
  const browser = await openBrowser("chrome", { browserExecutable, logLevel });
  const inputProps = { videoId, qc: true };
  const composition = await selectComposition({ serveUrl, id: videoId, inputProps, puppeteerInstance: browser, browserExecutable, logLevel });
  const timeline = buildTimeline(manifest, composition.fps);
  const words = timeline.scenes.flatMap((s) => s.words);

  const tmp = mkdtempSync(path.join(os.tmpdir(), "qc-"));
  const lines: QcLine[] = [];
  for (let frame = 0; frame < composition.durationInFrames; frame += every) {
    await renderStill({
      serveUrl,
      composition,
      frame,
      inputProps,
      output: path.join(tmp, "frame.png"),
      puppeteerInstance: browser,
      browserExecutable,
      logLevel,
      onBrowserLog: (log) => {
        if (log.text.startsWith("QC ")) lines.push(JSON.parse(log.text.slice(3)));
      },
    });
  }
  await browser.close({ silent: true });
  rmSync(tmp, { recursive: true, force: true });

  const problems: string[] = [];
  let syncChecked = 0;
  for (const line of lines) {
    for (const issue of line.issues) problems.push(`frame ${line.frame}: ${issue}`);
    // Expected word: the last word that has started by this frame, if it is still being spoken
    const t = (line.frame / composition.fps) * 1000;
    const idx = words.findLastIndex((w) => w.startMs <= t);
    const speaking = idx >= 0 && t < (words[idx + 1]?.startMs ?? words[idx].endMs + 600);
    if (speaking && line.active !== null) {
      syncChecked++;
      if (clean(line.active) !== clean(words[idx].text)) {
        problems.push(`frame ${line.frame}: caption shows "${line.active}" but narration says "${words[idx].text}"`);
      }
    }
    if (line.captionFontPx !== null && line.captionFontPx < MIN_CAPTION_PX) {
      problems.push(`frame ${line.frame}: caption font ${line.captionFontPx}px is below ${MIN_CAPTION_PX}px`);
    }
  }
  const cs = brand.captionStyle;
  const pairs: [string, string, string][] = [
    ["caption text on background", cs.baseColor, brand.colors.background],
    ["highlighted caption word", cs.activeColor, cs.activeBackground],
    ["headline text on background", brand.colors.text, brand.colors.background],
    ["CTA button text", brand.colors.textOnPrimary, brand.colors.primary],
  ];
  const contrasts = pairs.map(([name, fg, bg]) => {
    const ratio = contrast(fg, bg);
    if (ratio < MIN_CONTRAST) problems.push(`contrast too low for ${name}: ${ratio.toFixed(2)}:1 (need ${MIN_CONTRAST}:1)`);
    return `${name} ${ratio.toFixed(1)}:1`;
  });

  console.log(`Frames checked: ${lines.length} of ${composition.durationInFrames} (${(composition.durationInFrames / composition.fps).toFixed(1)} s)`);
  console.log(`Caption sync checks: ${syncChecked}`);
  console.log(`Contrast: ${contrasts.join(", ")}`);
  if (problems.length === 0) {
    console.log("PASS: no issues found");
  } else {
    console.log(`FAIL: ${problems.length} issue(s)`);
    for (const p of [...new Set(problems)].slice(0, 60)) console.log(`  - ${p}`);
    process.exit(1);
  }
};

main();
