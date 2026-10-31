# Prompt: Expand the Video Studio with Whiteboard, Ads, Lyric and Series modules (v2)

Paste everything below the line into a new Claude Code session opened in the video studio repository.

---

## Who I am and what already exists

I run marketing and agency work (B2B tech, industrial clients such as anodized aluminum, and US home-service companies). I already have a working AI video studio in this repository, built with Claude Code. It makes professional text and narration marketing videos with Remotion, Kokoro or ElevenLabs narration, word-synced captions and optional Higgsfield B-roll.

**This existing capability must keep working exactly as it does today.** Everything in this prompt is an addition.

## Ground truth: the studio that already exists

The studio lives on the branch **`claude/video-workspace`** (not `master`). Branch from it: `git checkout -b studio-modules origin/claude/video-workspace`.

Read these first. They are the core, so **extend them, never duplicate them**:

| Area | Existing files | Rule |
|---|---|---|
| Project rules | `CLAUDE.md`, `README.md`, `SETUP_LOG.md` | Follow the cost rules in `CLAUDE.md` (ElevenLabs and Higgsfield need approval per run). |
| Brand kits | `brands/<id>/brand.json`, `logo.svg`, `fonts/`; `src/lib/brand-context.tsx` (`useBrand()`); `scripts/new-brand.ts`, `scripts/validate-brand.ts` | This **is** the brand kit system. Add fields to `brand.json` if needed; do not create `/core/brand-kits`. |
| Narration | `scripts/narrate.ts`, `scripts/lib/providers.ts` (Kokoro, ElevenLabs), `scripts/lib/align.ts` (pronunciations, character-to-word timing, unit-tested) | This **is** the provider router for voice. Add providers here (Chatterbox, faster-whisper alignment). Keep the "captions show the term, the voice says the pronunciation" behavior. |
| Timeline | `src/lib/timeline.ts` (scene length from narration + 0.25 s, 0.4 s transitions) | Never hardcode durations. |
| Components | `src/components/` (KineticCaptions, CtaEndCard, LowerThird, LogoReveal, MusicBed, BRollSlot, etc.) | Reuse them. New shared components go here. |
| Compositions | `src/compositions/` (SocialReel9x16, Explainer16x9, PromoSquare1x1, VideoShell) | Do not change their output. New modules add new compositions. |
| Videos | `videos/<id>/config.json`, `script.md`; auto-discovered by `src/lib/registry.ts` | New modules follow the same discovery pattern. |
| QC and render | `scripts/qc.ts`, `scripts/render.ts`, `scripts/make-srt.ts` | The existing render path stays as it is for existing templates. |
| Licenses | `LICENSE_NOTES.md` (Remotion terms, per-client decision log) | Merge into the new license registry; keep the Remotion section. |
| Entry point | `.claude/skills/new-video/` | New entry points follow its structure. |

Note: there is no lyric-video code in the repo. Module D is built from scratch using the lessons written below.

## What I want to add

Four optional modules on one shared core:

1. **Whiteboard / doodle explainers:** a hand draws illustrations and writes text while narration explains a topic.
2. **Ads with consistent characters and products:** campaign variations where presenter, product, brand look and CTA stay locked.
3. **Audio-synced lyric videos:** a song plus lyrics produce an animated 9:16 video, each word appearing when it is sung.
4. **Vertical series (micro-dramas):** short 9:16 episodes with the same characters, outfits, places and voices across a series.

Each module can be enabled or removed without affecting the others or the existing pipeline.

## Where work runs: cloud vs render computer

I develop in the cloud and render heavy jobs on my own computer. These are two different Claude Code sessions:

- **Cloud sessions** write code, Remotion compositions, bible schemas, ComfyUI workflow JSON, docs and tests. They can run Remotion renders, Kokoro and faster-whisper on CPU. They **cannot** reach ComfyUI or comfy-mcp on my computer.
- **Local session** (Claude Code on the render computer, or Remote Control) pulls the branch, runs ComfyUI through comfy-mcp, runs GPU jobs and heavy renders, and commits only small outputs (logs, manifests), never model weights or large media.

Every GPU step must be written as a script or workflow that the local session can run with one command, with its inputs and outputs listed in the module README.

## Architecture

New folders only for things that do not exist yet (adapt names after the audit, and ask before moving any existing file):

