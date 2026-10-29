# Setup Log

Running record of every command, decision, and manual step for the video production workspace.

## Phase 1: Prerequisites check (2026-10-29)

### Environment
- Runs in a **Claude Code cloud container** (claude.ai/code), not on the user's own computer.
- OS: Ubuntu 24.04.5 LTS, x86_64. Running as root (no sudo needed in this container).

### Commands run
| Command | Result |
|---|---|
| `cat /etc/os-release`, `uname -m` | Ubuntu 24.04.5 LTS, x86_64 |
| `node --version` | v22.22.0 (LTS "Jod", Maintenance LTS, end of life 2027-04-30) |
| `npm --version` / `npx --version` | 10.9.4 |
| `bun --version` | 1.4.4 |
| `ffmpeg -version` / `ffprobe -version` | 6.1.1 (Ubuntu package) |
| `git --version` | 2.43.0 |
| `claude --version` | 2.1.312 (Claude Code) |
| `dpkg -s <libs>` | All Chrome Headless Shell runtime libs present (dev headers `libxkbcommon-dev`, `libgbm-dev` absent, but runtime `libxkbcommon0` and `libgbm1` are installed) |
| `curl registry.npmjs.org/create-video/latest` | create-video / remotion latest = 4.0.539 |

### Docs checked
- remotion.dev: **blocked** by this session's network policy. Read the same official docs from the Remotion GitHub repo instead (`remotion-dev/remotion/packages/docs`).
- elevenlabs.io, higgsfield.ai, mcp.higgsfield.ai: **blocked** by network policy.
- nodejs.org release schedule: reachable.

### Changes vs. the original instructions
- Remotion's current CLI quick start is `npx create-video@latest --yes --blank my-video` then `npx remotion skills add` (skills are now added with `npx remotion skills add`, or `npx -y skills@latest add remotion-dev/skills`).
- Node 26 became LTS on 2026-10-28; Node 24 is now Maintenance LTS; Node 22 (installed) is Maintenance LTS until 2027-04-30.

### Decisions (approved by user)
- **Where to run:** build and push everything from the cloud session; the user clones it locally for the Higgsfield sign-in, the `.env` key and final renders.
- **Node:** keep Node 22 for now. Upgrading to Node 26 LTS later is optional; `package.json` `engines` allows both.
- **Branch:** all work goes on `claude/video-workspace`. Commit and push at the end of every phase.
- **ElevenLabs / Higgsfield details:** built now, marked "NOT VERIFIED AGAINST CURRENT DOCS" until a new session with the domains allowed can check them.

### Manual steps for the user
- Allow these domains in the cloud environment's Network access settings, then start a new session to verify Phase 3:
  `remotion.dev`, `elevenlabs.io`, `api.elevenlabs.io`, `higgsfield.ai`, `mcp.higgsfield.ai`.

## Phase 2: Project scaffold (2026-10-29)

### Docs checked (from `remotion-dev/remotion` on GitHub, since remotion.dev is blocked)
- `docs/getting-started.mdx`: CLI quick start is `npx create-video@latest --yes --blank my-video`, then `npx remotion skills add`.
- `docs/ai/skills.mdx`: skills install with `npx skills add remotion-dev/skills` (or `gh skill install remotion-dev/skills`). The interactive wizard offers skills; `--yes` skips that prompt.
- `docs/ai/claude-code-plugin.mdx`: an official Claude Code plugin exists (`remotion-dev/claude-code-plugin`).
- `docs/license/faq.mdx`: license terms, summarized in `LICENSE_NOTES.md`.

### Commands run
| Command | Result |
|---|---|
| `npx -y create-video@4.0.539 --yes --blank my-video` (in scratchpad, since create-video needs an empty target folder) | Blank TypeScript project created, Remotion 4.0.539, 44 s |
| copy scaffold into repo root (without its `.git` and `node_modules`) | Files merged next to the existing `.claude/` folder |
| `npm install` | 350 packages installed |
| `npx remotion skills add` | 12 Remotion skills installed in `.agents/skills/`, symlinked into `.claude/skills/` for Claude Code. The existing `reverse-engineer-anything` skill was kept. |
| `npx remotion studio --port 3123 --no-open`, loaded it in headless Chromium, then stopped it | Studio served HTTP 200, built in 1.2 s, showed `MyComp`, no page errors. |

