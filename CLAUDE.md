# Video production workspace

Remotion + narration (Kokoro or ElevenLabs) + optional Higgsfield B-roll, for brand-consistent marketing videos.
Full documentation of folders, workflow and checklists comes in Slice 5; this file starts with the rules that matter most.

## Cost rules (always follow)
- **ElevenLabs costs credits.** Never run `scripts/narrate.ts` with `--yes` or `--provider=elevenlabs` without the user's explicit OK in this conversation. Show the script's character and credit estimate first and wait for approval.
- **Kokoro is free** (runs locally). It is fine for drafts and previews without asking.
- **Higgsfield costs credits on every generation.** Before any Higgsfield image or video generation: propose the shot list (prompt, model, length, aspect ratio) and the expected credit cost, and wait for the user's explicit approval. Never retry a failed or unsatisfying generation without asking again.
- Save downloaded Higgsfield clips to `public/broll/<video-id>/` (git-ignored) and note each clip's prompt in `videos/<video-id>/broll.md` so it is reproducible.
- Never ask the user to paste API keys into the chat. Keys go in `.env` (git-ignored); see `.env.example`.

## Where things are
- `brands/<brand-id>/brand.json`: colors, fonts, logo, voice, pronunciations, style, captions, CTA. Check with `npm run brand:check -- <brand-id>`.
- `videos/<video-id>/config.json` + `script.md`: one folder per video (scenes, narration text, visuals).
- `scripts/`: `narrate.ts` (voice), `qc.ts` (quality check), `render.ts` (MP4 + SRT), `new-brand.ts`, `validate-brand.ts`.
- Narration drives timing: never hardcode scene durations. Scene length = its audio length (see `src/lib/timeline.ts`).

## Before delivering any video
Run `node scripts/qc.ts <video-id>` and fix every issue it reports. Confirm every number and claim in the script with the client.

## Unverified details
Anything marked "NOT VERIFIED AGAINST CURRENT DOCS" (ElevenLabs endpoint, model ids, credit rates; Higgsfield MCP setup) must be checked against the official docs before relying on it. See SETUP_LOG.md.
