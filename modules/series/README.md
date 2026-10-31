# Series module (vertical micro-dramas)

Optional module. It adds 9:16 episodic videos with recurring characters, fixed voices and a
continuity ledger. It does not change any existing composition: remove the "Series" `<Folder>`
block in `src/Root.tsx` and this folder to disable it.

## First test: COLD FEET (2 episodes)

A monster marriage micro-drama that doubles as an HVAC awareness piece for the demo home-service brand.

| Episode | Title | Length | Story | Ends on |
|---|---|---|---|---|
| 1 | It Clicks | ~52 s | Nefi (a 3,000-year-old mummy) is freezing. The furnace lights, then shuts off. Frank (a gentle stitched giant who is afraid of fire) tries lightning with jumper cables. | Power out, a mysterious beep |
| 2 | The Flame Sensor | ~76 s | They get outside first. Dee from Demo HVAC finds zero CO (the chirp was a low battery) and cleans the dirty flame sensor. | Branded end card, then "why is the basement floor wet?" |

Facts used in the story (checked 2026-10-31):
- A furnace that starts, then shuts off after 2 to 5 seconds is a common sign of a dirty or failing flame sensor (Carrier). Airflow, filter or grounding issues can cause it too, so the line says "often".
- CO alarm: four beeps and a pause = carbon monoxide, get outside, call 911. One chirp about every minute = low battery (First Alert, Kidde).

**Demo placeholders:** "Demo HVAC", the $49 offer and the phone number are fictional. Replace them with client-approved details before any real use.

## How it is built (no GPU, no paid credits)

| Layer | Tool | Notes |
|---|---|---|
| Story, bible, scripts, ledger | Claude | `cold-feet/series.json`, `cold-feet/episodes/epNN.json`, `cold-feet/ledger.json` |
| Character consistency | Vector characters drawn in code (`remotion/characters.tsx`) | A "locked look" by construction: frank-v1, nefi-v1, tech-v1. Original designs (no Universal-style flat head or neck bolts). |
| Voices | Kokoro via `kokoro-onnx`, free and local | One fixed voice per character in the bible: Frank `am_onyx`, Nefi `bf_emma`, Dee `am_eric`, Narrator `bm_lewis` |
| Sound effects | Synthesized with numpy in `scripts/make_audio.py` | No third-party audio files |
| Lip flaps | Per-frame loudness of each line | Mouth opens with the voice |
| Captions | Speaker chip + up to 6 words, spoken word highlighted | Word times are estimated from text length (no aligner yet) |
| Assembly and render | Remotion, same encoding as `scripts/render.ts` | 1080x1920, 30 fps, H.264 CRF 16, AAC |

## Commands (from the repo root)

```bash
# once: local voice engine (about 120 MB), no PyTorch needed
python3.12 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
mkdir -p .venv/models && cd .venv/models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ../..

# per episode
.venv/bin/python modules/series/scripts/make_audio.py modules/series/cold-feet/episodes/ep01.json   # voices + sfx + manifest
python3 modules/series/scripts/continuity_check.py modules/series/cold-feet                          # bible + ledger check
npx remotion studio                                                                                   # preview: folder "Series"
node modules/series/scripts/render.ts cold-feet-ep01                                                  # out/series/<id>.mp4 + .srt
```

In the Claude Code cloud sandbox, set
`REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.

## Episode script format

Each shot has a `location` (living-room, basement, outside, card, endcard), a `camera` (`focus` on a
character, `furnace`, `both` or `wide`, plus `zoom`), a `cast` (position, pose, expression, outfit),
`fx` (cold, warm, dark, snow, recap, title, next, puddle, van-parked) and `beats`:

- `{ "type": "line", "who": "nefi", "text": "...", "expr": "scared" }` voiced line (optional expression while speaking)
- `{ "type": "sfx", "name": "ignite", "label": "FWOOSH", "react": { "frank": { "pose": "arms-up", "expr": "scared" } } }`
- `{ "type": "pause", "ms": 600 }`

Effects also drive the world: `ignite` / `cutoff` / `zap` turn the furnace flame on or off, `chirp`
blinks the CO alarm, `zap` flashes and shakes the camera, `van` drives the van in.

## Licenses (verify before client work)

| Item | License | Source |
|---|---|---|
| Kokoro-82M weights | Apache 2.0 (verify on the Hugging Face model card) | huggingface.co/hexgrad/Kokoro-82M |
| kokoro-onnx | MIT (verify on GitHub) | github.com/thewh1teagle/kokoro-onnx |
| Remotion | see `LICENSE_NOTES.md` | |
| Characters, sets, sound effects | original, made in this repo | |

## Next steps toward real AI video

1. Swap the estimated word times for faster-whisper alignment (studio prompt v2, Phase 1).
2. Use these vector characters as the reference sheet, then generate stills or clips with the cloud
   route (Higgsfield, with approval per run) or the local ComfyUI route, keeping the same bible,
   voices and ledger.
