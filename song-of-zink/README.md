# The Song of Zink

A small browser metroidvania inspired by Hollow Knight: Silksong (fast movement and needle combat) and Zelda (items that open new paths). Everything is original: code-drawn pixel art, no assets from either game.

The full plan is in [docs/MVP_PLAN.md](docs/MVP_PLAN.md).

## Play

- Online: open the published link.
- Locally: `npm install`, `npm run build`, then open `dist/play.html` in a browser.

| Key | Action |
|---|---|
| ← → | Move |
| Z or Space | Jump (hold for higher). Against a wall: wall jump |
| X | Needle. Hold ↑ to aim up, ↓ in the air to pogo |
| C | Dash (one in the air) |
| A | Hookshot (once found) |
| S | Bomb (once found) |
| D (hold) | Song heal: 3 notes for 1 heart |
| ↑ | Rest at a bench (heals and saves) |

### On a phone

Open the link and turn the phone sideways. Touch buttons appear automatically on touchscreens (the **Show/Hide touch buttons** button switches them on any device).

- Left: the pad. Push it to move, up to rest at a bench or aim up, down in the air to pogo.
- Right: JUMP, ATK, DASH, HEAL. HOOK and BOMB appear once you find those items.
- A Bluetooth keyboard also works.

Progress is saved in the browser at benches and on pickups. The **New game** button below the game clears it.

## Edit the world

Rooms are plain text files in `rooms/`. One character is one 16x16 tile.

| Char | Meaning | Char | Meaning |
|---|---|---|---|
| `#` | Wall | `.` | Empty |
| `P` | Player start (start room only) | `S` | Bench |
| `E` | Crawler enemy | `F` | Flyer enemy |
| `W` | Warden boss | `H` | Hookshot ring |
| `B` | Cracked wall (bombs) | `^` | Spikes |
| `K` | Hookshot item | `O` | Bombs item |
| `+` | Heart vessel | `k` | Vault key |
| `D` | Boss door (needs key) | `G` | Gate (opened by lever) |
| `L` | Lever | `1`-`9` | Door to another room |

- Doors are a column of the same digit on the left or right edge of a room.
- `rooms/world.json` links doors (`["r1:1", "r2:1"]` means door 1 of r1 leads to door 1 of r2), names rooms, places them on the minimap, and holds the hint texts.
- Add a room: create `rooms/r9.txt`, list it in `world.json`, and link one of its doors.
- Lines starting with `;` in a room file are comments.
- A hint can have a `touch` text that replaces `text` when touch buttons are on.

Jump math, so rooms stay playable: a jump reaches about 3.5 tiles up and about 6 tiles across (about 9 with a dash). Gaps wider than that need the hookshot.

All tuning numbers (speeds, jump height, damage, boss HP and attacks) are in `src/config.js`.

After any change: `npm run check`. It validates every room, builds, and plays the key paths in a headless browser.

## Tests

| Command | What it checks |
|---|---|
| `npm test` | Room files: row widths, known characters, door links, every room reachable, key items present once |
| `npm run smoke` | Plays in Chromium: movement, combat, doors, both hookshot chains, the wall-jump shaft, lever, bombs, saving, spikes, death, the boss, and touch controls on an emulated phone |
| `npm run check` | All of the above plus the build |

Screenshots from the last smoke run are saved in `test-output/`.

## Code map

| File | Role |
|---|---|
| `src/config.js` | Tuning numbers |
| `src/rooms.js` | Room parser and world validator (shared with tests) |
| `src/boot-scene.js` | Code-drawn art |
| `src/player.js` | Movement, needle, hookshot, heal, damage |
| `src/enemies.js` | Crawler and flyer |
| `src/boss.js` | Warden of the Bell |
| `src/game-scene.js` | Room building, doors, items, bombs, benches, boss arena |
| `src/ui-scene.js` | Hearts, song notes, items, minimap, banners, boss bar, victory screen |
| `src/touch.js` | On-screen pad and buttons for phones |
| `src/page.html` | Page around the game |
| `build.mjs` | Bundles everything into one HTML file |

## Credits

Built with [Phaser 3](https://phaser.io) (MIT License).
