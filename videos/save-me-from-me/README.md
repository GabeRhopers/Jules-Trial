# Save Me From Me (music video MVP)

1920 x 1080, 4:33, story and timing in `beat-sheet.md`. Composition id: `save-me-from-me`
(`src/compositions/music/`). Everything is free and runs on the cloud machine's CPU.

## Rebuild from scratch
Large media is git-ignored, so a new session needs the two source clips and the MP3 again
(`public/broll/save-me-from-me/source/clipA.mp4`, `clipB.mp4`).

1. Tools: a Python 3.12 venv with CPU PyTorch + `demucs librosa stable-ts faster-whisper rembg[cpu] transformers
   opencv-python-headless gdown` (see `analysis/README.md`), RIFE 4.25 (Practical-RIFE + weights from its README)
   and LaMa `big-lama.pt` (simple-lama-inpainting release) in `/home/user/mv-models`.
2. Split the clips into shots (cuts at 2.04 s / 3.46 s in clip A, 2.0 s / 3.33 s in clip B) as PNG frames in
   `public/broll/save-me-from-me/shots/<shot>/frames`.
3. `pipeline/slowmo.py <frames> <out> 4` for each shot (RIFE, about 1 to 4 min per shot).
4. Empty rooms: `pipeline/cutout.py` (rembg) for a mask, then `pipeline/inpaint.py <img> <mask> <out> 25 0.5` (LaMa)
   into `public/broll/save-me-from-me/plates/kitchenA-empty.png` and `bathroom-empty.png`.
5. `bash pipeline/prepare-assets.sh <song.mp3>` (clips, reversed clips, film grain, song).
6. `npx remotion render save-me-from-me out/music/save-me-from-me.mp4 --codec=h264 --crf=18 --concurrency=4`

## How it works
- `timing.ts`: beat grid, cue times and drum hits drive the crack level (0 to 1 and back), hit flashes and the
  color grade (cold, breakage glow, warm).
- `Cracks.tsx`: crack networks and glass shards generated in code (same seed = same cracks every frame), so they
  grow on drum hits and reverse exactly.
- `SaveMeFromMe.tsx`: the shot list, three layouts (portrait window over a blurred copy, full-frame crop,
  "me vs me" split screen), grade, grain and title.