```
bibles/schemas/                 JSON Schemas: series, character, campaign, product
assets/registry.json            characters, products, locations, voices, LoRAs, with versions, paths, license
licenses/registry.json          every model, tool, font and service: license, source URL, status, date checked
providers/config.json           routing: local ComfyUI vs cloud APIs, set by the hardware answer
comfy-workflows/                versioned ComfyUI workflows (API-format JSON) + README per workflow
modules/whiteboard/             compositions, components, scripts, README
modules/ads/
modules/lyrics/
modules/series/
projects/<project-id>/          per-job inputs, bibles, generated assets (large media git-ignored)
```

`brands/`, `src/components/`, `src/lib/`, `scripts/lib/` remain the shared core.

**Parallel sessions:** no parallel module work until Phase 1 is merged and the shared interfaces (`src/lib/types.ts`, bible schemas, registry formats) are frozen. After that, other sessions may work on modules in separate git worktrees or branches of this same repo.

## Working rules

1. **Audit first, change nothing yet.** Read the files in "Ground truth", `package.json`, and run `npm test` plus one existing sample render (or `qc` with placeholders). Report: structure, how rendering and narration work, what each new module can reuse, and every risk to the existing pipeline. Then show the plan as a task list and wait for my approval.
2. **Hardware questions:** ask about the render computer (GPU model and VRAM, OS, free disk, RAM). The answer only affects Phases 4 to 6. Do not wait for it to start Phases 1 to 3.
3. Work on the new branch. Small, reviewable commits. After each phase, prove the existing pipeline is unchanged (see "Regression check").
4. **License gate:** before installing any model, tool, font or service, open its official LICENSE file or model card (not a mirror, blog or aggregator), record it in `licenses/registry.json`, and mark it `commercial_ok`, `restricted` or `blocked`. Code and weights can have different licenses; record both. Never use a `blocked` item in client work. If the official text differs from this prompt, the official text wins; tell me.
5. **Ask before** downloads over 5 GB, any paid API call, any credit use (ElevenLabs, Higgsfield, ComfyUI partner nodes), as `CLAUDE.md` already requires.
6. **Rendering discipline:**
   - Existing templates keep their current render path (`scripts/render.ts`).
   - Before any full render, render and inspect a few full-size still frames at the busiest moments.
   - Scene-by-scene rendering is only for long or GPU-heavy modules (series, lyrics, long whiteboard). There, render one file per scene with identical settings, join with the ffmpeg concat demuxer and `-c copy`, then mux audio with `-c:v copy`. Write each scene to a temporary name and rename only when ffmpeg exits 0.
   - Scene-by-scene rendering cuts transitions that cross scene boundaries. For those modules, either use hard cuts, or put each transition inside a scene.
   - Default 30 fps, same encoding settings as `render.ts` (H.264, yuv420p, BT.709).
7. Use a task list. Update `CLAUDE.md` and each module README as you go, so future sessions understand the system.

## Regression check (run after every phase)

- `npm test` passes.
- `npm run qc -- <existing video id> --allow-placeholders` passes for at least one existing video per format.
- Render 3 still frames of one existing video before Phase 1 and after each phase, and compare them pixel by pixel. Any difference must be explained and approved.

## Hardware routing (fill in after I answer)

| Render computer GPU | Route |
|---|---|
| 24 GB VRAM or more | Full local route: Wan 2.2 14B, Phantom 14B, Wan2.2-Animate, InfiniteTalk, LoRA training |
| 16 GB | Local with quantized/FP8 models and lower resolutions; cloud for hero shots |
| 8 to 12 GB | Wan 2.2 TI2V-5B, MuseTalk, Qwen-Image-Edit quantized; cloud for heavy video |
| Under 8 GB or no NVIDIA GPU | Cloud route: same pipeline, video generation sent to paid APIs (Higgsfield or similar); free daily credits for tests only |

The route is a value in `providers/config.json`, not a code change.

## Phase 1: Shared core additions

Only what is missing today:

1. **Bible schemas** (JSON Schema, validated by a script):
   - character: appearance, outfits by episode, voice provider + voice ID, LoRA path + version, reference images, **consent/release record** if based on a real person or real voice
   - product: reference photos, LoRA, approved angles, cut-outs
   - campaign: persona, offer, approved claims (each with source or "client confirmed" flag), CTA, AI-disclosure requirement per platform
   - series: premise, characters, season arc, episode list
