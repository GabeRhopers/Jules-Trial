// Run: node --test scripts/lib/align.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPronunciations, charTimingsFromTokens, wordsFromCharTimings, type CharTiming } from "./align.ts";

const linear = (text: string, msPerChar = 50): CharTiming[] =>
  [...text].map((_, k) => ({ startMs: k * msPerChar, endMs: (k + 1) * msPerChar }));

test("pronunciations replace terms but keep captions on the original words", () => {
  const original = "Class one needs at least 18 µm per AAMA 611.";
  const spoken = applyPronunciations(original, [
    { term: "AAMA 611", say: "A-A-M-A six eleven" },
    { term: "µm", say: " microns" },
  ]);
  assert.equal(spoken.text, "Class one needs at least 18  microns per A-A-M-A six eleven.");
  const words = wordsFromCharTimings(original, spoken, linear(spoken.text), 5000);
  assert.deepEqual(words.map((w) => w.text), ["Class", "one", "needs", "at", "least", "18", "µm", "per", "AAMA", "611."]);
  // Times always move forward, and "AAMA" and "611." each get their own slice of the replacement
  for (let i = 1; i < words.length; i++) assert.ok(words[i].startMs >= words[i - 1].startMs, `word ${i} out of order`);
  assert.ok(words[9].startMs > words[8].startMs);
});

test("terms only match whole words", () => {
  assert.equal(applyPronunciations("HVACs and HVAC.", [{ term: "HVAC", say: "H-V-A-C" }]).text, "HVACs and H-V-A-C.");
  // A symbol term can attach to a number
  assert.equal(applyPronunciations("15°F", [{ term: "°F", say: " degrees" }]).text, "15 degrees");
});

test("words with no timing are placed between their neighbors", () => {
  const original = "one two three";
  const spoken = applyPronunciations(original, []);
  const timings = linear(spoken.text);
  for (let k = 4; k < 7; k++) timings[k] = null; // "two" has no timing
  const words = wordsFromCharTimings(original, spoken, timings, 1000);
  assert.ok(words[1].startMs >= words[0].endMs && words[1].endMs <= words[2].startMs);
});

test("token timings (Kokoro) map to words", () => {
  const original = "Book a tune-up now.";
  const spoken = applyPronunciations(original, []);
  const timings = charTimingsFromTokens(spoken.text.length, [
    { charStart: 0, charEnd: 4, startMs: 0, endMs: 300 },
    { charStart: 5, charEnd: 6, startMs: 320, endMs: 400 },
    { charStart: 7, charEnd: 14, startMs: 420, endMs: 900 },
    { charStart: 15, charEnd: 18, startMs: 950, endMs: 1200 },
    { charStart: 18, charEnd: 19, startMs: 1200, endMs: 1250 },
  ]);
  const words = wordsFromCharTimings(original, spoken, timings, 1400);
  assert.deepEqual(words.map((w) => [w.text, w.startMs]), [["Book", 0], ["a", 320], ["tune-up", 420], ["now.", 950]]);
});
