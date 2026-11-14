// Writes an .srt captions file from the narration timestamps (for YouTube, LinkedIn,
// Facebook uploads, or accessibility). Lines follow sentence breaks, up to 7 words each.
//
// Usage: node scripts/make-srt.ts <video-id> <output.srt>
import { serializeSrt, type Caption } from "@remotion/captions";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildTimeline, paginateWords } from "../src/lib/timeline.ts";
import type { NarrationManifest } from "../src/lib/types.ts";

/** Must match the fps the composition renders at */
const FPS = 30;
const WORDS_PER_LINE = 7;

export const makeSrt = (videoId: string, output: string) => {
  const manifest: NarrationManifest = JSON.parse(readFileSync(path.join("public", "audio", videoId, "manifest.json"), "utf8"));
  const words = buildTimeline(manifest, FPS).scenes.flatMap((s) => s.words);
  const lines: Caption[][] = paginateWords(words, WORDS_PER_LINE).map((page) =>
    page.words.map((w, i) => ({
      text: i === 0 ? w.text : ` ${w.text}`,
      startMs: w.startMs,
      // Hold the last word a little, but never past the start of the next line
      endMs: i === page.words.length - 1 ? Math.min(page.endMs, w.endMs + 400) : w.endMs,
      timestampMs: (w.startMs + w.endMs) / 2,
      confidence: null,
    })),
  );
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, serializeSrt({ lines }));
  return lines.length;
};

if (import.meta.main) {
  const [videoId, output] = process.argv.slice(2);
  if (!videoId || !output) {
    console.error("Usage: node scripts/make-srt.ts <video-id> <output.srt>");
    process.exit(1);
  }
  console.log(`Wrote ${makeSrt(videoId, output)} caption lines to ${output}`);
}
