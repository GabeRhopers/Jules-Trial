# Video production workspace

Brand-consistent marketing videos with animated text, narration and captions, built with Remotion
(React). Narration: Kokoro (free, local) or ElevenLabs (paid). Optional AI B-roll: Higgsfield (paid, MCP).
Main users: a marketing specialist (B2B tech and industrial clients, B2C home services) and an
operations/IT project manager.

**To make a video, use `/new-video`.** It walks through brief, script, narration, B-roll, preview and render.

## Cost rules (always follow)
- **ElevenLabs costs credits.** Never run `scripts/narrate.ts` with the ElevenLabs provider unless the user approved that run in this conversation. Show the script's character and credit estimate first. Never pass `--yes` without that approval.
- **Kokoro is free** (local). Use it for drafts and previews without asking.
- **Higgsfield costs credits on every generation.** Before generating: show the shot list (prompt, model, duration, aspect ratio, estimated credits) and wait for explicit approval. Never retry or regenerate without asking again.
- Save Higgsfield downloads to `public/broll/<video-id>/` and log every prompt in `videos/<video-id>/broll.md`.
- Never ask for API keys in chat. Keys live in `.env` (git-ignored); see `.env.example`.

## Folder structure
```
brands/<brand-id>/           brand.json, logo.svg, fonts/ (one folder per client)
videos/<video-id>/           config.json (scenes: narration + visuals), script.md, broll.md
public/audio/<video-id>/     generated narration + manifest.json (git-ignored, reproducible)
public/broll/<video-id>/     footage and AI clips (git-ignored)
public/music/                music beds + README.md with each track's license
out/<brand-id>/              rendered MP4 + SRT (git-ignored)
src/compositions/            SocialReel9x16, Explainer16x9, PromoSquare1x1, VideoShell (shared frame), scenes/
src/whiteboard/              optional whiteboard scene: WhiteboardScene, Marker, geometry, diagram (flowcharts), flowchart (Mermaid reader),
                             timing, icons.json, fonts.json
src/components/              AnimatedTitle, KineticCaptions, LowerThird, StatCounter, NumberBadge, LogoReveal,
                             CtaEndCard, BRollSlot, MusicBed (ducking), ProgressBar, BrandBackground, QcProbe
src/lib/                     types, timeline (narration-driven timing), registry (auto-discovery), fonts, motion, safe zones
scripts/                     narrate, qc, render, make-srt, new-video, new-brand, validate-brand, placeholder-narration,
                             find-icon, build-whiteboard-assets
.claude/skills/new-video/    the /new-video workflow and script rules
```
Every `videos/*/config.json` and `brands/*/brand.json` is discovered automatically. The composition id is the video id.

## How a video is built
1. `npm run video:new -- <id> --brand=<brand> --format=<format>` creates the folder; fill in `config.json`.
2. `npm run narrate -- <id>` makes per-scene MP3s + word timestamps (cached by text and voice settings).
3. Scene length = its narration length + 0.25 s; the last scene holds 1.5 s; transitions 0.4 s (`src/lib/timeline.ts`). **Never hardcode scene durations.** Editing narration text without regenerating makes rendering stop with "Narration is out of date".
4. `npm run dev` opens Remotion Studio. `brandId` prop previews any video in any brand; `showSafeZones` shows platform UI areas.
5. `node scripts/qc.ts <id>` then `npm run render:video -- <id>`.

## Brand rules
- Components never contain brand-specific code. Everything comes from `brand.json` via `useBrand()`: colors, fonts, logo, `style` (cornerRadius, headlineCase, motion bold/calm, background glow/grid, transition), `captionStyle` (highlight box/color), voice, pronunciations, default CTA.
- New brand: `npm run brand:new -- <id> --name="Client"`, edit `brand.json`, replace the logo, then `npm run brand:check -- <id>` (fields, fonts, logo, contrast).
- `style.background`: `glow`, `grid` or `hearts` (glow plus floating hearts, for personal or celebration videos).
- Fonts: a Google Font listed in `src/lib/font-map.ts` (add one line for a new one), or licensed WOFF2 files in `brands/<id>/fonts/` (only if the font license allows video embedding).
- Logos: SVG with text converted to outlines, or with the font embedded.
- Add product names, standards and technical terms to `pronunciations` (the voice says `say`, captions show `term`).

## Whiteboard scenes (optional)
- Scene kind `whiteboard`: `{ "kind": "whiteboard", "title": "...", "layout": "flow" | "free" | "diagram", "items": [{ "icon", "label", "at", "circle", "x", "y", "size" }] }`.
  `flow` (default) puts up to 4 items in a row joined by hand-drawn arrows; `free` places each item by `x`/`y`/`size` (% of the scene area).
