# Brief: add a Metroidvania mode to Rhopers Game Maker

For the Claude session working in `GabeRhopers/CODEX` (branch `claude/mario-maker-editor-plan-cgyxrl`).
Written from a separate session that built "The Song of Zink", a small browser metroidvania,
and reviewed this repo's code and docs (it did not run this repo's tests or look at its screens).

Read `CLAUDE.md` first. Everything below must follow it. Where this brief and the code disagree,
the code wins: check, push back, and ask Gabriel.

## Goal

Add an optional **Metroidvania** game type next to today's Platformer, so Gabriel can build games
like The Song of Zink with this tool's editor instead of editing text files. Platformer games must
behave exactly as today: every existing spec passes untouched.

## The reference game (read-only)

- Play: https://claude.ai/artifact/M2RcgPNF6RvArh9qm5aEHj (private to Gabriel; ask him for screenshots if needed)
- Source: https://github.com/GabeRhopers/Jules-Trial/tree/claude/song-of-zink/song-of-zink (Phaser 3.90, plain JS, esbuild)
- Key files: `src/config.js` (all tuning numbers), `src/player.js` (moves), `src/game-scene.js`
  (rooms, doors, items, bombs, benches, boss arena), `src/boss.js`, `src/rooms.js` (room format and
  validator), `rooms/*.txt` + `rooms/world.json` (the 8-room world), `src/input.js` (touch + gamepad).
- Same author (Gabriel). Ideas and logic may be reused freely. Do not copy files wholesale: the
  foundations differ (JS vs TS, 16px scrolling rooms vs 32px fixed screens, separate input systems).

## Constraints this must respect (from CLAUDE.md)

- Fixed 1050 x 468 canvas. **Levels stay one screen and the camera never scrolls.** A metroidvania
  is built from one-screen rooms with edge exits (walk off an edge, the next screen appears), like
  the original Zelda dungeons. Do not add scrolling.
- New rules go in Phaser-free modules with unit tests (like `PlayerStats.ts`, `gamepad.ts`).
- Schema additions are optional fields, so old saves load with zero migration (the pattern
  `LevelData`/`LevelArea` already use).
- Never announce a save that has not landed. Poll, never fixed waits, in e2e tests. Mutation-check
  new assertions. Look at screenshots.
- Do not grow `PlayScene.ts` (2,139 lines) more than needed; add pieces with few wires.

## What already exists that the mode can build on

- Up to 3 linked screens per level (main/sub/up, joined by basket teleports).
- Worlds with a world map (`src/world/`), games as ordered worlds (`GameSchema.ts`), a per-run state (`gameRun.ts`).
- Keys and chests, checkpoints, double jump (Chicken Slipper), an attack (PJ Thunder Hat), speed, shield.
- Touch controls, gamepads, co-op, publishing, the sprite painter, music.

## Design proposal (confirm with Gabriel before building)

1. **Game type.** `GameData.mode?: "platformer" | "metroidvania"`, absent = platformer.
2. **Rooms and exits.** In a metroidvania game, each level (or area) is a room. Rooms connect through
   edge exits: an exit marker on a screen edge, linked in the editor to an exit in another room.
   Store links as data (Zink uses pairs like `["r1:1", "r2:1"]` in `world.json`). The world map
   shows visited rooms and the current one.
3. **Abilities persist.** Once collected, an ability stays for the whole run (today power-ups reset
   per level). Keep it in run state, saved with the game.
4. **Save points.** A bench marker: press Up to rest, heal, and save. Death returns to the last bench
   with abilities kept.
5. **New placeables:** cracked wall (bombs break it), hook ring (hookshot target), ability pickups,
   bench, boss door (needs key), lever + gate (one-way shortcut).
6. **New moves**, each a separate step, each optional per game:
   - Wall slide + wall jump (full height, not cut by releasing jump, like Hollow Knight).
   - Dash (one in the air, reset on ground, wall or hook).
   - Needle attack aimed side/up/down, with pogo (down-hit bounces off enemies and spikes).
     Could replace or sit beside the Thunder Hat attack.
   - Hookshot: pull to the nearest ring in range, keep the swing's momentum after the pull,
     don't re-grab the ring just left. With no ring, the chain stuns an enemy.
   - Bombs: break cracked walls, damage enemies and boss armor.
   - Song heal (optional): hits fill a meter, hold to turn 3 notes into 1 heart.
7. **Boss.** A placeable "Warden" style boss: charge, falling bells, slam with shockwaves; at half
   health it grows armor that only bombs crack. The arena locks until it is beaten.
8. **Kid-friendly by default.** Gentle tuning and forgiving gaps unless the game says otherwise
   (ask Gabriel which default he wants).

## Lessons from building Zink (save yourself the debugging)

- **Merge solid tiles into large bodies.** One Arcade body per 16px tile left seams that snagged the
  player halfway up walls and broke wall jumps. Merging same-type cells into rectangles fixed it.
  Check how this repo builds ground bodies before adding wall jump.
- **After a hookshot pull, briefly ignore the arrow keys** (Zink: 220 ms), or run code zeroes the
  forward momentum when no key is held and hook chains cannot cross gaps.
- **Wall jumps must ignore the jump-cut rule**, or tapping jump climbs almost nothing.
- **Leave a 2-tile walkway under a wall-jump shaft's wall**, not 3, or the first jump drifts under
  the wall instead of touching it.
- **Spikes:** damage, then return the player to the last safe ground spot (not to the checkpoint).
- A scripted bot climbing a wall-jump shaft is timing-sensitive under software WebGL; bound it with
  conditions, as CLAUDE.md says, and allow retries only where a human would retry.

## Reference numbers (Zink, in 16px tiles; re-tune for 32px tiles and this repo's GRAVITY_Y = 1100)

Gravity 1300, run 150 px/s, jump 390 px/s (about 3.6 Zink tiles), coyote 90 ms, jump buffer 110 ms,
wall slide 70 px/s, wall jump 190 x / 360 y with a 160 ms input lock, dash 360 px/s for 150 ms
(cooldown 420 ms), invulnerability 1000 ms, hookshot range 175 px, pull 430 px/s, pop 130 x / -250 y,
bomb fuse 1000 ms, radius 36 px. Boss 20 HP, armor at 10 HP, armor break 5 s.

Zink's world (8 rooms) maps to about 10 one-screen rooms: most rooms are 640 px wide like a
20-column screen here; the tall Chasm Garden splits into 2 or 3 screens.

## Suggested order (each step: plan, tests, build, screenshots, Gabriel approves)

1. `mode` field + edge exits + room links in the editor + world map of visited rooms.
2. Persistent abilities in run state + bench save/respawn.
3. Wall jump and dash (ground-body seams checked first).
4. Needle attack with pogo.
5. Hookshot + hook rings.
6. Bombs + cracked walls, lever + gate, boss door + key.
7. The boss.
8. Rebuild Song of Zink with the tool as the demo metroidvania game.

## Decisions to ask Gabriel before starting

1. Confirm this direction (Metroidvania mode in the maker instead of a separate Zink editor).
2. Repo layout: this maker lives on `claude/mario-maker-editor-plan-cgyxrl`, while `main` holds the
   TheXTech experiment. Should the maker become `main`?
3. Default difficulty for the mode: kid-friendly or closer to Zink.
4. Does the Needle replace the Thunder Hat attack in metroidvania games, or sit beside it?
