// "diagram" layout for whiteboard scenes: a Mermaid-style flowchart laid out with dagre (MIT), then drawn
// with the same hand-drawn pen as the rest of the whiteboard: Rough.js shapes and arrows, handwritten labels,
// optional Tabler icons inside nodes. Each node (with the arrows into it) is one drawing, started on its cue word.
import { Graph, layout as dagreLayout } from "@dagrejs/dagre";
import type { Rect } from "../lib/safe-zones";
import type { WhiteboardFont, WhiteboardNode } from "../lib/types";
import { parseFlowchart, type FlowNode, type NodeShape } from "./flowchart";
import { iconStrokes, measureText, roughOpts, roughStrokes, textStrokes, wrapText, type Point, type Stroke, type StrokeGroup } from "./geometry";

type Input = {
  sceneId: string;
  source: string;
  options: Record<string, WhiteboardNode>;
  region: Rect;
  /** Label cap height at full size, px */
  cap: number;
  font: WhiteboardFont;
  ink: string;
  highlight: string;
};

type Sized = { node: FlowNode; lines: string[]; icon?: string; iconSize: number; contentW: number; contentH: number; w: number; h: number };

const LINE = 1.55;

/** Size of a node at full scale, from its text (wrapped) and optional icon. */
const sizeNode = (node: FlowNode, opts: WhiteboardNode | undefined, cap: number, font: WhiteboardFont): Sized => {
  const lines = wrapText(node.label, font, cap, cap * 8);
  const textW = Math.max(...lines.map((l) => measureText(l, font, cap)));
  const textH = cap * 1.3 + (lines.length - 1) * cap * LINE;
  const iconSize = opts?.icon ? cap * 2.4 : 0;
  const contentW = Math.max(textW, iconSize);
  const contentH = textH + (iconSize ? iconSize + cap * 0.5 : 0);
  const pad: Record<NodeShape, [number, number]> = {
    box: [contentW + cap * 1.3, contentH + cap * 1.2],
    rounded: [contentW + cap * 1.5, contentH + cap * 1.2],
    pill: [contentW + cap * 2.0, contentH + cap * 1.2],
    // Diamonds need generous room: text near their corners would touch the outline
    decision: [contentW * 1.5 + cap * 2.1, contentH * 1.5 + cap * 1.7],
    circle: [0, 0],
  };
  let [w, h] = pad[node.shape];
  if (node.shape === "circle") w = h = Math.max(contentW, contentH) * 1.25 + cap;
  return { node, lines, icon: opts?.icon, iconSize, contentW, contentH, w, h };
};

/** Where a ray from the node center toward `toward` leaves the node's outline */
const clipToShape = (c: Point, w: number, h: number, shape: NodeShape, toward: Point): Point => {
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const a = w / 2;
  const b = h / 2;
  let t: number;
  if (shape === "decision") t = 1 / (Math.abs(dx) / a + Math.abs(dy) / b);
  else if (shape === "circle") t = 1 / Math.sqrt((dx / a) ** 2 + (dy / b) ** 2);
  else t = Math.min(dx === 0 ? Infinity : a / Math.abs(dx), dy === 0 ? Infinity : b / Math.abs(dy));
  return { x: c.x + dx * t, y: c.y + dy * t };
};

