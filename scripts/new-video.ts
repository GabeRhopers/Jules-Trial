// Creates videos/<video-id>/ with a config.json and script.md skeleton for the chosen format.
// The /new-video skill fills in the real script; you can also edit the files by hand.
//
// Usage: node scripts/new-video.ts <video-id> --brand=<brand-id> --format=SocialReel9x16|Explainer16x9|PromoSquare1x1 [--title="..."]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SceneConfig, VideoConfig, VideoFormat } from "../src/lib/types.ts";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const id = process.argv[2];
const brand = arg("brand");
const format = arg("format") as VideoFormat | undefined;
const title = arg("title") ?? "TODO: video title";

const TEMPLATES: Record<VideoFormat, SceneConfig[]> = {
  SocialReel9x16: [
    { id: "hook", text: "TODO: hook, under 3 seconds when spoken", visual: { kind: "hook", kicker: "TODO kicker", headline: "TODO headline" } },
    ...[1, 2, 3].map((n) => ({
      id: `point-${n}`,
      text: `TODO: point ${n}, with a specific number`,
      visual: { kind: "point" as const, number: n, headline: `TODO point ${n}`, stat: { prefix: "", value: 0, suffix: "", label: "TODO" } },
    })),
    { id: "cta", text: "TODO: one clear call to action", visual: { kind: "cta" } },
  ],
  Explainer16x9: [
    { id: "hook", text: "TODO: hook", visual: { kind: "hook", kicker: "TODO audience", headline: "TODO headline" } },
    { id: "problem", text: "TODO: the problem, in the buyer's words", visual: { kind: "statement", kicker: "The problem", headline: "TODO", body: "TODO" } },
    { id: "solution", text: "TODO: how the client solves it", visual: { kind: "statement", kicker: "The solution", headline: "TODO", body: "TODO" } },
    ...[1, 2, 3].map((n) => ({
      id: `benefit-${n}`,
      text: `TODO: benefit ${n} with a number or proof point`,
      visual: { kind: "point" as const, number: n, headline: `TODO benefit ${n}`, stat: { prefix: "", value: 0, suffix: "", label: "TODO" }, proof: "TODO proof source" },
    })),
    { id: "cta", text: "TODO: one clear call to action", visual: { kind: "cta" } },
  ],
  PromoSquare1x1: [
    ...[1, 2].map((n) => ({
      id: `shot-${n}`,
      text: `TODO: shot ${n} narration`,
      visual: { kind: "broll" as const, src: `broll/${id}/shot-${n}.mp4`, prompt: `TODO: describe shot ${n}`, headline: "TODO", lowerThird: { title: "TODO", subtitle: "TODO" } },
    })),
    { id: "cta", text: "TODO: offer and call to action", visual: { kind: "cta" } },
  ],
};

if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || !brand || !format || !TEMPLATES[format]) {
  console.error('Usage: node scripts/new-video.ts <video-id> --brand=<brand-id> --format=SocialReel9x16|Explainer16x9|PromoSquare1x1 [--title="..."]');
  console.error("The id must be lowercase letters, numbers and dashes, e.g. spring-ac-tuneup-reel");
  process.exit(1);
}
if (!existsSync(path.join("brands", brand, "brand.json"))) {
  console.error(`Brand "${brand}" not found in brands/`);
  process.exit(1);
}
const dir = path.join("videos", id);
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}

const config: VideoConfig = { id, brand, format, title, scenes: TEMPLATES[format] };
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "config.json"), JSON.stringify(config, null, 2) + "\n");
writeFileSync(
  path.join(dir, "script.md"),
  `# ${title}

- **Brand:** ${brand}
- **Format:** ${format}
- **Audience:** TODO
- **Goal:** TODO (lead, sale or awareness)
- **Key benefit:** TODO
- **Offer and CTA:** TODO
- **Target length:** TODO

## Narration (source of truth: \`config.json\`)

${config.scenes.map((s) => `**${s.id}:** ${s.text}`).join("\n\n")}
`,
);
console.log(`Created ${dir}/config.json and script.md (${format}, brand ${brand}). Replace every TODO before narrating.`);
