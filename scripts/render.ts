// Renders the final video and its captions:
//   out/<brand>/<video-id>.mp4  (H.264, CRF 16, yuv420p, BT.709 color, AAC audio)
//   out/<brand>/<video-id>.srt
//
// Usage: node scripts/render.ts <video-id> [--brand=<brand-id>]
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { makeSrt } from "./make-srt.ts";
import type { VideoConfig } from "../src/lib/types.ts";

/** H.264 CRF: lower is better quality. Remotion's default is 18; 16 keeps text edges crisp after platform re-compression. */
const CRF = 16;

const videoId = process.argv[2];
if (!videoId) {
  console.error("Usage: node scripts/render.ts <video-id> [--brand=<brand-id>]");
  process.exit(1);
}
const video: VideoConfig = JSON.parse(readFileSync(path.join("videos", videoId, "config.json"), "utf8"));
const brandId = process.argv.find((a) => a.startsWith("--brand="))?.split("=")[1] ?? video.brand;
const base = path.join("out", brandId, videoId);

const started = Date.now();
execFileSync(
  "npx",
  [
    "remotion", "render", videoId, `${base}.mp4`,
    "--codec=h264", `--crf=${CRF}`, "--pixel-format=yuv420p", "--color-space=bt709", "--image-format=png", "--audio-codec=aac",
    `--props=${JSON.stringify({ videoId, brandId })}`,
    "--log=error",
  ],
  { stdio: "inherit" },
);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
const lines = makeSrt(videoId, `${base}.srt`);
const mb = (statSync(`${base}.mp4`).size / 1024 / 1024).toFixed(1);
console.log(`Rendered ${base}.mp4 (${mb} MB) in ${seconds} s, plus ${base}.srt (${lines} lines)`);
