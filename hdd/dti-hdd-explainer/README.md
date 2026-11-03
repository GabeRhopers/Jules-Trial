# DTI · Horizontal Directional Drilling explainer (3D remake)

A remake of DTI's "Horizontal Directional Drilling Installation Animation" as a 3D technical explainer. It uses the original recorded narration, unchanged except for one required update. 16:9, 1920 × 1080, 30 fps, 3:08.

## Deliverables
| File | What it is |
|---|---|
| `storyboard/index.html`, `storyboard/DTI-HDD-Storyboard.pdf` | Storyboard synced to the narration. 15 shots, each with a rendered frame, narration, visual, on-screen text, audience focus and HDD review notes |
| `out/dti/dti-hdd-explainer-draft.mp4` | Video without captions (draft: shows the PICKUP PENDING flag) |
| `out/dti/dti-hdd-explainer-captions-draft.mp4` | Same video with burned-in captions |
| `out/dti/dti-hdd-explainer.srt` (copy: `captions.srt`) | Captions with the updated wording ("for over 30 years") |
| Production files (editable) | `src/hdd/*` (3D site, shots, overlays), `hdd/dti-hdd-explainer/narration.json` (transcript and word timings), `brands/dti/` (logo, colors, Montserrat) |

## Narration
- **Source.** The audio comes from the client-supplied file of the original video. It's voice only, with no music or effects.
- **Location.** `public/hdd/dti-hdd-explainer/narration-original.m4a`, the AAC stream copied without re-encoding. The original WAV, if DTI has it, would be cleaner.
- **Transcript.** Produced locally with faster-whisper medium.en and checked word by word. Two spots need DTI to confirm:
  - "a sonde, **or** radio detection device" (heard as "our")
  - "one and a half size the conduit" (kept verbatim)
- **Required update.** "over the past 23 years" (175.98–178.38 s) is removed from the audio. "for over 30 years." replaces it.

### Pickup: consented voice match (pending)
- **Status.** Not generated yet. The audio is silent from 175.98 s to 178.63 s, and the draft shows a red PICKUP PENDING flag. "23 years" is never heard.
- **Requirements:**
  1. Written consent from the original narrator to clone their voice for this line. ElevenLabs Instant Voice Cloning asks you to confirm you have that right.
  2. An ElevenLabs plan that includes voice cloning. Third-party sources say Instant Voice Cloning starts on Starter; verify this on ElevenLabs' pricing page.
  3. User approval of the credit estimate:
     - Generate the whole sentence for natural intonation: "Directional Technologies has installed miles and miles of conduit using directional drilling for over 30 years." That's 113 characters.
     - Three takes: about 340 characters, so about 340 credits at 1 credit per character (Multilingual v2).
     - Only the "for over 30 years." portion is cut in.
- **Then:**
  - Splice the take at 175.98 s.
  - Match level, EQ and room tone to the original.
  - Remove the flag (`draft: false`) and re-render.

## Site and accuracy notes
- **One consistent site.** The bore runs west to east under an intersection. The rig is on the west corner lot, the entrance pit is in front of it, and the exit pit is on the east lot. Pilot drilling goes west to east, and reaming and pullback go east to west, toward the rig.
- **Utilities.** Water, sewer, fiber, electric and gas follow the APWA / Common Ground Alliance uniform color code. White is the proposed path. Depths and sizes are illustrative.
- **No invented numbers.** There are no project measurements. The locator display is labeled illustrative, and the narrated sizes (4-inch pilot bit, about 1.5 × conduit) are shown as examples.
- **No guarantees.** Nothing on screen promises cost, schedule, change orders, approvals or environmental outcomes. The creek shot is a separate example site, labeled as a crossing type.
- **Specialist review before the final render:**
  - bore geometry
  - equipment behavior
  - tracking graphics
  - fluid handling
  - pullback order (drill pipe, reamer, swivel, pulling head, conduit)

## Commands
```
node scripts/hdd-storyboard-frames.ts [S01 S02 ...]   # storyboard frames (rendered from the 3D scene)
node scripts/hdd-storyboard.ts                       # storyboard HTML + SRT
npx remotion render dti-hdd-explainer out/dti/dti-hdd-explainer-draft.mp4 --gl=swangle --concurrency=3
npx remotion render dti-hdd-caption-layer out/dti/captions-layer.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png
ffmpeg -i out/dti/dti-hdd-explainer-draft.mp4 -i out/dti/captions-layer.mov -filter_complex overlay -c:a copy out/dti/dti-hdd-explainer-captions-draft.mp4
```
- **Final render:** use `--props='{"draft":false}'`.
- **Browser:** in the cloud sandbox, set `REMOTION_BROWSER_EXECUTABLE` to the headless Chromium. `--gl=swangle` is needed there (no GPU). On a computer with a GPU, `--gl=angle` is faster.

## Open items
- **Personas PDF.** "DTI Personas – 7-15-26.pdf" was not received. Audience focus follows the brief's six priorities until it arrives.
- **Music.** No licensed track yet. Add one at low level, ducked under the voice, and log it in `public/music/README.md`.
- **Contact details.** As supplied by the user (203-294-9200, 877-788-4479, drilling@directionaltech.com, directionaltech.com). DTI should confirm them before publishing.