- `layout: "diagram"`: a **Mermaid flowchart** in `"diagram"` (decisions, branches, labeled arrows), laid out automatically (dagre) and drawn by hand. Per-node options in `"nodes"`: `{ "<id>": { "at", "icon", "highlight" } }`. Each node and the arrows into it draw on the node's cue word. Supported syntax: `flowchart TD|LR|BT|RL`, `A[Box] A(Rounded) A([Pill]) A((Circle)) A{Decision}`, `-->`, `---`, `-.->`, `==>`, `-->|label|`, `-- label -->`, chains. Not supported (clear error): subgraph, styles, `&`. Example: `videos/furnace-no-heat-whiteboard`.
  Keep diagrams to 4 to 6 nodes (reels: TD direction, 2 to 3 words per node, no icons inside decisions); QC warns when a diagram has to shrink so much that its text is under 28 px tall (at 1080p).
- Each item starts drawing when its `at` word is spoken (matched in order, ignoring case, accents and punctuation). A cue that is not in the narration stops the render with a clear error. Items without `at` are spread evenly.
- Icons: any of the 5,203 Tabler outline icons (`npm run icon -- <keyword>`). Handwriting: single-line fonts, so letters are written stroke by stroke (Portuguese accents included).
- Brand look (all optional) in `brand.json` → `whiteboard`: `paper`, `ink`, `highlight` (circles and underlines; default = primary color), `font` (`marker`, `clean`, `script`), `hand` (your own hand PNG: `file`, `tipX`/`tipY` in % of the image, `height` px at 1080p). Without `hand`, a built-in vector marker is used.
- Never use a hand image you did not make or license. AI-generated hands can be used but are not copyright-protected (US Copyright Office, Jan 2025); a photo of your own hand is the safest.
- Script rules for whiteboard scenes are in `.claude/skills/new-video/script-rules.md`.

## Diagrams outside videos
- For standalone diagrams (process maps, HubSpot workflow sketches, client approvals), write **Mermaid** first: it renders in GitHub, Notion and the draw.io plugin, and the same text can become a whiteboard `diagram` scene.
- Optional: the official draw.io plugin for Claude Code (Apache-2.0, by jgraph) creates editable `.drawio` files: `/plugin marketplace add jgraph/drawio-mcp` then `/plugin install drawio@drawio`. It is not enabled for this project automatically; each user installs it themselves.

## Quality checklist (before any delivery)
- [ ] `node scripts/qc.ts <id>` passes: text inside safe zones, no overflow, captions never overlap other text, captions in sync with narration, caption size readable on a phone, contrast OK, no empty B-roll slots. For whiteboard scenes it also checks the drawing stays in the safe zone, ink/highlight contrast on the paper, and warns when cue words are too close together.
- [ ] Hook lands in the first 3 seconds; one clear CTA at the end.
- [ ] Every number and claim confirmed by the client (demo placeholders removed).
- [ ] Pronunciations checked by listening (brand names, standards, numbers).
- [ ] Music is licensed and logged in `public/music/README.md`; it ducks under the voice.
- [ ] Watched once in full with sound, and once muted (captions alone must carry the message).

## Render settings
- `npm run render:video -- <id>`: H.264, CRF 16, yuv420p, BT.709 color, PNG frames, AAC audio, 30 fps, plus an SRT file. Output: `out/<brand>/<id>.mp4` and `.srt`.
- Sizes: SocialReel9x16 1080x1920, Explainer16x9 1920x1080, PromoSquare1x1 1080x1080.
- Use `--brand=<id>` to render a video in another brand.

## Commands
| Task | Command |
|---|---|
| New video folder | `npm run video:new -- <id> --brand=<brand> --format=<format>` |
| Narration | `npm run narrate -- <id> [--provider=kokoro\|elevenlabs] [--force]` |
| Silent test narration | `npm run narrate:placeholder -- <id>` |
| Preview | `npm run dev` |
| Quality check | `npm run qc -- <id> [--allow-placeholders] [--brand=<id>]` |
| Render MP4 + SRT | `npm run render:video -- <id> [--brand=<id>]` |
| New brand / check brand | `npm run brand:new -- <id> --name="..."` / `npm run brand:check -- <id>` |
| Find a whiteboard icon | `npm run icon -- <keyword>` |
| Rebuild whiteboard icons/fonts (after upgrading @tabler/icons) | `npm run whiteboard:assets` |
| Unit tests | `npm test` |

## Known limits
- `npx remotion compositions` (list all) fails if any video has no narration yet; rendering a single video by id works.
- ElevenLabs endpoint/models/credit rates, Kokoro voice names and the Higgsfield MCP URL were verified against official docs on 2026-10-29 (see SETUP_LOG.md). Anything still marked "NOT VERIFIED" must be checked before relying on it.
- Remotion license: free for teams of up to 3; see `LICENSE_NOTES.md` before each new client.
