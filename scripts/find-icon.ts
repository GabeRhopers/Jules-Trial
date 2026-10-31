// Finds Tabler icon names for whiteboard scenes by name, tag or category.
// Usage: npm run icon -- <keyword> [more keywords]     e.g.  npm run icon -- factory
// Browse visually at https://tabler.io/icons (use the "outline" style names).
import { readFileSync } from "node:fs";
import path from "node:path";

type Meta = { name: string; category?: string; tags?: (string | number)[] };

const words = process.argv.slice(2).map((w) => w.toLowerCase());
if (words.length === 0) {
  console.error("Usage: npm run icon -- <keyword> [more keywords]");
  process.exit(1);
}
const drawable = new Set(Object.keys(JSON.parse(readFileSync(path.join("src", "whiteboard", "icons.json"), "utf8")).icons));
let meta: Record<string, Meta> = {};
try {
  meta = JSON.parse(readFileSync(path.join("node_modules", "@tabler", "icons", "icons.json"), "utf8"));
} catch {
  // Without node_modules, search names only
}

const score = (name: string) => {
  const m = meta[name];
  const tags = (m?.tags ?? []).map((t) => String(t).toLowerCase());
  let s = 0;
  for (const w of words) {
    if (name === w) s += 10;
    else if (name.split("-").includes(w)) s += 5;
    else if (name.includes(w)) s += 3;
    if (tags.includes(w)) s += 2;
    if (m?.category?.toLowerCase() === w) s += 1;
  }
  return s;
};

const hits = [...drawable]
  .map((name) => ({ name, s: score(name) }))
  .filter((h) => h.s > 0)
  .sort((a, b) => b.s - a.s || a.name.length - b.name.length)
  .slice(0, 30);
if (hits.length === 0) console.log(`No icons match "${words.join(" ")}". Try a broader word (e.g. "tool" instead of "wrench set").`);
for (const h of hits) console.log(`${h.name}${meta[h.name]?.category ? `  (${meta[h.name].category})` : ""}`);