2. **Asset registry** with versions, so every video records exactly which character version, voice and LoRA it used.
3. **Narration providers** (extend `scripts/lib/providers.ts`):
   - Keep Kokoro and ElevenLabs as they are.
   - Add optional **Chatterbox Multilingual** (MIT; output carries an inaudible Perth watermark; check the dedicated pt-BR fine-tune). Verify the license on the official ResembleAI model card.
   - Suggested roles: Kokoro for English drafts (check if its pt-BR voices are good enough), Chatterbox for pt-BR drafts and cloned voices, ElevenLabs for finals. Confirm with me.
4. **Word timestamps from any audio** (songs, uploaded voiceovers) with **faster-whisper**, feeding the same word format as `align.ts`. Lessons from a previous run:
   - decode audio yourself to a 16 kHz mono numpy array and pass the array (the bundled decoder had a version mismatch)
   - pass the known script or lyrics as `initial_prompt`
   - map timings onto my exact text, never whisper's spelling
   - for sung or stretched passages, cross-check with the `medium` model on short windows
5. **Captions:** make sure `KineticCaptions` works for 9:16, 16:9 and 1:1 from either timestamp source.
6. **License registry:** create `licenses/registry.json`, prefilled from the table at the end (verify each entry), and import the Remotion notes from `LICENSE_NOTES.md`.

Acceptance: regression check passes, and a 20-second test video renders using an existing brand, faster-whisper timestamps from an uploaded voiceover, and the existing captions and end card.

## Phase 2: Module A, Whiteboard / doodle explainers (no GPU)

- **Drawing engine:** a reusable `WhiteboardScene` Remotion component.
  - `@remotion/paths` `evolvePath()` reveals each SVG path from 0 to 1.
  - `@remotion/paths` `getPointAtLength()` gives the pen-tip position so a **hand-with-marker image** follows the line.
  - **Rough.js** (MIT) for hand-drawn lines, arrows, boxes, circles and sketchy fills.
  - Doodle library from **Tabler Icons** (MIT) and **Lucide** (ISC), stroke-based icons that draw on naturally.
  - Handwritten text drawn stroke by stroke with a single-line font (Hershey fonts, or Relief SingleLine after checking its license). **Test Portuguese characters first** (ã, õ, ç, é, ê, á, í, ú). If glyphs are missing, use the fallback: an OFL handwriting font revealed by an animated mask.
- **Hand sprite:** generate our own hand-holding-marker PNG (ask before spending credits) so we own the rights. Do not copy hand images from other repositories.
- **AI line-art path (optional) for complex scenes:** black-on-white line art, vectorized with **vtracer** or **potrace** (check both licenses), strokes ordered left to right and top to bottom, drawn by the same engine.
- **Timing:** each drawing starts on the narration word it illustrates.
- **Reference projects** for ideas only (verify licenses, do not copy code blindly): `whiteboard-animator`, `srt-whiteboard-animation`, `handanim`, `excalidraw-animate`.
- Output 16:9 and 9:16, white or cream paper background, optional color fill after the line art, brand end card from `CtaEndCard`.

Acceptance: a 45-second explainer ("How anodizing protects aluminum", demo industrial brand) with narration, at least 6 drawn elements, handwritten keywords (including one word with an accent), a moving hand, and the brand end card. QC passes.

## Phase 3: Module D, Lyric videos (no GPU)

- Inputs: song file plus lyrics text. Lyrics may include section labels like [Verse], [Chorus]; never show them on screen.
- Word timestamps from the Phase 1 faster-whisper service, mapped onto my exact lyric text.
- Analyze the lyrics' meaning to choose the visual concept, palette and motifs, and tie key effects to specific sung words (for example, a color burst on the word "cor"). Show me the concept before rendering.
- Couplet layout: words fade and rise in as they are sung, the previous couplet slides up and fades as the next one arrives, emphasis words in a gradient italic.
- Audio-reactive elements from a per-frame loudness envelope.
- Robust ending: if repeated or stretched final lines are uncertain, keep the key text on screen and pulse on detected onsets instead of relying on exact word times.
- Render 1080x1920 at 30 fps, scene by scene, then mux the original audio.

Acceptance: a lyric video for a sample song. Spot-check 10 words spread across the song: at least 9 appear within about 100 ms of when they are sung. Report the check.