const shapeStrokes = (key: string, shape: NodeShape, c: Point, w: number, h: number, color: string, width: number): Stroke[] => {
  const x0 = c.x - w / 2;
  const y0 = c.y - h / 2;
  return roughStrokes(
    key,
    (g, seed) => {
      const o = { ...roughOpts(seed, 0.9), bowing: 0.8 };
      switch (shape) {
        case "decision":
          return g.polygon(
            [
              [c.x, y0],
              [x0 + w, c.y],
              [c.x, y0 + h],
              [x0, c.y],
            ],
            o,
          );
        case "circle":
          return g.ellipse(c.x, c.y, w, h, { ...o, curveStepCount: 14 });
        case "box":
          return g.rectangle(x0, y0, w, h, o);
        default: {
          const r = shape === "pill" ? h / 2 : Math.min(w, h) * 0.22;
          const d = `M${x0 + r} ${y0}H${x0 + w - r}A${r} ${r} 0 0 1 ${x0 + w} ${y0 + r}V${y0 + h - r}A${r} ${r} 0 0 1 ${x0 + w - r} ${y0 + h}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y0 + h - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
          return g.path(d, o);
        }
      }
    },
    color,
    width,
  );
};

/** Hand-drawn connector through dagre's points, with an arrowhead at the end */
const connectorStrokes = (key: string, pts: Point[], arrow: boolean, color: string, width: number, headLen: number): Stroke[] => {
  const strokes = roughStrokes(
    `${key}-shaft`,
    (g, seed) =>
      pts.length > 2
        ? g.curve(
            pts.map((p) => [p.x, p.y] as [number, number]),
            roughOpts(seed, 0.8),
          )
        : g.line(pts[0].x, pts[0].y, pts[1].x, pts[1].y, roughOpts(seed, 0.8)),
    color,
    width,
  );
  if (arrow) {
    const tip = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    const wing = (side: 1 | -1): [number, number] => [tip.x - headLen * Math.cos(angle + side * 0.5), tip.y - headLen * Math.sin(angle + side * 0.5)];
    strokes.push(...roughStrokes(`${key}-head`, (g, seed) => g.linearPath([wing(1), [tip.x, tip.y], wing(-1)], roughOpts(seed, 0.5)), color, width));
  }
  return strokes;
};

/**
 * Lays out and draws the diagram inside `region`. The whole diagram is scaled down (never up) to fit;
 * `scale` is returned so the scene can warn when text gets too small to read on a phone.
 */
export const diagramGroups = ({ sceneId, source, options, region, cap, font, ink, highlight }: Input): { groups: StrokeGroup[]; scale: number } => {
  const chart = parseFlowchart(source);
  const known = new Set(chart.nodes.map((n) => n.id));
  for (const id of Object.keys(options)) {
    if (!known.has(id)) throw new Error(`Whiteboard scene "${sceneId}": "nodes" has "${id}", which is not a node in the diagram (${[...known].join(", ")})`);
  }

  const sized = new Map(chart.nodes.map((n) => [n.id, sizeNode(n, options[n.id], cap, font)]));
  const g = new Graph({ multigraph: true });
  const anyLabel = chart.edges.some((e) => e.label);
  g.setGraph({ rankdir: chart.direction, nodesep: cap * (anyLabel ? 1.7 : 1.3), ranksep: cap * (anyLabel ? 2.0 : 1.6), edgesep: cap * 0.8, marginx: 0, marginy: 0 });
  for (const s of sized.values()) g.setNode(s.node.id, { width: s.w, height: s.h });
  // Edge labels are drawn beside their line (not given their own layout row), which keeps diagrams compact
  chart.edges.forEach((e, i) => g.setEdge(e.from, e.to, {}, `e${i}`));
  dagreLayout(g);

  const graph = g.graph();
  const gw = graph.width ?? 1;
  const gh = graph.height ?? 1;
  const s = Math.min(1, region.width / gw, region.height / gh);
  const ox = region.x + (region.width - gw * s) / 2;
  const oy = region.y + (region.height - gh * s) / 2;
  const T = (p: { x: number; y: number }): Point => ({ x: ox + p.x * s, y: oy + p.y * s });
  const capS = cap * s;
  const pen = Math.max(2.5, capS * 0.13);

  // Draw order = order of first appearance in the diagram text; each edge draws with its later endpoint
  const order = new Map(chart.nodes.map((n, i) => [n.id, i]));
  const groups: StrokeGroup[] = chart.nodes.map((n) => ({ strokes: [], cue: options[n.id]?.at, isTitle: false }));

  chart.nodes.forEach((n, i) => {
    const sz = sized.get(n.id)!;
    const pos = g.node(n.id);
    const c = T(pos);
    const w = sz.w * s;
    const h = sz.h * s;
    const color = options[n.id]?.highlight ? highlight : ink;
    const strokes = groups[i].strokes;
    strokes.push(...shapeStrokes(`${sceneId}-node-${n.id}`, n.shape, c, w, h, color, options[n.id]?.highlight ? pen * 1.35 : pen));
    const top = c.y - (sz.contentH * s) / 2;
    if (sz.icon) strokes.push(...iconStrokes(sz.icon, { x: c.x, y: top + (sz.iconSize * s) / 2 }, sz.iconSize * s, ink));
    const firstBaseline = top + (sz.iconSize ? (sz.iconSize + cap * 0.5) * s : 0) + capS * 1.05;
    sz.lines.forEach((line, k) => strokes.push(...textStrokes(line, font, capS, c.x, firstBaseline + k * capS * LINE, ink)));
  });

  chart.edges.forEach((e, i) => {
    const data = g.edge({ v: e.from, w: e.to, name: `e${i}` });
    let pts = (data.points ?? []).map(T);
    if (pts.length < 2) return;
    const from = sized.get(e.from)!;
    const to = sized.get(e.to)!;
    const cFrom = T(g.node(e.from));
    const cTo = T(g.node(e.to));
    // Simple connections (no routing around other nodes): one straight stroke between the two outlines,
    // the way a person draws it. Longer routes keep dagre's bends.
    const paired = chart.edges.some((o, k) => k !== i && ((o.from === e.from && o.to === e.to) || (o.from === e.to && o.to === e.from)));
    // Two arrows between the same nodes (a loop back) keep dagre's separate routes, or they would overlap
    if (pts.length <= 3 && !paired) pts = [cFrom, cTo];
    pts[0] = clipToShape(cFrom, from.w * s, from.h * s, from.node.shape, pts[1]);
    const end = clipToShape(cTo, to.w * s, to.h * s, to.node.shape, pts[pts.length - 2]);
    // Stop just short of the outline so the arrowhead does not overlap it
    const prev = pts[pts.length - 2];
    const len = Math.hypot(end.x - prev.x, end.y - prev.y) || 1;
    const back = pen * 1.6;
    pts[pts.length - 1] = { x: end.x - ((end.x - prev.x) / len) * back, y: end.y - ((end.y - prev.y) / len) * back };

    const strokes: Stroke[] = connectorStrokes(`${sceneId}-edge-${i}`, pts, e.arrow, ink, pen, Math.max(10, capS * 0.7));
    if (e.label) {
      // Next to the first stretch of the line, pushed out perpendicular to it on the outer side
      // (the side the line heads toward), so the label never touches the line
      const a = pts[0];
      const b = pts[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segLen = Math.hypot(dx, dy) || 1;
      const p = { x: a.x + dx * 0.45, y: a.y + dy * 0.45 };
      let n = { x: -dy / segLen, y: dx / segLen };
      const vertical = chart.direction === "TB" || chart.direction === "BT";
      const wantSign = vertical ? Math.sign(dx) || 1 : Math.sign(dy) || -1;
      if (Math.sign(vertical ? n.x : n.y) !== wantSign) n = { x: -n.x, y: -n.y };
      const labelCap = capS * 0.85;
      const lw = measureText(e.label, font, labelCap);
      // Distance from the line to the label center that clears the label's box in direction n
      const clear = Math.abs(n.x) * (lw / 2) + Math.abs(n.y) * (labelCap * 0.7) + capS * 0.35;
      const c = { x: p.x + n.x * clear, y: p.y + n.y * clear };
      strokes.push(...textStrokes(e.label, font, labelCap, c.x, c.y + labelCap * 0.5, highlight));
    }
    const owner = (order.get(e.from) ?? 0) > (order.get(e.to) ?? 0) ? e.from : e.to;
    // Arrows into a node draw before the node itself
    groups[order.get(owner)!].strokes.unshift(...strokes);
  });

  return { groups, scale: s };
};
