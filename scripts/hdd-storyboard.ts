// Builds the DTI HDD storyboard (HTML, printable) from src/hdd/timeline.ts and the narration transcript,
// and writes the captions (SRT) with the updated wording.
//   node scripts/hdd-storyboard.ts   -> hdd/dti-hdd-explainer/storyboard/index.html, out/dti/dti-hdd-explainer.srt
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Word = { w: string; s: number; e: number };
type Narr = { id: string; start: number; end: number; text: string; words: Word[]; pickup?: { text: string; start: number }; originalEnding?: { text: string } };
const cfg = JSON.parse(readFileSync("hdd/dti-hdd-explainer/narration.json", "utf8")) as { narration: Narr[]; transcriptNotes: string[] };
const src = readFileSync("src/hdd/timeline.ts", "utf8");

const blocks = [...src.matchAll(/\n  \{\n    id: "(S\d+)",[\s\S]*?(?=\n  \{\n    id:|\n\];)/g)].map((m) => m[0]);
const str = (b: string, key: string) => {
  const m = new RegExp(`\\n    ${key}: "((?:[^"\\\\]|\\\\.)*)"`).exec(b);
  return m ? m[1].replace(/\\'/g, "'") : "";
};
const shots = blocks.map((b) => {
  const id = /id: "(S\d+)"/.exec(b)![1];
  const start = Number(/start: ([\d.]+)/.exec(b)![1]);
  const end = Number(/end: ([\d.]+)/.exec(b)![1]);
  const title = /title: \{ (?:number: "(\d)", )?text: "([^"]+)"/.exec(b);
  const personas = (/personas: \[([^\]]*)\]/.exec(b)?.[1] ?? "").match(/"([^"]+)"/g)?.map((x) => x.slice(1, -1)) ?? [];
  const labels = [...b.matchAll(/\{ text: "([^"]+)", at: ([\d.]+)/g)].map((m) => ({ text: m[1], at: Number(m[2]) }));
  return { id, start, end, title: title ? (title[1] ? `${title[1]}. ${title[2]}` : title[2]) : "", visual: str(b, "visual"), review: str(b, "review"), personas, labels, scene: /scene: "(\w+)"/.exec(b)?.[1] ?? "site" };
});

// overlay text drawn by the composition (not in the label lists)
const OVERLAYS: Record<string, string[]> = {
  S04: ["Work area set back from traffic and business access (outline)"],
  S05: ["Clearance below existing utilities (bracket, no values)", "Utility locate marks on the surface (APWA colors)"],
  S06: ["Radio communication (link between operator and locator)"],
  S07: ["Locator display: Depth / Pitch (illustrative, no project data)", "Steering directions to the operator (link)"],
  S08: ["Steering: Up / Down / Right / Left, then 'Gradual corrections, combined as needed'", "Plan view inset with head position"],
  S09: ["Sizing (example): pilot bore with 4-inch bit, conduit, enlarged bore about 1.5 × conduit; 'Examples from the narration. Sizes are set for each project.'"],
  S10: ["Localized work zones (outlines)"],
  S12: ["Less Disruption to Businesses", "Less Traffic Disruption", "Less Surface Restoration"],
  S13: ["Wetland, Stream and River Crossings", "Stream and wetland", "Conduit beneath the channel"],
  S14: ["Directional Technologies, Inc. / Installing conduit by directional drilling for over 30 years"],
  S15: ["DTI approved logo", "HDD Expertise Since 1992", "Discuss Your Next HDD Project", "203-294-9200 · 877-788-4479", "drilling@directionaltech.com · directionaltech.com"],
};

const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const narrFor = (a: number, b: number) =>
  cfg.narration
    .filter((n) => n.start < b && n.end > a && n.start >= a - 0.5)
    .map((n) => {
      if (n.pickup) {
        const kept = n.words.map((w) => w.w).join(" ");
        return `${fmt(n.start)} ${esc(kept)} <span class="pickup">${esc(n.pickup.text)}</span>`;
      }
      return `${fmt(n.start)} ${esc(n.text)}`;
    });

