// DTI HDD explainer: makes the "for over 30 years." pickup in the original narrator's voice
// (ElevenLabs Instant Voice Clone, then text to speech), cut to match the original sentence.
//
//   node scripts/hdd-pickup.ts --consent-confirmed          shows the credit estimate, asks before spending
//
// Requirements (CLAUDE.md cost rules):
//   - written consent from the original narrator to clone their voice for this line (--consent-confirmed
//     records that you have it; ElevenLabs also asks you to confirm this right when cloning)
//   - ELEVENLABS_API_KEY in .env or the environment (never pasted in chat)
//   - your approval of the estimate at the prompt (--yes skips it ONLY with that approval)
// Output: public/hdd/dti-hdd-explainer/pickup-take<N>.wav (only "for over 30 years."), log in
// hdd/dti-hdd-explainer/pickup/. Then render with --props='{"pickupFile":"hdd/dti-hdd-explainer/pickup-take1.wav"}'.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";

if (existsSync(".env")) process.loadEnvFile(".env");
const args = process.argv.slice(2);
if (!args.includes("--consent-confirmed")) {
  console.error("Refusing to run: pass --consent-confirmed only if you have the original narrator's written consent to clone their voice for this line.");
  process.exit(1);
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set (add it to .env or as an environment secret; never paste it in chat).");
  process.exit(1);
}
const BASE = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io";
const TAKES = 3;
const SENTENCE = "Directional Technologies has installed miles and miles of conduit using directional drilling for over 30 years.";
const PHRASE_START = "for over 30 years";
const dir = "hdd/dti-hdd-explainer/pickup";
mkdirSync(dir, { recursive: true });
const cfg = JSON.parse(readFileSync("hdd/dti-hdd-explainer/narration.json", "utf8"));
const src = path.join("public", cfg.audio);

// estimate: text-to-speech is billed per character (Multilingual v2: 1 credit per character)
const chars = SENTENCE.length * TAKES;
console.log(`Voice clone: Instant Voice Clone from about 60 s of the original narration (requires a plan with voice cloning).`);
console.log(`Text to speech: ${TAKES} takes × ${SENTENCE.length} characters = ${chars} characters ≈ ${chars} credits (eleven_multilingual_v2, 1 credit per character).`);
if (!args.includes("--yes")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question("Spend these credits? [y/N] ")).trim().toLowerCase();
  rl.close();
  if (ans !== "y") {
    console.log("Cancelled. Nothing was generated.");
    process.exit(0);
  }
}

// 1. clean voice sample: the narration sentences (voice only; silences between them removed)
const sample = path.join(dir, "sample.wav");
const parts = cfg.narration.filter((n: { id: string }) => n.id !== "n21").slice(0, 14) as { start: number; end: number }[];
const filter = parts.map((p, i) => `[0:a]atrim=${p.start}:${p.end},asetpts=PTS-STARTPTS[a${i}]`).join(";") + `;${parts.map((_, i) => `[a${i}]`).join("")}concat=n=${parts.length}:v=0:a=1[out]`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-filter_complex", filter, "-map", "[out]", "-ac", "1", "-ar", "44100", sample]);

// 2. instant voice clone (POST /v1/voices/add, multipart: name, files, remove_background_noise)
const form = new FormData();
form.append("name", "DTI HDD narrator (consented pickup)");
form.append("description", "Original DTI explainer narrator; cloned with written consent for one pickup line.");
form.append("remove_background_noise", "false");
form.append("files", new Blob([readFileSync(sample)], { type: "audio/wav" }), "sample.wav");
const vr = await fetch(`${BASE}/v1/voices/add`, { method: "POST", headers: { "xi-api-key": key }, body: form });
if (!vr.ok) throw new Error(`Voice clone failed: ${vr.status} ${await vr.text()}`);
const { voice_id } = (await vr.json()) as { voice_id: string };
writeFileSync(path.join(dir, "voice.json"), JSON.stringify({ voice_id, createdAt: new Date().toISOString() }, null, 2));
console.log(`Voice created: ${voice_id}`);

// loudness of the original sentence, to match the pickup to it
const orig = cfg.narration.find((n: { id: string }) => n.id === "n21");
const stderr = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(orig.start), "-to", String(orig.originalEnding.start), "-i", src, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const lufs = Number(/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(stderr)?.[1] ?? "-18");

// 3. takes with timestamps; cut from "for" to the end
for (let take = 1; take <= TAKES; take++) {
  const r = await fetch(`${BASE}/v1/text-to-speech/${encodeURIComponent(voice_id)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text: SENTENCE, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55 + take * 0.05, similarity_boost: 0.85, style: 0.1, use_speaker_boost: true } }),
  });
  if (!r.ok) throw new Error(`Take ${take} failed: ${r.status} ${await r.text()}`);
  const data = (await r.json()) as { audio_base64: string; alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } };
  const mp3 = path.join(dir, `take${take}.mp3`);
  writeFileSync(mp3, Buffer.from(data.audio_base64, "base64"));
  writeFileSync(path.join(dir, `take${take}.json`), JSON.stringify(data.alignment));
  const text = data.alignment.characters.join("");
  const i = text.indexOf(PHRASE_START);
  const t0 = Math.max(0, data.alignment.character_start_times_seconds[i] - 0.03);
  const t1 = data.alignment.character_end_times_seconds[data.alignment.characters.length - 1] + 0.15;
  const out = path.join("public", "hdd", "dti-hdd-explainer", `pickup-take${take}.wav`);
  // match the original: mono, band-limited like the source, same loudness, short fades
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t0), "-to", String(t1), "-i", mp3, "-af", `highpass=f=80,lowpass=f=15000,loudnorm=I=${lufs}:TP=-1.5:LRA=7,afade=t=in:d=0.02,areverse,afade=t=in:d=0.08,areverse`, "-ac", "1", "-ar", "44100", out]);
  console.log(`Take ${take}: ${out} (${(t1 - t0).toFixed(2)} s)`);
}
console.log('Listen to the takes, then render with --props=\'{"pickupFile":"hdd/dti-hdd-explainer/pickup-take1.wav"}\' (or the best take).');
