// Starts a new client brand by copying an existing one.
//
// Usage: node scripts/new-brand.ts <new-brand-id> --name="Client Name" [--from=demo-b2b-industrial]
//
// Then edit brands/<new-brand-id>/brand.json (colors, fonts, tone, CTA), replace logo.svg,
// and run: node scripts/validate-brand.ts <new-brand-id>
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Brand } from "../src/lib/types.ts";

const [id] = process.argv.slice(2);
const name = process.argv.find((a) => a.startsWith("--name="))?.split("=")[1];
const from = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1] ?? "demo-b2b-industrial";

if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Usage: node scripts/new-brand.ts <new-brand-id> --name="Client Name" [--from=<existing-brand>]');
  console.error("The id must be lowercase letters, numbers and dashes, e.g. acme-aluminum");
  process.exit(1);
}
const target = path.join("brands", id);
if (existsSync(target)) {
  console.error(`${target} already exists`);
  process.exit(1);
}
cpSync(path.join("brands", from), target, { recursive: true });
const file = path.join(target, "brand.json");
const brand: Brand = JSON.parse(readFileSync(file, "utf8"));
brand.id = id;
brand.displayName = name ?? id;
brand.description = `TODO: one line about ${brand.displayName}, who they sell to, and the tone.`;
if (brand.voice.elevenlabs) brand.voice.elevenlabs.voiceId = "REPLACE_WITH_ELEVENLABS_VOICE_ID";
writeFileSync(file, JSON.stringify(brand, null, 2) + "\n");

console.log(`Created ${target}/ from ${from}. Next:
  1. Edit ${file}: colors, fonts, toneOfVoice, pronunciations, style, captionStyle, cta
  2. Replace ${target}/logo.svg with the client's logo (vector, text converted to outlines)
  3. Fonts: use a Google Font listed in src/lib/font-map.ts, or put licensed WOFF2 files in ${target}/fonts/
  4. Check it: node scripts/validate-brand.ts ${id}`);
