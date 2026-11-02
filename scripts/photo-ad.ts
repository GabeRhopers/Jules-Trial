// Photo ads (photo-ads/<id>/config.json): quality check and render.
//   node scripts/photo-ad.ts qc <id>       text and logos inside the Reels safe zone, clear of the action rail, no overflow
//   node scripts/photo-ad.ts render <id>   out/<brand>/<id>.mp4 (same encoding settings as the narrated videos)
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PhotoAdConfig } from "../src/lib/types.ts";

const [command, id] = process.argv.slice(2);
if (!["qc", "render"].includes(command) || !id) {
  console.error("Usage: node scripts/photo-ad.ts qc|render <photo-ad-id>");
  process.exit(1);
}
const ad: PhotoAdConfig = JSON.parse(readFileSync(path.join("photo-ads", id, "config.json"), "utf8"));
if (ad.imageNote?.startsWith("STAND-IN")) console.log(`Note: ${ad.imageNote}`);

if (command === "render") {
  const out = path.join("out", ad.brand, `${id}.mp4`);
  const started = Date.now();
  execFileSync(
    "npx",
    ["remotion", "render", id, out, "--codec=h264", "--crf=16", "--pixel-format=yuv420p", "--color-space=bt709", "--image-format=png", "--audio-codec=aac", "--log=error"],
    { stdio: "inherit" },
  );
  console.log(`Rendered ${out} (${(statSync(out).size / 1048576).toFixed(1)} MB) in ${((Date.now() - started) / 1000).toFixed(1)} s`);
} else {
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
  const browser = await openBrowser("chrome", { browserExecutable, logLevel: "error" });
  const inputProps = { adId: id, qc: true };
  const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser, browserExecutable, logLevel: "error" });
  const tmp = mkdtempSync(path.join(os.tmpdir(), "qc-"));
  const problems = new Set<string>();
  let checked = 0;
  for (let frame = 0; frame < composition.durationInFrames; frame += 5) {
    await renderStill({
      serveUrl, composition, frame, inputProps, output: path.join(tmp, "f.png"), puppeteerInstance: browser, browserExecutable, logLevel: "error",
      onBrowserLog: (log) => {
        if (!log.text.startsWith("QC ")) return;
        checked++;
        for (const issue of JSON.parse(log.text.slice(3)).issues as string[]) problems.add(`frame ${frame}: ${issue}`);
      },
    });
  }
  await browser.close({ silent: true });
  rmSync(tmp, { recursive: true, force: true });
  console.log(`Frames checked: ${checked} of ${composition.durationInFrames}`);
  if (problems.size === 0) console.log("PASS: no issues found");
  else {
    console.log(`FAIL: ${problems.size} issue(s)`);
    for (const p of [...problems].slice(0, 40)) console.log(`  - ${p}`);
    process.exit(1);
  }
}
