// Generates narration for a video: one MP3 per scene plus word timestamps, written to
// public/audio/<video-id>/ with a manifest.json the compositions read.
//
// Usage: node scripts/narrate.ts <video-id> [--provider=kokoro|elevenlabs] [--brand=<id>] [--yes] [--force]
//
//   --provider  override the brand's voice.provider for this run
//   --yes       skip the cost confirmation (ElevenLabs only)
//   --force     regenerate every scene, even unchanged ones
//
// Scenes whose spoken text and voice settings are unchanged are reused from the last run
// (no API call, no credits). Pronunciations from brand.json are applied to what the voice
// says; captions keep the original wording.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import type { Brand, NarrationManifest, SceneNarration, VideoConfig, VoiceProvider } from "../src/lib/types.ts";
import { applyPronunciations, wordsFromCharTimings } from "./lib/align.ts";
import { elevenLabsCreditsPerChar, synthesizeElevenLabs, synthesizeKokoro } from "./lib/providers.ts";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const flag = (name: string) => process.argv.includes(`--${name}`);

const main = async () => {
  const videoId = process.argv[2];
  if (!videoId || videoId.startsWith("--")) {
    console.error("Usage: node scripts/narrate.ts <video-id> [--provider=kokoro|elevenlabs] [--brand=<id>] [--yes] [--force]");
    process.exit(1);
  }
  if (existsSync(".env")) process.loadEnvFile(".env");

  const video: VideoConfig = JSON.parse(readFileSync(path.join("videos", videoId, "config.json"), "utf8"));
  const brandId = arg("brand") ?? video.brand;
  const brand: Brand = JSON.parse(readFileSync(path.join("brands", brandId, "brand.json"), "utf8"));
  const provider = (arg("provider") ?? brand.voice.provider) as VoiceProvider;
  if (provider !== "kokoro" && provider !== "elevenlabs") throw new Error(`Unknown provider "${provider}"`);
  const voiceSettings = brand.voice[provider];
  if (!voiceSettings) throw new Error(`Brand ${brand.id} has no voice.${provider} settings in brand.json`);

  const todo = video.scenes.filter((s) => /\bTODO\b/.test(s.text));
  if (todo.length > 0) throw new Error(`Scenes still contain TODO text: ${todo.map((s) => s.id).join(", ")}. Finish the script before narrating.`);

  const outDir = path.join("public", "audio", videoId);
  mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, "manifest.json");
  const previous: NarrationManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;

  // Plan: which scenes need generating?
  const plan = video.scenes.map((scene) => {
    const spoken = applyPronunciations(scene.text, brand.pronunciations);
    const hash = createHash("sha256").update(JSON.stringify({ provider, voiceSettings, spoken: spoken.text })).digest("hex").slice(0, 16);
    const cached = previous?.scenes.find((s) => s.id === scene.id && s.hash === hash && s.text === scene.text);
    const reuse = !flag("force") && cached && existsSync(path.join("public", cached.audio));
    return { scene, spoken, hash, cached: reuse ? cached : null };
  });
  const pending = plan.filter((p) => !p.cached);

  console.log(`Narration for "${videoId}" with ${provider} (brand ${brand.id})`);
  for (const p of plan) {
    const changed = p.spoken.text !== p.scene.text ? `  [says: "${p.spoken.text}"]` : "";
    console.log(`  ${p.cached ? "cached  " : "generate"} ${p.scene.id.padEnd(12)} ${p.spoken.text.length} chars${changed}`);
  }
  if (pending.length === 0) {
    console.log("Nothing changed. All scenes reused from the last run (0 credits).");
    return;
  }

  const chars = pending.reduce((sum, p) => sum + p.spoken.text.length, 0);
  if (provider === "elevenlabs") {
    const modelId = brand.voice.elevenlabs!.modelId;
    const credits = Math.ceil(chars * elevenLabsCreditsPerChar(modelId));
    console.log(`\nEstimated cost: ${chars} characters ≈ ${credits} ElevenLabs credits (model ${modelId}).`);
    console.log("(Upper bound: 1 credit per character. Flash/Turbo models can cost less; your ElevenLabs usage page shows the real figure.)");
    if (!flag("yes")) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = (await rl.question(`Generate ${pending.length} scene(s) now? [y/N] `)).trim().toLowerCase();
      rl.close();
      if (answer !== "y" && answer !== "yes") {
        console.log("Cancelled. Nothing was generated.");
        return;
      }
    }
  } else {
    console.log(`\n${chars} characters with Kokoro: free, runs on this computer.`);
  }

  const scenes: SceneNarration[] = [];
  for (const p of plan) {
    if (p.cached) {
      scenes.push(p.cached);
      continue;
    }
    const file = `${p.scene.id}.mp3`;
    const out = path.join(outDir, file);
    process.stdout.write(`  ${p.scene.id}... `);
    const synth = provider === "elevenlabs" ? await synthesizeElevenLabs(brand, p.spoken.text, out) : await synthesizeKokoro(brand, p.spoken.text, out);
    const words = wordsFromCharTimings(p.scene.text, p.spoken, synth.timings, synth.durationMs);
    console.log(`${(synth.durationMs / 1000).toFixed(2)} s, ${words.length} words`);
    scenes.push({ id: p.scene.id, text: p.scene.text, audio: `audio/${videoId}/${file}`, durationMs: synth.durationMs, hash: p.hash, words });
  }

  const manifest: NarrationManifest = { video: videoId, source: provider, generatedAt: new Date().toISOString(), scenes };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const total = scenes.reduce((s, x) => s + x.durationMs, 0) / 1000;
  console.log(`Done: ${total.toFixed(1)} s of narration in ${outDir}/`);
};

main().catch((err) => {
  console.error(`\nError: ${(err as Error).message}`);
  process.exit(1);
});