const rows = shots
  .map(
    (s) => `
  <section class="shot">
    <div class="frame"><img src="${s.id}.jpg" alt="${s.id} frame"><div class="tc">${s.id} · ${fmt(s.start)} to ${fmt(s.end)}</div></div>
    <div class="info">
      <h2>${s.id}${s.title ? ` · ${esc(s.title)}` : ""}</h2>
      <h3>Narration (original recording)</h3>
      <div class="narr">${narrFor(s.start, s.end).map((n) => `<p>${n}</p>`).join("") || "<p class='muted'>No narration (silent opening, as in the original).</p>"}</div>
      <h3>Visual</h3><p>${esc(s.visual)}</p>
      <h3>On-screen text</h3>
      <ul>${[...s.labels.map((l) => `<li>${esc(l.text)} <span class="muted">@ ${fmt(l.at)}</span></li>`), ...(OVERLAYS[s.id] ?? []).map((o) => `<li>${esc(o)}</li>`)].join("") || "<li class='muted'>None</li>"}</ul>
      <h3>Audience focus</h3><p>${s.personas.map(esc).join(" · ")}</p>
      ${s.review ? `<h3>HDD specialist review</h3><p class="review">${esc(s.review)}</p>` : ""}
    </div>
  </section>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DTI HDD Storyboard</title>
<style>
  :root { --ink:#1F2328; --muted:#575A5C; --blue:#0E4D97; --orange:#F78228; --line:#dfe2e5; --bg:#f4f5f6; }
  * { box-sizing:border-box } body { margin:0; font-family: Montserrat, "Segoe UI", Arial, sans-serif; color:var(--ink); background:var(--bg); }
  header { padding:32px 40px 18px; background:#fff; border-bottom:4px solid var(--blue) }
  header h1 { margin:0 0 6px; font-size:28px } header p { margin:4px 0; color:var(--muted); font-size:14px }
  .flags { margin:18px 40px; padding:16px 20px; background:#fff; border-left:5px solid var(--orange); border-radius:6px; font-size:14px }
  .flags h2 { margin:0 0 8px; font-size:16px } .flags li { margin:4px 0 }
  .shot { display:grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap:24px; margin:18px 40px; padding:18px; background:#fff; border-radius:8px; break-inside:avoid; }
  .frame img { width:100%; display:block; border-radius:4px; border:1px solid var(--line) } .tc { margin-top:6px; font-size:13px; color:var(--muted) }
  h2 { margin:0 0 6px; font-size:19px; color:var(--blue) } h3 { margin:12px 0 4px; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted) }
  p, li { font-size:14px; line-height:1.45; margin:2px 0 } ul { margin:0; padding-left:18px } .muted { color:var(--muted) }
  .narr p { font-style:italic } .pickup { background:#fff1e5; border-bottom:2px solid var(--orange); font-style:normal; font-weight:600 }
  .review { background:#eef3fa; padding:6px 10px; border-radius:4px }
  @media (max-width: 900px) { .shot { grid-template-columns: 1fr; margin:12px 16px } header, .flags { margin-left:16px; margin-right:16px; padding-left:16px; padding-right:16px } }
  @media print { body { background:#fff } .shot { margin:10px 0; padding:8px 0; border-bottom:1px solid var(--line); border-radius:0 } header, .flags { margin:0 0 10px } }
</style></head><body>
<header>
  <h1>Horizontal Directional Drilling · 3D explainer storyboard</h1>
  <p>Directional Technologies, Inc. (DTI) · 16:9, 1920 × 1080 · 3:08 · synchronized to the original recorded narration</p>
  <p>Draft for review, ${new Date().toISOString().slice(0, 10)}. Frames are rendered from the actual 3D production files (draft quality).</p>
</header>
<div class="flags">
  <h2>Production requirements and open items</h2>
  <ul>
    <li><b>Pickup line:</b> “over the past 23 years” is removed from the original audio. The replacement “for over 30 years.” (highlighted below) is <b>pending</b>: a consented voice match of the original narrator requires the narrator's written consent and an approved ElevenLabs credit estimate. Until then the audio is silent there and drafts show a PICKUP PENDING flag.</li>
    <li><b>Personas document:</b> “DTI Personas – 7-15-26.pdf” was not received. Audience focus follows the six audience priorities in the brief; it will be refined when the PDF arrives.</li>
    <li><b>Transcript to confirm:</b> ${cfg.transcriptNotes.slice(1).map(esc).join(" ")}</li>
    <li><b>HDD specialist review</b> of bore geometry, equipment behavior, tracking graphics, fluid handling and pullback connections is required before the final render (see notes per shot).</li>
    <li><b>Music:</b> none licensed yet. The draft has narration only; a licensed bed will be added at low level under the voice.</li>
    <li><b>Contact details</b> on the end card as supplied: ${["203-294-9200", "877-788-4479", "drilling@directionaltech.com", "directionaltech.com"].join(" · ")}.</li>
    <li>Utility colors follow the APWA / Common Ground Alliance uniform color code; utility depths, sizes and the site are illustrative, not survey data. No project measurements, costs, schedules or outcome guarantees are shown.</li>
  </ul>
</div>
${rows}
</body></html>
`;
mkdirSync("hdd/dti-hdd-explainer/storyboard", { recursive: true });
writeFileSync("hdd/dti-hdd-explainer/storyboard/index.html", html);
console.log(`Storyboard: ${shots.length} shots -> hdd/dti-hdd-explainer/storyboard/index.html`);

// ---------- captions (same paging rules as the burned-in captions) ----------
type Page = { text: string; start: number; end: number };
const pages: Page[] = [];
for (const n of cfg.narration) {
  const words = n.words.map((w) => ({ ...w }));
  if (n.pickup) n.pickup.text.split(" ").forEach((w, i) => words.push({ w, s: n.pickup!.start + i * 0.36, e: n.pickup!.start + (i + 1) * 0.36 }));
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    pages.push({ text: cur.map((w) => w.w).join(" "), start: cur[0].s, end: cur[cur.length - 1].e });
    cur = [];
  };
  for (const w of words) {
    const len = cur.map((x) => x.w).join(" ").length + w.w.length + 1;
    if (len > 78) flush();
    cur.push(w);
    if (/[,]$/.test(w.w) && cur.map((x) => x.w).join(" ").length > 46) flush();
  }
  flush();
}
const timed = pages.map((p, i) => ({ ...p, end: Math.min(p.end + 0.8, pages[i + 1]?.start ?? p.end + 0.8) }));
const ts = (t: number) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
// two lines max, split near the middle
const wrap = (t: string) => {
  if (t.length <= 42) return t;
  const mid = t.length / 2;
  let best = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return `${t.slice(0, best)}\n${t.slice(best + 1)}`;
};
mkdirSync("out/dti", { recursive: true });
writeFileSync("out/dti/dti-hdd-explainer.srt", timed.map((p, i) => `${i + 1}\n${ts(p.start)} --> ${ts(p.end)}\n${wrap(p.text)}\n`).join("\n"));
writeFileSync("hdd/dti-hdd-explainer/captions.srt", readFileSync("out/dti/dti-hdd-explainer.srt"));
console.log(`Captions: ${timed.length} cues -> out/dti/dti-hdd-explainer.srt (copy in hdd/dti-hdd-explainer/captions.srt)`);
