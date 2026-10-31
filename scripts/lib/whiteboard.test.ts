// Run: node --test scripts/lib/whiteboard.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Word } from "../../src/lib/types.ts";
import { findCues, MIN_DRAW_MS, PEN_GAP_MS, scheduleGroups, strokeWindows } from "../../src/whiteboard/timing.ts";

/** One word every 400 ms, each 300 ms long */
const words = (text: string): Word[] => text.split(" ").map((t, i) => ({ text: t, startMs: i * 400, endMs: i * 400 + 300 }));

test("cue words match in order, ignoring case, accents and punctuation", () => {
  const w = words("First, CLEAN the part. Then clean it again and seal. Peça selada.");
  assert.deepEqual(findCues(["clean", "clean", "seal", "peca"], w, "s"), [400, 2000, 3600, 4000]);
  assert.deepEqual(findCues([undefined, "seal"], w, "s"), [undefined, 3600]);
});

test("a cue that is not spoken (or comes before the previous cue) fails with a clear message", () => {
  const w = words("clean then seal");
  assert.throws(() => findCues(["rinse"], w, "process"), /scene "process": cue word "rinse" is not in the narration/);
  assert.throws(() => findCues(["seal", "clean"], w, "process"), /cue word "clean"/);
});

test("cued groups start on their word; drawings never overlap and keep a pen gap", () => {
  const w = words("one two three four five six seven eight nine ten");
  const res = scheduleGroups(
    [
      { cue: "two", naturalMs: 2000 },
      { cue: "four", naturalMs: 500 },
      { cue: "nine", naturalMs: 500 },
    ],
    w,
    5000,
    "s",
  );
  assert.equal(res[0].startMs, 400);
  // The first drawing is cut short so the second one can start on "four" (1200 ms)
  assert.equal(res[0].endMs, 1200 - PEN_GAP_MS);
  assert.ok(res[0].compressed);
  assert.equal(res[1].startMs, 1200);
  assert.equal(res[1].endMs, 1700);
  assert.equal(res[2].startMs, 3200);
});

test("uncued groups are spread evenly, after the title has time to finish", () => {
  const w = words("a b c d e f g h i j k");
  const res = scheduleGroups(
    [
      { fixedMs: 150, naturalMs: 1000 },
      { naturalMs: 400 },
      { naturalMs: 400 },
      { naturalMs: 400 },
    ],
    w,
    5000,
    "s",
  );
  assert.equal(res[0].startMs, 150);
  assert.equal(res[1].startMs, 150 + 1000 + PEN_GAP_MS);
  const gaps = [res[2].startMs - res[1].startMs, res[3].startMs - res[2].startMs];
  assert.ok(Math.abs(gaps[0] - gaps[1]) < 1, `uneven spacing ${gaps}`);
  for (let i = 1; i < res.length; i++) assert.ok(res[i].startMs >= res[i - 1].endMs, "overlap");
});

test("very close cues still get the minimum drawing time", () => {
  const w = words("a b");
  const res = scheduleGroups(
    [
      { cue: "a", naturalMs: 900 },
      { cue: "b", naturalMs: 900 },
    ],
    w,
    3000,
    "s",
  );
  assert.equal(res[0].endMs - res[0].startMs, MIN_DRAW_MS);
  assert.ok(res[1].startMs >= res[0].endMs + PEN_GAP_MS);
});

test("stroke windows follow stroke length and fill the group window", () => {
  const spans = strokeWindows([100, 300], { startMs: 0, endMs: 1000 }, 0);
  assert.deepEqual(spans, [
    [0, 250],
    [250, 1000],
  ]);
  const withLift = strokeWindows([100, 100], { startMs: 0, endMs: 1000 }, 100);
  // 100 + lift 100 + 100 = 300 units over 1000 ms
  assert.ok(Math.abs(withLift[1][0] - 666.67) < 0.1);
  assert.ok(Math.abs(withLift[1][1] - 1000) < 0.01);
});
