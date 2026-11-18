// Creates SILENT placeholder narration with fake word timestamps, in the same
// manifest format as scripts/narrate.ts. Lets you build and test caption sync
// without an ElevenLabs key or credits.
//
// Usage: node scripts/placeholder-narration.ts <video-id>
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { NarrationManifest, VideoConfig, Word } from "../src/lib/types.ts";

const LEAD_IN_MS = 120;
const MS_PER_WORD = 90;
const MS_PER_CHAR = 55;
const COMMA_PAUSE_MS = 180;
const SENTENCE_PAUSE_MS = 380;

// Digits are spoken as longer words ("95" -> "ninety five"), so weight them more.
const spokenLength = (word: string) =>
  word.replace(/[^\p{L}\p{N}]/gu, "").replace(/\p{N}/gu, "xxx").length;

export const fakeWordTimings = (text: string): { words: Word[]; durationMs: number } => {
  const tokens = text.split(/\s+/).filter(Boolean);
  let t = LEAD_IN_MS;
  const words = tokens.map((token) => {
    const startMs = t;
    const endMs = startMs + MS_PER_WORD + spokenLength(token) * MS_PER_CHAR;
    t = endMs + (/[.!?]$/.test(token) ? SENTENCE_PAUSE_MS : /[,;:]$/.test(token) ? COMMA_PAUSE_MS : 0);
    return { text: token, startMs, endMs };
  });
  return { words, durationMs: words[words.length - 1].endMs + 150 };
};

const main = () => {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error("Usage: node scripts/placeholder-narration.ts <video-id>");
    process.exit(1);
  }
  const config: VideoConfig = JSON.parse(readFileSync(path.join("videos", videoId, "config.json"), "utf8"));
  const outDir = path.join("public", "audio", videoId);
  mkdirSync(outDir, { recursive: true });

  const scenes = config.scenes.map((scene) => {
    const { words, durationMs } = fakeWordTimings(scene.text);
    const file = `${scene.id}.mp3`;
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
      "-t", (durationMs / 1000).toFixed(3),
      "-c:a", "libmp3lame", "-b:a", "64k",
      path.join(outDir, file),
    ]);
    const hash = createHash("sha256").update(`placeholder|${scene.text}`).digest("hex").slice(0, 16);
    console.log(`  ${scene.id}: ${(durationMs / 1000).toFixed(2)} s, ${words.length} words`);
    return { id: scene.id, text: scene.text, audio: `audio/${videoId}/${file}`, durationMs, hash, words };
  });

  const manifest: NarrationManifest = {
    video: videoId,
    source: "placeholder",
    generatedAt: new Date().toISOString(),
    scenes,
  };
  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const total = scenes.reduce((s, x) => s + x.durationMs, 0) / 1000;
  console.log(`Placeholder narration written to ${outDir}/ (${total.toFixed(1)} s of speech, silent)`);
};

if (import.meta.main) main();
