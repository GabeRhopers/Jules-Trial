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
