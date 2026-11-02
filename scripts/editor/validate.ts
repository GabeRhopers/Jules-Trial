// Checks a config sent by the editor before it is written to videos/<id>/config.json.
// Structural problems only (things that would break the file or the render); content advice is shown in the editor.
import path from "node:path";
import type { VideoConfig } from "../../src/lib/types.ts";

/** Resolves `rel` inside `base`, or null if it would escape it (blocks ../ tricks, including encoded ones). */
export const safeJoin = (base: string, rel: string): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rel.split("?")[0]);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const full = path.resolve(base, "." + path.posix.normalize("/" + decoded));
  return full === base || full.startsWith(base + path.sep) ? full : null;
};

const KINDS = ["hook", "statement", "point", "broll", "cta", "whiteboard"];
const FORMATS = ["SocialReel9x16", "Explainer16x9", "PromoSquare1x1"];
const SCENE_ID = /^[a-z0-9][a-z0-9-]*$/;

export const validateConfig = (config: VideoConfig, expectedId: string, brandIds?: string[]): string[] => {
  const errors: string[] = [];
  if (!config || typeof config !== "object") return ["The config is empty"];
  if (config.id !== expectedId) errors.push(`The video id must stay "${expectedId}"`);
  if (!FORMATS.includes(config.format)) errors.push(`Unknown format "${config.format}"`);
  if (typeof config.brand !== "string" || !config.brand) errors.push("Pick a brand");
  else if (brandIds && !brandIds.includes(config.brand)) errors.push(`Brand "${config.brand}" does not exist`);
  if (typeof config.title !== "string") errors.push("The title must be text");
  if (!Array.isArray(config.scenes) || config.scenes.length === 0) return [...errors, "A video needs at least one scene"];
  const seen = new Set<string>();
  config.scenes.forEach((s, i) => {
    const where = `Scene ${i + 1}${s?.id ? ` ("${s.id}")` : ""}`;
    if (!s || typeof s !== "object") return errors.push(`${where} is empty`);
    if (!SCENE_ID.test(s.id ?? "")) errors.push(`${where}: the scene name may only use lowercase letters, numbers and dashes`);
    if (seen.has(s.id)) errors.push(`${where}: two scenes have the same name`);
    seen.add(s.id);
    if (typeof s.text !== "string" || !s.text.trim()) errors.push(`${where}: the voice text is empty`);
    if (!s.visual || !KINDS.includes(s.visual.kind)) errors.push(`${where}: unknown scene type`);
  });
  return errors;
};
