// Run: node --test scripts/lib/editor.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { safeJoin, validateConfig } from "../editor/validate.ts";
import type { VideoConfig } from "../../src/lib/types.ts";

test("file paths cannot escape their folder", () => {
  const base = "/srv/public";
  assert.equal(safeJoin(base, "audio/x/hook.mp3"), "/srv/public/audio/x/hook.mp3");
  assert.equal(safeJoin(base, "audio/x/hook.mp3?v=3"), "/srv/public/audio/x/hook.mp3");
  // ../ is normalized away inside the folder, never above it
  assert.equal(safeJoin(base, "../../etc/passwd"), "/srv/public/etc/passwd");
  assert.equal(safeJoin(base, "%2e%2e/%2e%2e/etc/passwd"), "/srv/public/etc/passwd");
  assert.equal(safeJoin(base, "a\0b"), null);
  assert.equal(safeJoin(base, "%E0%A4%A"), null);
});

const good = (): VideoConfig => ({
  id: "v1",
  brand: "btac",
  format: "SocialReel9x16",
  title: "T",
  scenes: [
    { id: "hook", text: "Hello there.", visual: { kind: "hook", kicker: "K", headline: "H" } },
    { id: "cta", text: "Call now.", visual: { kind: "cta" } },
  ],
});

test("a valid config passes", () => {
  assert.deepEqual(validateConfig(good(), "v1", ["btac"]), []);
});

test("broken configs are rejected with plain-language reasons", () => {
  const c = good();
  c.id = "other";
  c.brand = "nope";
  c.scenes[1].id = "hook";
  c.scenes[0].text = " ";
  const errors = validateConfig(c, "v1", ["btac"]);
  assert.ok(errors.some((e) => e.includes('must stay "v1"')));
  assert.ok(errors.some((e) => e.includes('Brand "nope" does not exist')));
  assert.ok(errors.some((e) => e.includes("same name")));
  assert.ok(errors.some((e) => e.includes("voice text is empty")));
  assert.deepEqual(validateConfig({ ...good(), scenes: [] }, "v1"), ["A video needs at least one scene"]);
  assert.ok(validateConfig({ ...good(), format: "Vertical" as never }, "v1").some((e) => e.includes("Unknown format")));
});
