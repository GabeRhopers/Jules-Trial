# Video production workspace

Make polished, brand-consistent marketing videos with animated text, narration and word-by-word
captions, using Claude Code + Remotion. Three templates, any brand:

| Template | Size | Length | Best for |
|---|---|---|---|
| `SocialReel9x16` | 1080x1920 | 15 to 45 s | Instagram Reels, TikTok, LinkedIn, YouTube Shorts |
| `Explainer16x9` | 1920x1080 | 45 to 90 s | Website, YouTube, LinkedIn, sales follow-up emails |
| `PromoSquare1x1` | 1080x1080 | 15 to 30 s | Feed posts and ads with footage (B-roll) |

Narration: **Kokoro** (free, runs on your computer) or **ElevenLabs** (paid, premium voices).
Optional AI footage: **Higgsfield** (paid). Rules for Claude are in [CLAUDE.md](CLAUDE.md); the full setup
history is in [SETUP_LOG.md](SETUP_LOG.md).

## Quick Start

### 1. Clone and install (once)
You need **Node.js 22 or newer** (LTS), **git** and **ffmpeg**. On a Mac: `brew install node git ffmpeg`.
```bash
git clone -b claude/video-workspace https://github.com/GabeRhopers/Jules-Trial.git video-workspace
cd video-workspace
npm install
```
The first render downloads Remotion's headless browser automatically.
Windows: also run `npx remotion skills add` once (the skill shortcuts in `.claude/skills/` are symlinks).

### 2. Free voice: Kokoro (once)
Needs **Python 3.10, 3.11 or 3.12** (not 3.13 yet). Installs only inside this folder:
```bash
python3.12 -m venv .venv                       # Mac without 3.12: brew install python@3.12
.venv/bin/pip install -r requirements-kokoro.txt
npm run narrate -- ac-signs-before-summer        # first run downloads the Kokoro model
```

### 3. Premium voice: ElevenLabs (optional)
1. Copy `.env.example` to `.env` (same folder) and paste your key after `ELEVENLABS_API_KEY=`.
   Get the key at elevenlabs.io (profile menu, API Keys). `.env` is never committed. **Never paste keys into a chat.**
2. Pick a voice in the ElevenLabs Voice Library, copy its **voice ID**, and paste it into
   `voice.elevenlabs.voiceId` in the brand's `brands/<brand>/brand.json`.
3. Client videos need a paid ElevenLabs plan: the commercial license starts at Starter (elevenlabs.io/pricing, checked 2026-10-29).

### 4. AI footage: Higgsfield (optional)
Higgsfield's official MCP URL is `https://mcp.higgsfield.ai/mcp` (higgsfield.ai/mcp, checked 2026-10-29; sign-in is OAuth and lists Claude Code as a supported client). Add it with Claude Code's standard command:
```bash
claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp
```
Then start `claude`, type `/mcp`, select **higgsfield**, choose authenticate, and log in in the browser window.
Check with `claude mcp list` (it should show `✔ Connected`).
Note: Higgsfield's own "Claude Code" tab now suggests a CLI route instead (`npm i -g @higgsfield/cli`, `higgsfield auth login`, `npx skills add higgsfield-ai/skills`). This workspace's rules are written for the MCP; use one route, not both. Claude must always show you a shot list with estimated credits and wait for your OK before generating.

### 5. Start Claude Code and make a video
```bash
cd video-workspace
claude
```
Then type:
```
/new-video
```
Claude asks for brand, format, audience, goal, key benefit, offer/CTA and length, writes a
conversion-focused script for your approval, generates the narration (free Kokoro draft first;
ElevenLabs only after you approve the credit estimate), offers B-roll, opens the preview, iterates on your
feedback, runs the quality check and renders the final files.
You can also give it everything at once: `/new-video demo-home-services SocialReel9x16 water heater warning signs`.

### 6. Preview and render by hand
```bash
npm run dev                                       # Remotion Studio at http://localhost:3000
npm run qc -- <video-id>                          # quality check (safe zones, overflow, sync, contrast)
npm run render:video -- <video-id>                # out/<brand>/<video-id>.mp4 + .srt
npm run render:video -- <video-id> --brand=<id>   # same video in another brand
```
In Studio, set `showSafeZones` to see the platform UI areas, and change `brandId` to preview another brand.

### 7. Add a new client brand
```bash
npm run brand:new -- acme-aluminum --name="Acme Aluminum" --from=demo-b2b-industrial
```
Then edit `brands/acme-aluminum/brand.json`:
- `colors`, `fonts` (a Google Font listed in `src/lib/font-map.ts`, or licensed WOFF2 files in `fonts/`)
- `toneOfVoice`, default `cta`, `pronunciations` (product names, standards, local place names)
- `style`: `cornerRadius` (999 = pills, 6 = square), `headlineCase`, `motion` (`bold` or `calm`), `background` (`glow`, `grid` or `hearts`), `transition`
- `whiteboard` (optional): look of whiteboard scenes, see section 8
- `captionStyle`, `voice` (provider plus Kokoro and/or ElevenLabs settings)

