// Voice providers for scripts/narrate.ts. Each one turns spoken text into an MP3 file plus
// per-character timings of the spoken text.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Brand } from "../../src/lib/types.ts";
import { charTimingsFromTokens, type CharTiming } from "./align.ts";

export type Synthesis = { durationMs: number; timings: CharTiming[] };

/** Measures an audio file's real duration (more reliable than the last timestamp). */
export const audioDurationMs = (file: string): number => {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  return Math.round(parseFloat(out) * 1000);
};

// ---------------------------------------------------------------------------------------------
// ElevenLabs
// NOT VERIFIED AGAINST CURRENT DOCS: endpoint path, query parameter, request fields, response
// fields and model ids below come from ElevenLabs' API reference as found on 2026-10-29 via a
// localized copy of elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps.
// Verify in a session where elevenlabs.io is reachable.
// ---------------------------------------------------------------------------------------------
const ELEVENLABS_BASE = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io"; // override only for tests
const ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128"; // NOT VERIFIED AGAINST CURRENT DOCS

type ElevenLabsResponse = {
  audio_base64: string;
  alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } | null;
};

/** Credits per character by model family. NOT VERIFIED AGAINST CURRENT DOCS (third-party pricing summaries, 2026). */
export const elevenLabsCreditsPerChar = (modelId: string) => (/flash|turbo/.test(modelId) ? 0.5 : 1);

export const synthesizeElevenLabs = async (brand: Brand, text: string, outMp3: string): Promise<Synthesis> => {
  const cfg = brand.voice.elevenlabs;
  if (!cfg) throw new Error(`Brand ${brand.id} has no voice.elevenlabs settings`);
  if (cfg.voiceId.startsWith("REPLACE")) throw new Error(`Brand ${brand.id}: set voice.elevenlabs.voiceId in brand.json first`);
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is empty. Paste your key into the .env file in the project folder (see .env.example).");

  const url = `${ELEVENLABS_BASE}/v1/text-to-speech/${encodeURIComponent(cfg.voiceId)}/with-timestamps?output_format=${ELEVENLABS_OUTPUT_FORMAT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: cfg.modelId, voice_settings: cfg.settings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as ElevenLabsResponse;
  writeFileSync(outMp3, Buffer.from(data.audio_base64, "base64"));
  const durationMs = audioDurationMs(outMp3);

  const a = data.alignment;
  let timings: CharTiming[];
  if (a && a.characters.length === text.length) {
    timings = a.characters.map((_, k) => ({
      startMs: a.character_start_times_seconds[k] * 1000,
      endMs: a.character_end_times_seconds[k] * 1000,
    }));
  } else {
    // Alignment missing or not one entry per input character: spread evenly and warn
    console.warn(`  warning: ElevenLabs alignment did not match the text (${a?.characters.length ?? 0} vs ${text.length} chars); using even spacing`);
    timings = [...text].map((_, k) => ({ startMs: (k / text.length) * durationMs, endMs: ((k + 1) / text.length) * durationMs }));
  }
  return { durationMs, timings };
};

// ---------------------------------------------------------------------------------------------
// Kokoro (free, runs locally through scripts/kokoro_tts.py)
// ---------------------------------------------------------------------------------------------
export const kokoroPython = () =>
  process.env.KOKORO_PYTHON ?? (process.platform === "win32" ? path.join(".venv", "Scripts", "python.exe") : path.join(".venv", "bin", "python"));

export const synthesizeKokoro = async (brand: Brand, text: string, outMp3: string): Promise<Synthesis> => {
  const cfg = brand.voice.kokoro;
  if (!cfg) throw new Error(`Brand ${brand.id} has no voice.kokoro settings`);
  const python = kokoroPython();
  if (!existsSync(python)) {
    throw new Error(`Kokoro is not set up (${python} not found). See "Kokoro setup" in SETUP_LOG.md or the README.`);
  }
  const wav = outMp3.replace(/\.mp3$/, ".wav");
  const run = spawnSync(python, ["scripts/kokoro_tts.py"], {
    input: JSON.stringify({ text, voice: cfg.voice, lang: cfg.lang, speed: cfg.speed, out_wav: wav }),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (run.status !== 0) throw new Error(`Kokoro failed:\n${run.stderr.slice(-1500)}`);
  const result = JSON.parse(run.stdout.trim().split("\n").pop()!) as {
    durationMs: number;
    tokens: { charStart: number; charEnd: number; startMs: number; endMs: number }[];
  };
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "160k", outMp3]);
  rmSync(wav, { force: true });
  return { durationMs: audioDurationMs(outMp3), timings: charTimingsFromTokens(text.length, result.tokens) };
};
