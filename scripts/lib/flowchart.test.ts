// Run: node --test scripts/lib/flowchart.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFlowchart } from "../../src/whiteboard/flowchart.ts";

test("reads direction, shapes, labels and edge text", () => {
  const f = parseFlowchart(`
    flowchart LR
      %% a comment
      T{"Thermostat on heat?"} -->|No| S[Switch to heat]
      T -- Yes --> F{Filter dirty?}
      F -->|Yes| R([Replace filter]); F -.->|No| P((Call a pro))
  `);
  assert.equal(f.direction, "LR");
  assert.deepEqual(
    f.nodes.map((n) => [n.id, n.shape, n.label]),
    [
      ["T", "decision", "Thermostat on heat?"],
      ["S", "box", "Switch to heat"],
      ["F", "decision", "Filter dirty?"],
      ["R", "pill", "Replace filter"],
      ["P", "circle", "Call a pro"],
    ],
  );
  assert.deepEqual(
    f.edges.map((e) => [e.from, e.to, e.label, e.arrow, e.dashed]),
    [
      ["T", "S", "No", true, false],
      ["T", "F", "Yes", true, false],
      ["F", "R", "Yes", true, false],
      ["F", "P", "No", true, true],
    ],
  );
});

test("chains, plain lines, TD default and node reuse by id", () => {
  const f = parseFlowchart("A[Quote] --> B(Clean) --> C[Seal]\nC --- A");
  assert.equal(f.direction, "TB");
  assert.deepEqual(f.nodes.map((n) => n.id), ["A", "B", "C"]);
  assert.equal(f.nodes[1].shape, "rounded");
  assert.deepEqual(f.edges.map((e) => `${e.from}${e.arrow ? ">" : "-"}${e.to}`), ["A>B", "B>C", "C-A"]);
});

test("unsupported syntax fails with a clear message", () => {
  assert.throws(() => parseFlowchart("flowchart TD\nsubgraph One\nA-->B\nend"), /"subgraph One" is not supported/);
  assert.throws(() => parseFlowchart("A --> B & C"), /"&" is not supported/);
  assert.throws(() => parseFlowchart("A[Open --> B"), /missing "\]"/);
  assert.throws(() => parseFlowchart("A ~~ B"), /expected an arrow/);
});
