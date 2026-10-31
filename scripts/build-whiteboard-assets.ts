// Builds the data files whiteboard scenes draw from (both are committed, so this only needs to run when
// upgrading @tabler/icons or adding a font):
//  - src/whiteboard/icons.json: every Tabler outline icon (MIT, tabler.io/icons) as plain SVG path strings.
//  - src/whiteboard/fonts.json: single-line (stroke) SVG fonts from the `hersheytext` package. Single-line
//    fonts are what make text look "written" stroke by stroke: normal fonts are closed outlines, so
//    drawing them traces each letter's border twice. All three are SIL Open Font License 1.1.
//
// Usage: node scripts/build-whiteboard-assets.ts
import { getBoundingBox, normalizePath, parsePath, reduceInstructions, serializeInstructions } from "@remotion/paths";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Our name -> SVG font file in node_modules/hersheytext/svg_fonts */
const FONTS: Record<string, { file: string; credit: string }> = {
  marker: { file: "EMSTech.svg", credit: "EMS Tech by Sheldon B. Michaels, a single-line derivative of Architects Daughter. SIL OFL 1.1." },
  clean: { file: "EMSReadability.svg", credit: "EMS Readability by Sheldon B. Michaels, a single-line derivative of Source Sans Pro Light. SIL OFL 1.1." },
  script: { file: "EMSFelix.svg", credit: "EMS Felix by Sheldon B. Michaels, a single-line derivative of Felipa. SIL OFL 1.1." },
};

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const round = (d: string) => d.replace(/-?\d*\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));

// ---------- Icons ----------
type IconNode = [string, Record<string, string>];
const nodeToPath = ([tag, a]: IconNode): string | null => {
  if (a.stroke === "none") return null;
  const n = (k: string) => Number(a[k] ?? 0);
  switch (tag) {
    case "path":
      return a.d;
    case "line":
      return `M${n("x1")} ${n("y1")}L${n("x2")} ${n("y2")}`;
    case "circle":
      return `M${n("cx") - n("r")} ${n("cy")}a${n("r")} ${n("r")} 0 1 0 ${2 * n("r")} 0a${n("r")} ${n("r")} 0 1 0 ${-2 * n("r")} 0`;
    case "ellipse":
      return `M${n("cx") - n("rx")} ${n("cy")}a${n("rx")} ${n("ry")} 0 1 0 ${2 * n("rx")} 0a${n("rx")} ${n("ry")} 0 1 0 ${-2 * n("rx")} 0`;
    case "rect":
      return `M${n("x")} ${n("y")}h${n("width")}v${n("height")}h${-n("width")}Z`;
    case "polyline":
    case "polygon": {
      const pts = (a.points ?? "").trim().split(/[\s,]+/).map(Number);
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return tag === "polygon" ? `${d}Z` : d;
    }
    default:
      throw new Error(`Unknown icon element <${tag}>`);
  }
};
const tabler: Record<string, IconNode[]> = JSON.parse(readFileSync(path.join("node_modules", "@tabler", "icons", "tabler-nodes-outline.json"), "utf8"));
const icons: Record<string, string[]> = {};
for (const [name, nodes] of Object.entries(tabler)) {
  icons[name] = nodes.map(nodeToPath).filter((d): d is string => d !== null);
}
const tablerVersion = JSON.parse(readFileSync(path.join("node_modules", "@tabler", "icons", "package.json"), "utf8")).version;
writeFileSync(path.join("src", "whiteboard", "icons.json"), JSON.stringify({ source: `@tabler/icons ${tablerVersion} (MIT)`, icons }) + "\n");
console.log(`icons: ${Object.keys(icons).length} Tabler outline icons (v${tablerVersion})`);

// ---------- Fonts ----------
const out: Record<string, unknown> = {};
for (const [name, { file, credit }] of Object.entries(FONTS)) {
  const svg = readFileSync(path.join("node_modules", "hersheytext", "svg_fonts", file), "utf8");
  const fontTag = svg.match(/<font\s[^>]*>/)![0];
  const faceTag = svg.match(/<font-face[\s\S]*?\/>/)![0];
  const defaultAdvance = Number(attr(fontTag, "horiz-adv-x"));
  const glyphs: Record<string, { a: number; d?: string }> = {};
  for (const tag of svg.match(/<glyph\s[^>]*\/>/g) ?? []) {
    const unicode = attr(tag, "unicode");
    if (unicode === undefined) continue;
    const char = decode(unicode);
    if ([...char].length !== 1) continue;
    const d = attr(tag, "d");
    glyphs[char] = {
      a: Number(attr(tag, "horiz-adv-x") ?? defaultAdvance),
      // Absolute M/L/C/Q/Z only, so the renderer can scale and flip without parsing arcs or relative commands
      ...(d ? { d: round(serializeInstructions(reduceInstructions(parsePath(normalizePath(d))))) } : {}),
    };
  }
  out[name] = {
    credit,
    unitsPerEm: Number(attr(faceTag, "units-per-em")),
    // The fonts' declared cap-height (500) does not match the drawn letters, so measure "H" instead
    capHeight: Math.round(getBoundingBox(glyphs.H.d!).y2),
    ascent: Number(attr(faceTag, "ascent")),
    descent: Number(attr(faceTag, "descent")),
    defaultAdvance,
    glyphs,
  };
  console.log(`${name}: ${Object.keys(glyphs).length} glyphs from ${file}`);
}
writeFileSync(path.join("src", "whiteboard", "fonts.json"), JSON.stringify(out) + "\n");
console.log("Wrote src/whiteboard/fonts.json");
