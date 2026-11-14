"""Kokoro text-to-speech helper, called by scripts/narrate.ts (one scene per call).

Reads JSON from stdin:  {"text": "...", "voice": "af_heart", "lang": "a", "speed": 1.0, "out_wav": "path.wav"}
Writes a 24 kHz WAV and prints JSON to stdout:
  {"durationMs": 5230, "tokens": [{"charStart": 0, "charEnd": 4, "startMs": 0, "endMs": 310}, ...]}

Word timestamps come from Kokoro's English pipeline (MToken.start_ts / end_ts, kokoro >= 0.9.4).
Other languages (e.g. lang "p", Brazilian Portuguese) return none, so they are estimated (estimate_tokens).
Setup (once, inside this project, no global install): see SETUP_LOG.md "Kokoro setup".
"""
import json
import re
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

SAMPLE_RATE = 24000


def estimate_tokens(text: str, audio: np.ndarray) -> list:
    """Spreads words over the speech (leading/trailing silence trimmed) by letter count.
    Punctuation adds a short pause weight. Approximate, but close enough for 2-4 word caption pages."""
    loud = np.flatnonzero(np.abs(audio) > 0.02)
    start_s = loud[0] / SAMPLE_RATE if len(loud) else 0.0
    end_s = loud[-1] / SAMPLE_RATE if len(loud) else len(audio) / SAMPLE_RATE
    words = [(m.start(), m.end()) for m in re.finditer(r"\S+", text)]
    weights = []
    for a, b in words:
        w = text[a:b]
        weights.append(sum(c.isalnum() for c in w) + 1 + (3 if w[-1] in ",;:" else 6 if w[-1] in ".!?" else 0))
    total = sum(weights) or 1
    tokens, t = [], start_s
    for (a, b), w in zip(words, weights):
        dur = (end_s - start_s) * w / total
        tokens.append({"charStart": a, "charEnd": b, "startMs": round(t * 1000), "endMs": round((t + dur) * 1000)})
        t += dur
    return tokens


def main() -> None:
    req = json.load(sys.stdin)
    text = req["text"]
    pipeline = KPipeline(lang_code=req.get("lang", "a"), repo_id="hexgrad/Kokoro-82M")
    chunks = []
    tokens = []
    offset_s = 0.0
    cursor = 0
    # split_pattern=None keeps the scene as one piece; Kokoro still splits very long text internally
    for result in pipeline(text, voice=req["voice"], speed=float(req.get("speed", 1.0)), split_pattern=None):
        if result.audio is None:
            continue
        audio = result.audio.cpu().numpy() if hasattr(result.audio, "cpu") else np.asarray(result.audio)
        for t in result.tokens or []:
            if t.start_ts is None or t.end_ts is None or not t.text.strip():
                continue
            # Find this token in the original text to get its character offsets
            pos = text.find(t.text, cursor)
            if pos == -1:
                continue
            cursor = pos + len(t.text)
            tokens.append({
                "charStart": pos,
                "charEnd": pos + len(t.text),
                "startMs": round((offset_s + t.start_ts) * 1000),
                "endMs": round((offset_s + t.end_ts) * 1000),
            })
        chunks.append(audio)
        offset_s += len(audio) / SAMPLE_RATE

    if not chunks:
        raise SystemExit("Kokoro produced no audio")
    full = np.concatenate(chunks)
    if not tokens:
        # Non-English pipelines (espeak-ng) return no timestamps: estimate them
        tokens = estimate_tokens(text, full)
    sf.write(req["out_wav"], full, SAMPLE_RATE)
    print(json.dumps({"durationMs": round(len(full) / SAMPLE_RATE * 1000), "tokens": tokens}))


if __name__ == "__main__":
    main()
