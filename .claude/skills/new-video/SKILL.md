---
name: new-video
description: Produce a new brand-consistent marketing video end to end (brief, conversion-focused script, narration, optional B-roll, preview, QC, final MP4 + SRT). Use when the user wants to make a new video, reel, explainer or promo.
argument-hint: "[brand-id] [format] [topic]"
disable-model-invocation: true
---

# /new-video

Produce one video from brief to final render. Follow the steps in order. **Stop and wait for the user
at every step marked STOP.** Read `CLAUDE.md` first if you have not this session (cost rules, folders).

Arguments given (may be empty): `$ARGUMENTS`

## Step 1: Brief (STOP)

Ask for anything not already given, in one message, as a short numbered list:

1. **Brand:** one of the folders in `brands/` (list them). New client? Offer `npm run brand:new` first.
2. **Format:** `SocialReel9x16` (15 to 45 s, social), `Explainer16x9` (45 to 90 s, website/YouTube/sales), `PromoSquare1x1` (15 to 30 s, feed ad with B-roll).
3. **Target audience:** who exactly (role, situation), and where they will see it.
4. **Goal:** lead, sale or awareness.
5. **Key benefit:** the one outcome the viewer gets, with a number if possible.
6. **Offer and CTA:** what to do next (book, request samples, send a drawing, call).
7. **Length:** seconds.
8. **Proof available:** real numbers, certifications, reviews, guarantees. Never invent numbers; if none are given, use clearly marked placeholders and say so.

Then read `brands/<brand>/brand.json` (tone of voice, CTA, pronunciations) before writing.

## Step 2: Script (STOP for approval)

Write the script following `script-rules.md` (in this skill's folder). Show it as a table:
scene id | what the voice says | what is on screen. Add the estimated spoken length
(about 2.5 words per second) and list every claim the client must confirm.
Revise until the user approves. Do not narrate before approval.

## Step 3: Create the video folder

1. Pick a video id: lowercase, dashes, specific (e.g. `spring-ac-tuneup-reel`).
2. `npm run video:new -- <video-id> --brand=<brand> --format=<format> --title="<title>"`
3. Replace every TODO in `videos/<video-id>/config.json` and `script.md` with the approved script.
   Scene kinds: `hook`, `statement`, `point` (with `stat` and optional `proof`), `broll`, `cta`, and the
   optional `whiteboard` (title + items drawn on cue words; see "Whiteboard scenes" in `script-rules.md`
   and the example in `videos/anodizing-process-whiteboard/config.json`). Check every icon name with
   `npm run icon -- <keyword>` before narrating. Set
   `pointLabel` (e.g. "Sign", "Spec", "Benefit") and `music` if wanted.
4. New technical terms, product names or standards: add them to the brand's `pronunciations`.

## Step 4: Narration

- Draft with **Kokoro** (free): `npm run narrate -- <video-id> --provider=kokoro`
- If the brand's provider is **ElevenLabs**, run the final narration only after the script is locked:
  `npm run narrate -- <video-id>`. The script prints the character count and credit estimate and asks
  `[y/N]`. **Show the estimate to the user and wait for an explicit yes (STOP).** Never pass `--yes`
  unless the user approved this exact run.
- Unchanged scenes are cached; edits only regenerate changed scenes.

## Step 5: B-roll (optional, STOP before any spending)

Ask whether the user has real footage (preferred: client's own photos/video are more credible, especially for B2B).
- **Real footage:** ask the user to copy files into `public/broll/<video-id>/`; set each `broll` scene's `src`.
- **Higgsfield:** propose a shot list as a table (scene, prompt, model, duration, aspect ratio, estimated
  credits). **Wait for explicit approval before generating anything.** Generate only the approved shots,
  download them to `public/broll/<video-id>/`, and log each prompt in `videos/<video-id>/broll.md`.
  Never regenerate or retry without asking again. For B2B, do not generate footage that could be mistaken
  for the client's real facility, products or people.

## Step 6: Preview and iterate (STOP for feedback)

1. Run QC: `node scripts/qc.ts <video-id> --allow-placeholders` and fix every issue.
2. Render 3 to 5 stills to check the look yourself first:
   `npx remotion still <video-id> /tmp/<video-id>-<frame>.png --frame=<frame>`, and look at them.
3. Start Studio for the user: `npm run dev` (in the background). Tell them to open
   http://localhost:3000, pick the video, and use `showSafeZones` to see platform UI areas.
4. Apply feedback in `config.json` (text, visuals) or `brand.json` (look). Changing narration text means
   re-running Step 4 for the changed scenes only.

## Step 7: Final render

1. `node scripts/qc.ts <video-id>` must PASS (no `--allow-placeholders`).
2. `npm run render:video -- <video-id>` creates `out/<brand>/<video-id>.mp4` (H.264, CRF 16, yuv420p,
   BT.709, AAC) and `out/<brand>/<video-id>.srt`.
3. Report: file paths, length, file size, render time, any claims still to confirm with the client,
   and the credits spent (ElevenLabs characters, Higgsfield generations).
4. Remind the user that the Remotion license depends on their team size and who owns the project
   (`LICENSE_NOTES.md`).
