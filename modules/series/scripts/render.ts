// Renders one series episode to out/series/<episode-id>.mp4 (+ .srt), with the same encoding
// settings as scripts/render.ts (H.264, CRF 16, yuv420p, BT.709, AAC, 30 fps).
// Usage: node modules/series/scripts/render.ts <episode-id>
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const id = process.argv[2];
if (!id) {
  console.error("Usage: node modules/series/scripts/render.ts <episode-id>");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(path.join("public", "audio", "series", id, "manifest.json"), "utf8"));
mkdirSync(path.join("out", "series"), { recursive: true });
const base = path.join("out", "series", id);
const tmp = `${base}.tmp.mp4`;
const started = Date.now();
execFileSync(
  "npx",
  ["remotion", "render", id, tmp, "--codec=h264", "--crf=16", "--pixel-format=yuv420p", "--color-space=bt709", "--image-format=png", "--audio-codec=aac", "--log=error"],
  { stdio: "inherit" },
);
renameSync(tmp, `${base}.mp4`); // only after the render succeeded

const ts = (ms: number) => {
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(Math.round(ms % 1000)).padStart(3, "0")}`;
};
const names: Record<string, string> = { frank: "FRANK", nefi: "NEFI", tech: "DEE", narrator: "NARRATOR" };
const srt = manifest.lines
  .map((l: { who: string; text: string; startMs: number; endMs: number }, i: number) => `${i + 1}\n${ts(l.startMs)} --> ${ts(l.endMs)}\n${names[l.who] ?? l.who}: ${l.text}\n`)
  .join("\n");
writeFileSync(`${base}.srt`, srt);
const mb = (statSync(`${base}.mp4`).size / 1024 / 1024).toFixed(1);
console.log(`Rendered ${base}.mp4 (${mb} MB) in ${((Date.now() - started) / 1000).toFixed(0)} s, plus ${base}.srt`);