## Phase 4: ComfyUI + comfy-mcp on the render computer (local session)

- Install ComfyUI on the render computer, not in the repo.
- Register **comfy-mcp** (Comfy-Org GitHub organization, beta) with `claude mcp add` in the local session. Its license appears to be AGPL-3.0-or-later or commercial: verify the LICENSE file. Internal use is fine; if the studio is ever offered to clients as an online service, stop and tell me (AGPL obligations).
- Keep every workflow in `comfy-workflows/` as API-format JSON with a README listing required models, VRAM, license and the one command to run it.
- ComfyUI partner or hosted nodes spend credits: always ask first.
- Test: one short Wan 2.2 clip on the chosen route.

## Phase 5: Module C, Ads with consistent characters and products

Start with the cloud route (Higgsfield or similar, with approval per run) so client-usable output exists before any LoRA training. Add the local route when Phase 4 works.

- **Campaign bible + brand kit** drive everything: persona, offer, approved claims, CTA, colors, fonts, end card.
- **Product consistency:** reference photos and/or a product LoRA (AI Toolkit by ostris, verify license); cut-outs with **BiRefNet** (MIT); relighting with **IC-Light** (code Apache-2.0; check whether the V2 weights have a different license; use only the official `lllyasviel/IC-Light` repo; do not use BRIA RMBG, which is non-commercial).
- **Presenter consistency:** reference sheet with **Qwen-Image-Edit-2509** (Apache 2.0, verify), character LoRA, **Phantom** for person plus product in one shot, **Wan2.2-Animate** (Apache-2.0, confirmed on the official model card) for a recurring spokesperson driven by a real performance.
- **Consent:** if the presenter, face or voice is based on a real person, the character bible must hold a signed release reference before generation.
- **AI disclosure:** for each platform in the campaign, record whether realistic synthetic people require an AI label, from the platform's official policy page, and add it to the delivery checklist.
- **Variation generator:** from one campaign bible, produce N variations (hooks, angles, 6/15/30 s, 9:16, 1:1, 16:9) with product, presenter, brand and CTA locked. File naming for A/B tests, for example `<client>_<campaign>_<hook>_<length>s_<format>_v<n>.mp4`.
- **Music:** **ACE-Step** (Apache-2.0, verify) for jingles and beds; test Portuguese quality before relying on it. Log every track in `public/music/README.md`.
- **Do not use MMAudio:** code is MIT but the checkpoints are CC-BY-NC 4.0 (confirmed in the official repo).
- **Finishing:** SeedVR2 upscale (Apache 2.0, verify), captions, brand end card.

Acceptance: one campaign for the demo home-service brand ("AC tune-up before summer") with a consistent technician character and van, 3 hooks x 2 lengths in 9:16, all ending with the same branded end card. A review sheet scores each variation for face, uniform, van, logo and voice consistency (pass/fail per item).

## Phase 6: Module B, Vertical series / micro-dramas

Consistency comes from a system, not one tool: series bible, locked character references, one LoRA per main character, one fixed voice per character, and a continuity ledger.

1. **Writing (Claude):** premise, characters, season arc, 10 to 30 episode outline, 60 to 90 s per episode, hook in the first 3 seconds, cliffhanger ending. Per episode: script, shot list, continuity check. For ideas only (verify licenses): Drama Skills, Dramake, OnlyShot, shuohao-skills, Jellyfish.
2. **Casting:** per character, a reference sheet (front, 3/4, side, full body, each outfit) with Qwen-Image-Edit-2509 or Higgsfield. Stored in the asset registry.
3. **Character lock:** one LoRA per main character with AI Toolkit on 20 to 50 images, targeting Wan 2.2.
4. **Video:** Wan 2.2 image-to-video from locked keyframes; Phantom for multi-character shots; LTX-2 only after reading its license (free commercial use under a revenue threshold; confirm whether it is revenue or ARR and whether affiliates count).
5. **Performance:** Wan2.2-Animate to drive a character with a filmed performance.
6. **Dialogue:** fixed voice per character from the narration providers. Lip sync with InfiniteTalk (Apache 2.0, verify) or MuseTalk 1.5 (MIT, verify). LatentSync 1.6 is OpenRAIL++: read its use restrictions before client work.
7. **Continuity ledger:** after each episode, record outfits, injuries, props, locations, relationships and open plot threads. The next script is checked against it.
8. **Assembly:** Remotion 9:16 with captions, music, "previously on" opener and "next episode" end card, rendered scene by scene.
9. **Upscale:** SeedVR2 for final delivery.