### Decisions
- Package renamed to `video-workspace`; `engines.node` set to `^22.13.0 || >=24` (covers Node 22, 24 and 26; drops Node 20, which is end-of-life).
- `.gitignore`: `.env` and `.env.*` ignored (except `.env.example`); `out/`, `public/audio/`, `public/broll/` and media files (`*.mp4`, `*.mov`, `*.webm`, `*.wav`, `*.mp3`) ignored. Exception: `public/music/` stays trackable for small licensed music beds.
- Skills are committed to git (3.5 MB) so a fresh clone has them right away. `.claude/skills/remotion-*` are symlinks; this works on macOS and Linux. On Windows, re-run `npx remotion skills add` after cloning.
- **Claude Code plugin: not installed.** The plugin bundles the same Agent Skills already in the project. Installing both duplicates the skills. Optional on your computer:
  `claude plugin marketplace add remotion-dev/claude-code-plugin` then `claude plugin install remotion@remotion`.

### Notes
- `npm` reported 10 high-severity audit findings in dev tooling from the official template. Not changed (no `npm audit fix --force`, which can break Remotion's pinned versions).
- Studio tried to reach `bugs.remotion.dev` (update and bug check); blocked here, harmless.

### Manual steps for the user
- None for this phase.

## Plan change (approved 2026-10-29)
Work in thin end-to-end slices instead of Phases 3 to 7 in order:
1. **Slice 1:** reel template + captions + placeholder audio + render + QC (was Phase 7's test run)
2. **Slice 2:** brand system for both demo brands
3. **Slice 3:** real ElevenLabs narration (verify docs in a new session)
4. **Slice 4:** Explainer16x9 and PromoSquare1x1, reusing Slice 1 components
5. **Slice 5:** `/new-video` command, CLAUDE.md, README Quick Start

Also approved: real client footage first, Higgsfield B-roll optional; per-brand pronunciation list.

## Slice 1: SocialReel9x16 end to end (2026-10-29)

### Docs and skills checked
- Remotion skills in `.agents/skills/`: `remotion-captions` (Caption type), `remotion-markup` (calculateMetadata, voiceover, audio, transitions, fonts).
- Remotion encoding and quality docs (GitHub copy): H.264 CRF range 1 to 51, default 18; `bt709` color space recommended for accurate colors, with PNG frames.
- Reels safe zones: Hopper HQ's conversion of Meta's guidance (third-party): 270 px top, 670 px bottom, 65 px sides, 770 px clear at the bottom right. TikTok's own margins NOT VERIFIED.

### Packages added (all Remotion 4.0.539, via `npx remotion add`)
`@remotion/captions`, `@remotion/google-fonts`, `@remotion/fonts`, `@remotion/media`, `@remotion/transitions`, `@remotion/layout-utils`, `@remotion/renderer`, `@remotion/bundler`; dev: `@types/node@22`.

### Files created
| Path | Purpose |
|---|---|
| `brands/demo-home-services/brand.json`, `logo.svg`, `fonts/` | First brand (placeholder logo; Poppins + Inter, OFL) |
| `videos/ac-signs-before-summer/config.json`, `script.md` | Test video: scenes, visuals, narration text |
| `src/lib/types.ts`, `timeline.ts`, `registry.ts`, `load-video.ts`, `fonts.ts`, `font-map.ts`, `safe-zones.ts` | Data model, narration-driven timing, auto-discovery of brands and videos |
| `src/components/*` | AnimatedTitle, KineticCaptions, ProgressBar, StatCounter, NumberBadge, LogoReveal, CtaEndCard, MusicBed (ducking), BrandBackground, QcProbe |
| `src/compositions/SocialReel9x16.tsx`, `reel/ReelScenes.tsx` | The reel template |
| `scripts/placeholder-narration.ts` | Silent audio + fake word timestamps, same manifest format as the future `narrate.ts` |
| `scripts/qc.ts`, `scripts/render.ts`, `scripts/make-srt.ts` | Quality check, final render, SRT captions |

### Commands run
| Command | Result |
|---|---|
| `node scripts/placeholder-narration.ts ac-signs-before-summer` | 5 scenes, 30.2 s of (silent) speech |
| `npx remotion compositions` | `ac-signs-before-summer`, 986 frames (32.9 s), computed from narration |
| `node scripts/qc.ts ac-signs-before-summer --every=6` | 165 frames checked, 158 caption-sync checks. First run found 1 issue (CTA button contrast 2.8:1); fixed. A deliberate test with oversized captions was correctly flagged, then reverted. |
| `node scripts/render.ts ac-signs-before-summer` | `out/demo-home-services/ac-signs-before-summer.mp4` (6.5 MB, 1080x1920, 30 fps, H.264 High, yuv420p, BT.709, AAC) + `.srt` (16 lines). Render time 147 s in this container. |
| Remotion Studio, loaded in headless Chromium | Composition, timeline scenes and voice tracks show; no app errors |

### Decisions
- **Narration drives timing:** each scene = its audio length + 0.25 s; the last scene holds 1.5 s after the voice ends; 0.4 s fades. These are global pacing constants in `src/lib/timeline.ts`, never per-scene durations.
- **Auto-discovery:** every `brands/*/brand.json` and `videos/*/config.json` is found at bundle time; each video becomes a composition with the same id. No code edits to add a video or brand.
- **Fonts:** brands can use Google Fonts (listed in `src/lib/font-map.ts`, so bundling stays at about 4 s instead of 80 s) or local font files (`fonts.*.files` in brand.json). The demo brand uses local files, needed for licensed corporate fonts and for renders that don't depend on the network.
- **Stale-audio guard:** rendering fails with a clear message if the narration text in `config.json` changed after the audio was generated.
- **Demo brand primary color** changed from `#FF6B2C` to `#E8541A` so white button text passes 3:1 contrast.
- **Final render settings:** H.264, CRF 16, yuv420p, BT.709, PNG frames, AAC. Without the explicit flags, output was `yuvj420p` (full-range), which some players show with shifted colors.
- **Test script trimmed** to 30.2 s of speech; with pacing the reel is 32.9 s (inside the 15 to 45 s range).

### Sandbox-only workarounds (not needed on your computer)
- Remotion's browser download host (`remotion.media`) is blocked here, so `REMOTION_BROWSER_EXECUTABLE` points to the pre-installed Chrome Headless Shell (`remotion.config.ts` reads it only if set).
- Remotion's browser connects directly, bypassing the sandbox proxy, so Google Fonts fail at render time here. The demo brand's local font files avoid this.

### Known gaps (next slices)
- Music ducking (`MusicBed`) is built but untested: no licensed music file yet (`brand.music` is null).
- Placeholder logo uses SVG text, so it renders in a fallback font; replace with a real vector logo (outlined paths).
- Studio shows "Can't save default props" for generated compositions; editing props in Studio works, saving them back does not (by design, props live in `videos/<id>/config.json`).
- All stats and the $29 offer are demo placeholders.

### Manual steps for the user
- None for this slice.

## Slice 1 extra: audible preview voice (2026-10-29, sandbox only)
- No offline voice was installed. Voice-model hosts (huggingface.co, GitHub releases) are blocked; the Ubuntu package archive is reachable.
- Downloaded the espeak-ng `.deb` packages and unpacked them into the session scratchpad (no system install). A small Python script (scratchpad only, not committed) calls the espeak-ng library and records exact word timestamps from its WORD events, writing the same `manifest.json` format.
- Result: robotic voice, captions synced to real speech timing, QC pass. Not part of the workspace; ElevenLabs replaces it in Slice 3.

## Slice 2: Brand system (2026-10-29)

### What changed
- **Brand style block** (`style` in brand.json): `cornerRadius`, `headlineCase` (upper/sentence), `motion` (bold/calm), `background` (glow/grid), `transition` (fade/slide/wipe). Plus `captionStyle.highlight` (box/color).
- **BrandProvider** (`src/lib/brand-context.tsx`): the composition loads the brand once and every component reads colors, fonts, logo and motion preset from it (`useBrand()`). Components have no brand-specific code.
- **Motion presets** (`src/lib/motion.ts`): `bold` (springy pops, overshoot, button pulse) and `calm` (smooth, no overshoot, smaller moves).
- **Brand transitions** (`src/lib/transitions.tsx`): fade, a subtle 40 px slide + fade (stays inside safe zones), or wipe.
- **Brand switch in Studio:** every composition has a `brandId` prop. Change it to preview any video in any brand. `scripts/render.ts` and `scripts/qc.ts` accept `--brand=<id>`.
- **`pointLabel`** in video config ("Sign 1 of 3", "Spec 1 of 3").
- **Logos** now embed their font inside the SVG, so text renders correctly (fixes the Slice 1 gap).

### New files
| Path | Purpose |
|---|---|
| `brands/demo-b2b-industrial/` | brand.json, logo.svg, fonts/ (IBM Plex Sans + Condensed, OFL) |
| `videos/anodizing-spec-checklist/` | B2B test reel for procurement and engineering buyers |
| `scripts/validate-brand.ts` | Checks fields, hex colors, fonts, logo, 6 contrast pairs, placeholders |
| `scripts/new-brand.ts` | Copies an existing brand into a new client folder |
| `src/lib/brand-context.tsx`, `motion.ts`, `transitions.tsx` | Brand system |

### Commands run
| Command | Result |
|---|---|
| `node scripts/qc.ts <video> --every=8` for 3 combinations (HVAC video in both brands, B2B video) | New check (captions overlapping other text) found real overlaps on the CTA card in all 3. Fixed by scaling the reel CTA card to 85 %. Re-run: all 3 PASS (114 to 115 sync checks each). |
| `node scripts/validate-brand.ts --all` | Both OK; warning: voice IDs are placeholders |
| `node scripts/new-brand.ts test-client --name="Test Client"` then validate, then deleted | Works |
| `node scripts/render.ts anodizing-spec-checklist` | 8.1 MB MP4 + SRT (19 lines), 157 s |

### Decisions
- Industrial brand: navy/graphite background, engineering blue primary, champagne-gold accent (anodized finish), IBM Plex Condensed headings in sentence case, square 6 px corners, calm motion, technical grid background, color-only caption highlight.
- Industrial brand avoids special glyphs (≤, Δ) that the Latin font subset doesn't include; it uses words ("max", "Delta E") instead.
- B2B demo values (AAMA 611 Class I 18 µm minimum, ASTM B680 40 mg/dm² maximum, Delta E 1.5, quote in 24 h, samples in 5 days) are placeholders to confirm with a real client.

### npm scripts added
`brand:new`, `brand:check`

### Manual steps for the user
- None for this slice.

## Slice 3: Narration with Kokoro (free) + ElevenLabs (2026-10-29)

### Docs checked
- **Kokoro** (GitHub `hexgrad/kokoro`, PyPI `kokoro`): Apache 2.0 license (code and weights). Version 0.9.4 needs **Python >=3.10, <3.13**. The English pipeline returns per-token `start_ts` / `end_ts` (read in `kokoro/pipeline.py`, `join_timestamps`). Model and voices download from huggingface.co on first run (about 330 MB, NOT VERIFIED; blocked here). Voice `af_heart` is confirmed in the README; `am_michael` (industrial brand) is NOT VERIFIED, so check VOICES.md on huggingface.co/hexgrad/Kokoro-82M.
- **ElevenLabs:** elevenlabs.io is blocked here. Endpoint and fields were taken from a localized copy of the API reference found by web search. **Everything below is NOT VERIFIED AGAINST CURRENT DOCS:**
  - `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128`
  - header `xi-api-key`; body `text`, `model_id`, `voice_settings` (`stability`, `similarity_boost`, `style`, `use_speaker_boost`, `speed`)
  - response `audio_base64`, `alignment.characters`, `alignment.character_start_times_seconds`, `alignment.character_end_times_seconds`
  - model id `eleven_multilingual_v2`; credit rate 1 per character (0.5 for flash/turbo models)

### How narration works (`scripts/narrate.ts`)
1. Reads `videos/<id>/config.json` (one narration paragraph per scene) and the brand's `voice` settings. `voice.provider` picks `kokoro` or `elevenlabs`; `--provider=` overrides it per run.
2. Applies the brand's `pronunciations` to what the voice says. Captions keep the original words (`scripts/lib/align.ts` maps spoken characters back to caption words).
3. **Cache:** each scene's hash = provider + voice settings + spoken text. Unchanged scenes are reused (0 credits). `--force` regenerates everything.
4. **ElevenLabs:** prints characters and estimated credits for the scenes that will be generated, then asks `[y/N]`. `--yes` skips the prompt (only with the user's OK; see CLAUDE.md).
5. Writes `public/audio/<id>/<scene>.mp3` + `manifest.json` (durations measured with ffprobe, word timestamps).

### Tests run here (no real key, no credits)
| Test | Result |
|---|---|
| `npm test` (alignment unit tests: pronunciations, whole-word matching, gaps, Kokoro tokens) | 4 / 4 pass |
| ElevenLabs path against a **local mock server** imitating the documented response shape (scratchpad only) | Cost prompt: "n" cancels with nothing generated; "y" generates 5 scenes; re-run: all cached, 0 credits |
| Edited one scene's text | Render refused ("Narration is out of date for scenes: spec-2"); narrate regenerated only that scene (88 of 409 chars) |
| Pronunciation | Voice text "A-S-T-M B six eighty"; captions "ASTM", "B680" with their own timings |
| QC on the reel using the ElevenLabs-format manifest | PASS (60 sync checks) |
| Errors | Clear messages for empty key, placeholder voice ID, Kokoro not installed |
| Kokoro path with a **stand-in `kokoro` module** (same interface; scratchpad only) | Works, including timing offsets across Kokoro's internal text chunks |
| Real Kokoro / real ElevenLabs | **Not run** (Python 3.13 here, huggingface.co and elevenlabs.io blocked, no key) |

### Decisions
- demo-home-services uses **Kokoro** by default (free). demo-b2b-industrial uses **ElevenLabs** (premium B2B voice). Both brands carry settings for both providers.
- No ElevenLabs "request stitching" (previous/next text) for now: it would make cached scenes depend on their neighbors and cost credits on unrelated edits.
- B2B script: spec-2 now names the standard ("an ASTM B680 acid dissolution result"), which is more specific for engineers.
- `narrationSource` removed from video configs; the manifest's `source` records the provider used.
- `.env.example` committed; `.env`, `.venv/` git-ignored.

### Kokoro setup (on your computer, once)
Installs only inside the project folder (a `.venv`), nothing global:
```bash
python3 --version          # needs 3.10, 3.11 or 3.12. On a Mac with 3.13 only: brew install python@3.12 (global install, your call)
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-kokoro.txt
npm run narrate -- ac-signs-before-summer    # first run downloads the Kokoro model from huggingface.co
```
Optional (better handling of unusual words): `brew install espeak-ng` (Mac, global install, your call).

### ElevenLabs setup (on your computer)
1. Copy `.env.example` to `.env` and paste your API key after `ELEVENLABS_API_KEY=` (elevenlabs.io: Profile, API Keys).
2. Pick a voice in the ElevenLabs Voice Library, copy its voice ID, paste it into `voice.elevenlabs.voiceId` in the brand's `brand.json`.
3. `npm run narrate -- anodizing-spec-checklist` shows the credit estimate and asks before spending.
4. Note: the ElevenLabs free plan does not include commercial rights (third-party sources); client videos need a paid plan.

### Higgsfield MCP setup (on your computer). NOT VERIFIED AGAINST CURRENT DOCS
higgsfield.ai and mcp.higgsfield.ai are blocked here, so the official setup page could not be checked. The command from third-party guides:
```bash
claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp
```
Then sign in: start `claude` in the project folder, type `/mcp`, select `higgsfield` and choose to authenticate. A browser window opens for the Higgsfield login (OAuth). Verify with `claude mcp list` (it should show higgsfield as connected).
Cost rules for Higgsfield are in `CLAUDE.md`.

### To verify in a new session (with the domains allowed)
- [ ] ElevenLabs endpoint, query parameter, request and response fields, model ids, credit rates, voice settings names
- [ ] Kokoro voice list (VOICES.md), model download size
- [ ] Higgsfield official MCP setup method and URL
- [ ] remotion.dev pages read via GitHub copies so far (should match)

### npm scripts added
`narrate`, `test`

### Manual steps for the user
- Kokoro setup and ElevenLabs setup above, on your computer.
- Higgsfield MCP sign-in on your computer.

## Slice 4: Explainer16x9, PromoSquare1x1, shared shell, music ducking (2026-10-29)

### What changed
- **`VideoShell`** (`src/compositions/VideoShell.tsx`): one shared frame for every format (brand + fonts, background, narration-timed scenes with brand transitions, voice tracks, ducked music, kinetic captions, progress bar, safe-zone guides, QC probe). Each format is now only a layout (safe area, scene area, caption box, progress bar) plus type sizes.
- **Shared scene renderer** (`src/compositions/scenes/Scenes.tsx`): `hook`, `statement` (problem / solution), `point` (benefit with stat and proof line; stacked on tall formats, split left/right on 16:9), `broll` (full-bleed footage + headline + lower third), `cta`.
- **New components:** `LowerThird` (slides in, holds, slides out before the scene ends), `BRollSlot` (video or image with slow push-in and readability gradient; missing file = labeled placeholder showing the shot prompt).
- **Music:** per video (`music` in config.json) or per brand. `public/music/demo-pad.mp3` is an original pad generated with ffmpeg, for testing only.
- **QC:** minimum caption size per format (9:16 64 px, 1:1 52 px, 16:9 44 px); empty B-roll slots fail QC unless `--allow-placeholders` (drafts).

### Formats
| Format | Size | Safe area | Captions |
|---|---|---|---|
| SocialReel9x16 | 1080x1920 | Meta-derived (270 top, 670 bottom, 65 sides, right rail) | 100 %, 3 words per page |
| Explainer16x9 | 1920x1080 | Title-safe 90 % (5 % margins) | 62 %, 7 words per page |
| PromoSquare1x1 | 1080x1080 | 60 px margin | 80 %, 4 words per page |

### New test videos
- `videos/anodizing-rework-explainer/` (Explainer16x9, demo-b2b-industrial): hook, problem, solution, 3 benefits with proof, CTA. 44.8 s with the fast preview voice; a real voice should land around 50 s.
- `videos/spring-tuneup-promo/` (PromoSquare1x1, demo-home-services): 2 B-roll shots with lower thirds, CTA. 18.2 s. Shot 1 uses a generated gradient test clip (git-ignored); shot 2 is intentionally missing to test the placeholder.

### Commands run
| Command | Result |
|---|---|
| QC on both existing reels after the refactor | PASS |
| `node scripts/qc.ts anodizing-rework-explainer` | PASS (132 sync checks) |
| `node scripts/qc.ts spring-tuneup-promo` | FAIL as intended (empty slot); PASS with `--allow-placeholders` (52 sync checks) |
| Music ducking: promo rendered to WAV with silent narration, loudness measured | Music −42 dB during speech, −29.8 dB after the last word (+12 dB; design value 11.5 dB), fades out at the end |
| `node scripts/render.ts spring-tuneup-promo` | 9.4 MB, 18.2 s, 80 s render |
| `node scripts/render.ts anodizing-rework-explainer` | 9.4 MB, 44.8 s, 217 s render |

### Decisions
- Templates share one scene vocabulary, so any scene type works in any format; a format only sets layout and sizes.
- Lower thirds sit above the caption band; QC's caption-overlap check covers them.
- Explainer statement scenes are text-only for now; pairing them with B-roll or product images is the main upgrade path for richer explainers.

### Manual steps for the user
- Replace `public/music/demo-pad.mp3` with licensed music for client work, and record the license in `public/music/README.md`.

## Slice 5: Workflow automation, CLAUDE.md, README (2026-10-29)

### Docs checked
- Claude Code skills (code.claude.com/docs/en/skills): project skills live in `.claude/skills/<name>/SKILL.md` and become `/<name>`; `.claude/commands/` still works, but skills are recommended (they support extra files). Frontmatter used: `name`, `description`, `argument-hint`, `disable-model-invocation: true` (so Claude never starts a video workflow on its own). `$ARGUMENTS` passes what you type after the command.

### Created
| Path | Purpose |
|---|---|
| `.claude/skills/new-video/SKILL.md` | `/new-video`: brief, script (approval), folder, narration (Kokoro draft; ElevenLabs only after cost approval), B-roll (approval before any Higgsfield spend), QC + stills + Studio preview, final render + report |
| `.claude/skills/new-video/script-rules.md` | Conversion-first script rules: hook in 3 s, benefits with numbers, proof per claim, one CTA, B2B vs B2C language, on-screen text limits |
| `scripts/new-video.ts` (`npm run video:new`) | Creates `videos/<id>/config.json` + `script.md` skeleton per format |
| `CLAUDE.md` (full) | Cost rules, folder structure, how a video is built, brand rules, quality checklist, render settings, commands, known limits |
| `README.md` | Quick Start: install, Kokoro, ElevenLabs key, Higgsfield, Claude Code + `/new-video`, preview/render, new brand, cost per video |

### Changed
- `scripts/narrate.ts` refuses to run while any scene text still contains `TODO` (no credits spent on unfinished scripts).

### Tests
| Test | Result |
|---|---|
| `video:new` for all 3 formats, then deleted | Folders created; narrate refused with "Scenes still contain TODO text" |
| Skill frontmatter parsed as YAML | Valid |
| `npm test`, `tsc`, `eslint src`, `brand:check` | Pass |

### Known limit found
- `npx remotion compositions` (list all) fails while any video has no narration yet. Rendering one video by id works. Documented in CLAUDE.md.

## Next session: verify with network access (Option 1)
Allow in the environment's Network access settings: `huggingface.co`, `cdn-lfs.hf.co`, `cas-bridge.xethub.hf.co`,
`elevenlabs.io`, `api.elevenlabs.io`, `higgsfield.ai`, `mcp.higgsfield.ai`, `remotion.dev`. Then, in a new session on `claude/video-workspace`:
- [ ] Install Kokoro in `.venv` with `/usr/bin/python3.12`, run `npm run narrate -- ac-signs-before-summer` and the other examples with `--provider=kokoro`, render, send MP4s
- [ ] Verify the Kokoro voice list (VOICES.md) and model size; fix `am_michael` if needed
- [ ] Verify the ElevenLabs endpoint, fields, model ids, voice settings and credit rates; update `scripts/lib/providers.ts` and remove the "NOT VERIFIED" markers that check out
- [ ] Verify Higgsfield's official MCP setup; update README, CLAUDE.md and this log
- [ ] Re-read remotion.dev pages used so far (they were read from the GitHub copies)
