// Checks a brand folder before you use it: required fields, colors, fonts, logo, contrast,
// and placeholders that still need real values.
//
// Usage: node scripts/validate-brand.ts <brand-id>     (or --all)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Brand } from "../src/lib/types.ts";

const HEX = /^#[0-9A-Fa-f]{6}$/;

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const googleFonts = () => {
  const src = readFileSync("src/lib/font-map.ts", "utf8");
  return new Set([...src.matchAll(/^\s+(?:"([^"]+)"|(\w+)): font\(/gm)].map((m) => m[1] ?? m[2]));
};

export const validateBrand = (id: string): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dir = path.join("brands", id);
  const file = path.join(dir, "brand.json");
  if (!existsSync(file)) return { errors: [`${file} not found`], warnings };
  let brand: Brand;
  try {
    brand = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return { errors: [`${file} is not valid JSON: ${(e as Error).message}`], warnings };
  }

  if (brand.id !== id) errors.push(`"id" is "${brand.id}" but the folder is "${id}" (they must match)`);
  for (const key of ["displayName", "colors", "fonts", "logo", "toneOfVoice", "voice", "pronunciations", "style", "captionStyle", "cta"] as const) {
    if (brand[key] === undefined) errors.push(`missing "${key}"`);
  }
  if (errors.length) return { errors, warnings };

  for (const [name, value] of Object.entries(brand.colors)) {
    if (!HEX.test(value)) errors.push(`colors.${name} "${value}" must be a 6-digit hex color like #1A2B3C`);
  }
  const cs = brand.captionStyle;
  for (const [name, value] of Object.entries({ baseColor: cs.baseColor, activeColor: cs.activeColor, activeBackground: cs.activeBackground, strokeColor: cs.strokeColor })) {
    if (!HEX.test(value)) errors.push(`captionStyle.${name} "${value}" must be a 6-digit hex color`);
  }

  const known = googleFonts();
  for (const role of ["heading", "body"] as const) {
    const f = brand.fonts[role];
    if (f.files) {
      for (const rel of Object.values(f.files)) if (!existsSync(path.join(dir, rel))) errors.push(`fonts.${role}: file ${rel} not found in ${dir}/`);
    } else if (!known.has(f.family)) {
      errors.push(`fonts.${role}: "${f.family}" is not in src/lib/font-map.ts (add one line there) and has no local files`);
    }
  }
  if (!existsSync(path.join(dir, brand.logo))) errors.push(`logo ${brand.logo} not found in ${dir}/`);
  else if (brand.logo.endsWith(".svg") && /<text/.test(readFileSync(path.join(dir, brand.logo), "utf8")) && !/@font-face/.test(readFileSync(path.join(dir, brand.logo), "utf8"))) {
    warnings.push("logo.svg uses <text> without an embedded font, so it renders in a fallback font. Use outlined paths or embed the font.");
  }

  if (brand.colors.text && HEX.test(brand.colors.text)) {
    const checks: [string, string, string, number][] = [
      ["text on background", brand.colors.text, brand.colors.background, 4.5],
      ["muted text on background", brand.colors.textMuted, brand.colors.background, 3],
      ["button text on primary", brand.colors.textOnPrimary, brand.colors.primary, 3],
      ["kicker text on accent", brand.colors.textOnAccent, brand.colors.accent, 3],
      ["caption text on background", cs.baseColor, brand.colors.background, 4.5],
      [cs.highlight === "box" ? "highlighted caption in its box" : "highlighted caption on background",
        cs.highlight === "box" ? cs.activeColor : cs.activeBackground,
        cs.highlight === "box" ? cs.activeBackground : brand.colors.background, 3],
    ];
    for (const [name, fg, bg, min] of checks) {
      const ratio = contrast(fg, bg);
      if (ratio < min) errors.push(`contrast for ${name} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
    }
  }

  if (cs.fontSizePx < 64) warnings.push(`captionStyle.fontSizePx ${cs.fontSizePx} is small for phones (64+ recommended)`);
  if (brand.voice.voiceId.startsWith("REPLACE")) warnings.push("voice.voiceId is still a placeholder (needed before real narration)");
  if (brand.music && !existsSync(path.join("public", "music", brand.music))) errors.push(`music file public/music/${brand.music} not found`);
  if (brand.pronunciations.length === 0) warnings.push("no pronunciations listed: add product names, standards and technical terms");
  return { errors, warnings };
};

if (import.meta.main) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/validate-brand.ts <brand-id> | --all");
    process.exit(1);
  }
  const ids = arg === "--all" ? readdirSync("brands").filter((d) => existsSync(path.join("brands", d, "brand.json"))) : [arg];
  let failed = false;
  for (const id of ids) {
    const { errors, warnings } = validateBrand(id);
    console.log(`${errors.length ? "FAIL" : "OK  "} ${id}`);
    for (const e of errors) console.log(`  error:   ${e}`);
    for (const w of warnings) console.log(`  warning: ${w}`);
    failed ||= errors.length > 0;
  }
  process.exit(failed ? 1 : 0);
}
