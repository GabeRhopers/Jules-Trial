// Reads the flowchart part of Mermaid syntax (mermaid.js.org/syntax/flowchart.html), so whiteboard
// diagrams can be written the same way as diagrams in GitHub, Notion or the draw.io plugin.
// Pure functions, no imports: unit tested in scripts/lib/flowchart.test.ts.
//
// Supported:
//   flowchart TD | TB | BT | LR | RL      (also `graph ...`; default TD)
//   A[Box]  A(Rounded)  A([Pill])  A((Circle))  A{Decision}  A[[Box]]   text may be "quoted"
//   A --> B   A --- B   A -.-> B   A ==> B   A -->|label| B   A -- label --> B   A --> B --> C
//   one statement per line or separated by ";"   %% comments
// Not supported (fails with a clear message): subgraph, classDef/style/class, click, "&" fan-out.

export type NodeShape = "box" | "rounded" | "pill" | "circle" | "decision";
export type FlowDirection = "TB" | "BT" | "LR" | "RL";
export type FlowNode = { id: string; label: string; shape: NodeShape };
export type FlowEdge = { from: string; to: string; label?: string; arrow: boolean; dashed: boolean };
export type Flowchart = { direction: FlowDirection; nodes: FlowNode[]; edges: FlowEdge[] };

const SHAPES: [open: string, close: string, shape: NodeShape][] = [
  ["((", "))", "circle"],
  ["([", "])", "pill"],
  ["[[", "]]", "box"],
  ["[", "]", "box"],
  ["(", ")", "rounded"],
  ["{", "}", "decision"],
];

const EDGE = /^(-\.->|-\.-|-->|---|==>|===)\s*(?:\|([^|]*)\|)?/;
const EDGE_WITH_TEXT = /^(--|==|-\.)\s+([^>|]+?)\s+(-->|==>|---|===|\.->|-\.->)/;

const clean = (s: string) => s.trim().replace(/^"(.*)"$/s, "$1").replace(/<br\s*\/?>/gi, " ").trim();

export const parseFlowchart = (source: string): Flowchart => {
  const lines = source
    .replace(/%%.*$/gm, "")
    .split(/[\n;]/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error("Whiteboard diagram is empty");

  let direction: FlowDirection = "TB";
  const header = lines[0].match(/^(flowchart|graph)(?:\s+(TD|TB|BT|LR|RL))?$/i);
  if (header) {
    const d = (header[2] ?? "TD").toUpperCase();
    direction = (d === "TD" ? "TB" : d) as FlowDirection;
    lines.shift();
  }

  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];

  for (const line of lines) {
    if (/^(subgraph|end|classDef|class|style|click|linkStyle|direction)\b/.test(line)) {
      throw new Error(`Whiteboard diagram: "${line}" is not supported (only nodes and arrows). Remove it.`);
    }
    let rest = line;
    const readNode = (): string => {
      const m = rest.match(/^([A-Za-z0-9_][\w-]*)/);
      if (!m) throw new Error(`Whiteboard diagram: expected a node id at "${rest}" (in "${line}")`);
      const id = m[1];
      rest = rest.slice(id.length);
      let label: string | undefined;
      let shape: NodeShape = "box";
      for (const [open, close, s] of SHAPES) {
        if (!rest.startsWith(open)) continue;
        const end = rest.indexOf(close, open.length);
        if (end < 0) throw new Error(`Whiteboard diagram: missing "${close}" after node "${id}" (in "${line}")`);
        label = clean(rest.slice(open.length, end));
        shape = s;
        rest = rest.slice(end + close.length);
        break;
      }
      const existing = nodes.get(id);
      if (!existing) nodes.set(id, { id, label: label ?? id, shape });
      else if (label !== undefined) Object.assign(existing, { label, shape });
      rest = rest.trimStart();
      return id;
    };

    let from = readNode();
    while (rest.length > 0) {
      if (rest.startsWith("&")) throw new Error(`Whiteboard diagram: "&" is not supported, write one arrow per line (in "${line}")`);
      let m = rest.match(EDGE);
      let label: string | undefined;
      let token: string;
      if (m) {
        token = m[1];
        label = m[2] ? clean(m[2]) : undefined;
      } else {
        m = rest.match(EDGE_WITH_TEXT);
        if (!m) throw new Error(`Whiteboard diagram: expected an arrow like --> at "${rest}" (in "${line}")`);
        token = m[3];
        label = clean(m[2]);
      }
      rest = rest.slice(m[0].length).trimStart();
      const to = readNode();
      edges.push({ from, to, label: label || undefined, arrow: token.endsWith(">"), dashed: token.includes(".") });
      from = to;
    }
  }
  if (nodes.size === 0) throw new Error("Whiteboard diagram has no nodes");
  return { direction, nodes: [...nodes.values()], edges };
};
