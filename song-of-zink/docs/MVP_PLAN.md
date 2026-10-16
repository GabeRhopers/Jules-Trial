# The Song of Zink: MVP plan

A 2D metroidvania that runs in the browser. It has Silksong-style movement and combat, and Zelda-style items that open new paths.

## Goal of the MVP

You can play the whole game in a browser from start to finish (about 15 to 25 minutes):
walk, fight, find the hookshot and the bombs, unlock new paths, and beat the boss.
Levels and tuning are plain text files, so you can change them without touching game code.

## Decisions taken (defaults, change any time)

| Topic | Decision | Why |
|---|---|---|
| Engine | Phaser 3 (MIT), bundled into one HTML file | Runs in any browser, no install |
| Art | Pixel art drawn by code | No downloads or licenses needed; swappable later |
| Levels | One text file per room (`rooms/*.txt`) + `rooms/world.json` | Edit a room by editing characters |
| Tuning | `src/config.js` | All numbers (speed, jump, damage, boss HP) in one place |
| Save | Browser storage, at benches and on pickups | Progress survives a reload |
| Controls | Keyboard, plus touch buttons on phones (added after the MVP) | Gamepad is out of scope |
| Repo | `jules-trial`, branch `claude/song-of-zink`, folder `song-of-zink/` | No new repo needed |

### Controls

| Key | Action |
|---|---|
| ← → | Move |
| Z or Space | Jump (hold for higher, press against a wall to wall jump) |
| X | Needle attack (hold ↑ to aim up, ↓ in the air to pogo) |
| C | Dash (one air dash per jump) |
| A | Hookshot (after you find it) |
| S | Bomb (after you find it) |
| D (hold) | Song heal: costs 3 song notes, restores 1 heart |
| ↑ | Rest at a bench (heals and saves) |

## World

```
[1 Awakening Cave]---[2 Root Corridor]---[3 Hookshot Chamber]---[4 Chasm Garden]
        |                                                               |
        +==== shortcut gate (opened from room 5) ====[5 Bell Bench]-----+
                                                          |
                                     [6 Bomb Forge]-------+
                                           |
                                    [7 Cracked Vault]---[8 Warden Arena]
```

| Room | What happens | Gate |
|---|---|---|
| 1 Awakening Cave | Start, movement tutorial, first bench | None |
| 2 Root Corridor | First enemies; a cracked wall hides a heart vessel | Secret needs bombs |
| 3 Hookshot Chamber | Get the hookshot, swing over a spike pit | Exit needs hookshot |
| 4 Chasm Garden | Hookshot chain over spikes, then a wall-jump shaft | Needs hookshot + wall jump |
| 5 Bell Bench | Bench; lever opens a shortcut back to room 1 | None |
| 6 Bomb Forge | Get the bombs; blast the cracked exit wall | Exit needs bombs |
| 7 Cracked Vault | Bench; bomb the vault to get the key; key opens the boss door | Needs bombs + key |
| 8 Warden Arena | Boss: Warden of the Bell | None |

## Step-by-step build plan

Each step ends with a check that must pass before moving on.

1. **Project setup.** Phaser, esbuild, Playwright; build script that outputs one HTML file.
   *Check:* `npm run build` produces `dist/index.html`.
2. **Room format + validator.** Parse `rooms/*.txt`, check equal row widths, known characters, door links, every room reachable, key items present once.
   *Check:* `npm test` passes on all 8 rooms.
3. **Generated art.** Player, tiles, spikes, enemies, boss, items, UI icons drawn in code.
   *Check:* game boots with no console errors.
4. **Player movement.** Run, variable jump, coyote time, jump buffer, wall slide, wall jump, dash.
   *Check:* scripted input moves and lifts the player.
5. **Needle combat.** Side, up and down attacks; pogo; enemy hits fill the song meter; song heal.
   *Check:* attack damages an enemy; pogo bounces.
6. **Rooms and progression.** Doors between rooms, bench rest and save, death and respawn, spikes with safe-spot respawn, pickups, lever gate, key door.
   *Check:* walking through a door loads the linked room; progress survives a reload.
7. **Zelda items.** Hookshot (pull to rings, stun enemies) and bombs (break cracked walls, hurt enemies and boss armor).
   *Check:* hookshot moves the player to a ring; a bomb removes a cracked wall.
8. **Enemies.** Crawler (patrols, turns at edges) and flyer (chases, can be stunned).
9. **Boss.** Warden of the Bell: charge, falling bells, slam with shockwaves; phase 2 armor that only bombs break; victory screen.
   *Check:* the boss can be defeated; the victory screen shows.
10. **HUD + minimap.** Hearts, song notes, items, minimap of visited rooms, banners, boss health bar.
11. **Page + publish.** Game page with controls and a New game button; publish as a private link.
12. **Docs.** README with how to play, edit rooms, tune, and test.

## Not in the MVP

Story or dialog, sound and music, shops, more areas, a visual level editor, gamepad support.

## Next steps after the MVP

1. Swap code-drawn art for a CC0 pack (Kenney or Gothicvania).
2. Add sound.
3. Use LDtk to draw rooms visually.
4. Add more areas and items.