Replace `logo.svg` (text converted to outlines), then check everything:
```bash
npm run brand:check -- acme-aluminum
```
Or just ask Claude: "Create a brand for Acme Aluminum from their website colors and this logo."

### 8. Whiteboard scenes (optional)
Any video can include **whiteboard scenes**: a handwritten title, then icons and labels drawn stroke by stroke
by a moving marker, each starting on the word the voice says. Best for "how it works" moments: a process,
a cause and effect, a before/after. Ask Claude for it during `/new-video` ("make the process scene a whiteboard"),
or write it in `config.json`:
```json
{
  "id": "process",
  "text": "A durable finish takes four steps. We clean the raw part, the tank grows a hard oxide layer, we dye it, and then we seal it.",
  "visual": {
    "kind": "whiteboard",
    "title": "How anodizing protects your part",
    "items": [
      { "icon": "spray", "label": "Clean and etch", "at": "clean" },
      { "icon": "bolt", "label": "Grow oxide layer", "at": "tank" },
      { "icon": "droplet", "label": "Dye", "at": "dye" },
      { "icon": "shield-check", "label": "Seal", "at": "seal", "circle": true }
    ]
  }
}
```
- `at`: the spoken word that starts each drawing. `circle`: circles the item in the brand color.
- Find icons: `npm run icon -- factory` (any of 5,203 free Tabler icons, also at tabler.io/icons).
- Look per brand (optional, `brand.json` → `whiteboard`): paper and marker colors, handwriting style
  (`marker`, `clean`, `script`), and your own hand photo instead of the built-in marker:
  `"hand": { "file": "hand.png", "tipX": 8, "tipY": 10, "height": 520 }` (PNG with transparent background in the brand folder; tip position in % of the image).
- Examples: `anodizing-process-whiteboard` (16:9) and `ac-freeze-whiteboard` (9:16).

## Estimated cost per video

| Item | 30 s reel | 60 s explainer | 20 s promo |
|---|---|---|---|
| Narration characters (one take) | about 420 | about 650 | about 230 |
| **Kokoro voice** | $0 | $0 | $0 |
| **ElevenLabs voice**, 3 takes, standard model (1 credit per character) | about 1,300 credits ≈ $0.20 to $0.30 | about 2,000 credits ≈ $0.35 to $0.45 | about 700 credits ≈ $0.10 to $0.15 |
| **Higgsfield B-roll**, per usable clip ($0.40 to $9+, often 3 to 5 attempts) | optional | optional, 2 to 4 clips | 2 clips ≈ $1 to $18+ |
| **Remotion** | $0 for teams of up to 3 people | $0 | $0 |
| **Your time** once templates exist | 20 to 30 min | 45 to 60 min | 20 to 30 min |

Notes:
- ElevenLabs dollar figures assume the Starter ($6 for 30,000 credits) to Creator ($22 for 121,000 credits) plans, and
  1 credit per character for Multilingual v2 (elevenlabs.io/pricing, checked 2026-10-29). Prices change; re-check before quoting a client.
- Higgsfield costs vary about 10x by model; ranges are third-party estimates. Check higgsfield.ai/pricing.
- Remotion: teams of 4+ people need a Company License (for example $25 per month per person who writes Remotion code). See [LICENSE_NOTES.md](LICENSE_NOTES.md).
- Cached narration is free: editing one scene only regenerates that scene.

## Example videos in this repo
| Video id | Brand | Template |
|---|---|---|
| `ac-signs-before-summer` | demo-home-services | SocialReel9x16 |
| `anodizing-spec-checklist` | demo-b2b-industrial | SocialReel9x16 |
| `anodizing-rework-explainer` | demo-b2b-industrial | Explainer16x9 |
| `spring-tuneup-promo` | demo-home-services | PromoSquare1x1 (shot 2 intentionally missing) |
| `anodizing-process-whiteboard` | demo-b2b-industrial | Explainer16x9 with 2 whiteboard scenes |
| `ac-freeze-whiteboard` | demo-home-services | SocialReel9x16 with 1 whiteboard scene |

Narration audio is not committed. Before previewing an example, run `npm run narrate -- <video-id>`
(Kokoro, free; `--provider=kokoro` for the industrial brand, which defaults to ElevenLabs), or
`npm run narrate:placeholder -- <video-id>` for a silent test track.
All example numbers and offers are demo placeholders.