Acceptance: a 3-episode pilot (about 60 s each) with 2 main characters, a continuity ledger file, and a consistency review: for each character, 5 frames per episode scored pass/fail on face, hair, outfit and voice, plus a face-similarity score between episodes if a tool with a commercial-friendly license is available.

## Claude Code entry points

Do not multiply commands. Extend the existing pattern:

- `/new-video` stays as it is for existing formats, and gains a first question: "standard, whiteboard, ad campaign, lyric video or series episode?", routing to the module skill.
- Module skills (callable directly too): `/whiteboard`, `/ad-campaign`, `/lyric-video`, `/series` (with sub-steps new, episode, continuity-check).
- `/license-check <model, tool, font or service>`.

Each entry point must: load the brand and relevant bibles, confirm format (9:16, 16:9, 1:1) and length, show a plan or storyboard and a cost estimate before spending GPU time or credits, preview key frames, then render, then run QC.

## License registry starting point (verify each at install time, from official sources)

| Item | License as researched | Status |
|---|---|---|
| Remotion | Remotion license (see `LICENSE_NOTES.md`) | commercial_ok for teams of 3 or fewer; company license at 4+ (headcount rules for agencies and co-owned projects apply) |
| Kokoro | verify model card | check |
| ElevenLabs | terms of service (commercial rights, voice cloning consent) | check terms, record plan |
| Higgsfield | terms of service (commercial rights to outputs) | check terms, record plan |
| Wan 2.2 (T2V, I2V, TI2V-5B) | Apache 2.0 | commercial_ok |
| Wan2.2-Animate | Apache-2.0 (confirmed on official model card) | commercial_ok |
| Phantom | Apache-2.0 | commercial_ok (verify) |
| Qwen-Image-Edit-2509 | Apache 2.0 | commercial_ok (verify) |
| InfiniteTalk | Apache 2.0 | commercial_ok (verify) |
| MuseTalk 1.5 | MIT | commercial_ok (verify) |
| SeedVR2 | Apache 2.0 | commercial_ok (verify) |
| ACE-Step | Apache-2.0 | commercial_ok (verify) |
| BiRefNet | MIT | commercial_ok (verify) |
| IC-Light | code Apache-2.0; V2 weights may differ | check V2 before use |
| BRIA RMBG 1.4 | non-commercial | blocked |
| Chatterbox Multilingual | MIT, watermarked output | commercial_ok |
| faster-whisper | verify | check |
| Rough.js | MIT | commercial_ok |
| Tabler Icons / Lucide | MIT / ISC | commercial_ok |
| Hershey fonts | verify | check |
| Relief SingleLine font | not confirmed | check before use |
| vtracer / potrace | verify (potrace is GPL) | check |
| AI Toolkit (ostris) | verify | check |
| LTX-2 | LTX-2 Community License | restricted: free under a revenue threshold; confirm definition |
| LatentSync 1.6 | OpenRAIL++ | restricted: read use restrictions |
| Wan VACE | not confirmed | check before use |
| comfy-mcp | AGPL-3.0-or-later or commercial (verify LICENSE file) | internal tool use only |
| MMAudio | code MIT, checkpoints CC-BY-NC 4.0 | blocked for client work |
| FLUX.1 dev family (incl. Kontext dev) | non-commercial model license; outputs allowed commercially per model card, but commercial use of the model needs a BFL license | blocked for client work unless licensed |
| Huobao Drama, waoowaoo AI Studio | CC BY-NC-SA 4.0 | blocked |
| DramaClaw | Elastic-2.0 | blocked |

## Phase plan and order

0. Audit, regression baseline, plan, hardware questions (no changes)
1. Shared core additions
2. Module A: Whiteboard (no GPU)
3. Module D: Lyric videos (no GPU)
4. ComfyUI + comfy-mcp on the render computer (local session), one Wan 2.2 test clip
5. Module C: Ads (cloud route first, then local)
6. Module B: Series pilot

At the end of each phase: show what was built, a sample output, the regression check result, updated docs, and what is next. Wait for my go-ahead before the next phase.
