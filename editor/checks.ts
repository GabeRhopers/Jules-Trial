// Friendly checks shown next to each scene while editing (before saving or rendering).
// "error" = the render will stop; "tip" = it works, but could be better.
import type { SceneConfig, VideoConfig } from "../src/lib/types";
import { parseFlowchart } from "../src/whiteboard/flowchart";
import { iconExists, similarIcons } from "../src/whiteboard/geometry";
import { findCues } from "../src/whiteboard/timing";

export type Check = { level: "error" | "tip"; message: string };

const words = (text: string) => text.split(/\s+/).filter(Boolean).map((t, i) => ({ text: t, startMs: i, endMs: i + 1 }));
const wordCount = (s: string | undefined) => (s ?? "").split(/\s+/).filter(Boolean).length;

const iconCheck = (icon: string | undefined, where: string): Check[] => {
  if (!icon || iconExists(icon)) return [];
  const close = similarIcons(icon, 5);
  return [{ level: "error", message: `${where}: icon "${icon}" does not exist.${close.length ? ` Try: ${close.join(", ")}` : ""}` }];
};

export const checkScene = (scene: SceneConfig): Check[] => {
  const out: Check[] = [];
  const v = scene.visual;
  if (!scene.text.trim()) out.push({ level: "error", message: "The voice text is empty." });
  if (/\bTODO\b/.test(scene.text)) out.push({ level: "error", message: "The voice text still contains TODO. Write the final text before making the voice." });
  const headline = "headline" in v ? v.headline : undefined;
  if (headline && wordCount(headline) > 6) out.push({ level: "tip", message: `The headline has ${wordCount(headline)} words. 6 or fewer read best on a phone.` });
  if (v.kind === "hook" && wordCount(scene.text.split(/[.?!]/)[0]) > 12) {
    out.push({ level: "tip", message: "The first sentence is long. The hook should land within 3 seconds (about 8 words)." });
  }

  if (v.kind === "whiteboard") {
    const layout = v.layout ?? "flow";
    let cues: (string | undefined)[] = [];
    if (layout === "diagram") {
      try {
        const chart = parseFlowchart(v.diagram ?? "");
        const ids = new Set(chart.nodes.map((n) => n.id));
        for (const id of Object.keys(v.nodes ?? {})) if (!ids.has(id)) out.push({ level: "error", message: `Options for box "${id}", which is not in the flowchart.` });
        cues = chart.nodes.map((n) => v.nodes?.[n.id]?.at);
        for (const n of chart.nodes) out.push(...iconCheck(v.nodes?.[n.id]?.icon, `Box "${n.id}"`));
        if (chart.nodes.length > 6) out.push({ level: "tip", message: `${chart.nodes.length} boxes: 4 to 6 keep the text readable on a phone.` });
      } catch (e) {
        out.push({ level: "error", message: (e as Error).message });
      }
    } else {
      const items = v.items ?? [];
      if (items.length === 0) out.push({ level: "error", message: "Add at least one drawing." });
      if (layout === "flow" && items.length > 4) out.push({ level: "tip", message: "A row fits up to 4 drawings." });
      items.forEach((it, i) => out.push(...iconCheck(it.icon, `Drawing ${i + 1}`)));
      cues = items.map((it) => it.at);
    }
    try {
      findCues(cues, words(scene.text), scene.id);
    } catch {
      const missing = cues.find((c, i) => {
        try {
          findCues(cues.slice(0, i + 1), words(scene.text), scene.id);
          return false;
        } catch {
          return c !== undefined;
        }
      });
      out.push({ level: "error", message: `Cue word "${missing}" is not in the voice text (or comes before the previous cue). Each cue must be a word the voice says, in order.` });
    }
  }
  return out;
};

export const checkVideo = (video: VideoConfig): Check[] => {
  const out: Check[] = [];
  const ids = video.scenes.map((s) => s.id);
  if (new Set(ids).size !== ids.length) out.push({ level: "error", message: "Two scenes have the same name." });
  if (video.scenes[0] && video.scenes[0].visual.kind !== "hook") out.push({ level: "tip", message: "Videos work best when the first scene is a hook." });
  const last = video.scenes[video.scenes.length - 1];
  if (last && last.visual.kind !== "cta") out.push({ level: "tip", message: "End with a call-to-action scene." });
  return out;
};
