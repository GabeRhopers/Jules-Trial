# Song analysis (Phase 1)

The song itself (`Save_me_From_me_Remastered_x2.mp3`) is not committed. Re-upload it to recreate the stems.

| File | What it is |
|---|---|
| `grid.json` | 81 BPM beat grid: every beat, every bar, and the story cue times used in `../beat-sheet.md` |
| `drum-hits.json` | Strong drum hits (from the Demucs drum stem), for crack branches and cuts |
| `lyrics-aligned.json` | Your lyrics aligned to the vocals (reliable up to 1:17; later sections differ from the text) |
| `vocals-transcript.json` | Word-level transcript of the isolated vocals (used after 1:17) |
| `lyrics.txt` | Lyrics as written |

Tools (free, CPU): Demucs 4.1.0 (`htdemucs`, about 11 min for this song), librosa 1.0.1, stable-ts 2.19.1 with
faster-whisper. Install: `python3.12 -m venv mv-venv && mv-venv/bin/pip install torch torchaudio --index-url
https://download.pytorch.org/whl/cpu && mv-venv/bin/pip install demucs librosa stable-ts faster-whisper soundfile`.
