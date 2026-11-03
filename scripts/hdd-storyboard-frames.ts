// Renders one storyboard frame per shot of the DTI HDD explainer (with captions, draft flags on).
//   node scripts/hdd-storyboard-frames.ts            -> hdd/dti-hdd-explainer/storyboard/S01.jpg ...
// Frame times: each shot's `board` time in src/hdd/timeline.ts, or its middle.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";

const src = readFileSync("src/hdd/timeline.ts", "utf8");
const shots = [...src.matchAll(/id: "(S\d+)",\s*start: ([\d.]+),\s*end: ([\d.]+),[\s\S]*?(?=\n  \{\n    id:|\n\];)/g)].map((m) => {
  const board = /board: ([\d.]+)/.exec(m[0]);
  const start = Number(m[2]);
  const end = Number(m[3]);
  return { id: m[1], time: board ? Number(board[1]) : (start + end) / 2 };
});
const only = process.argv.slice(2);
const outDir = "hdd/dti-hdd-explainer/storyboard";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const browser = await openBrowser("chrome", { browserExecutable, logLevel: "error", chromiumOptions: { gl: "swangle" } });
const inputProps = { captions: true, draft: true };
const composition = await selectComposition({ serveUrl, id: "dti-hdd-explainer-captions", inputProps, puppeteerInstance: browser, browserExecutable, logLevel: "error" });
for (const s of shots.filter((s) => !only.length || only.includes(s.id))) {
  const png = path.join(outDir, `${s.id}.png`);
  await renderStill({ serveUrl, composition, frame: Math.round(s.time * 30), inputProps, output: png, puppeteerInstance: browser, browserExecutable, logLevel: "error", timeoutInMilliseconds: 180000 });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-q:v", "3", png.replace(".png", ".jpg")]);
  rmSync(png);
  console.log(`${s.id} @ ${s.time}s`);
}
await browser.close({ silent: true });
