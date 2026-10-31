"""Builds the audio track and timing manifest for one series episode.

Usage (from the repo root):
    .venv/bin/python modules/series/scripts/make_audio.py modules/series/cold-feet/episodes/ep01.json

What it does:
  1. Every dialogue line is voiced with Kokoro (kokoro-onnx, free and local), using the fixed voice
     of its character from the series bible. Lines are cached by text + voice settings.
  2. Sound effects are synthesized here with numpy (no third-party audio files, so no license issue).
  3. Lines, effects and pauses are laid out on one timeline, shot by shot.
  4. Writes public/audio/series/<episode-id>/episode.wav and manifest.json with: shot times,
     line times, word times (estimated, see below), a per-frame mouth envelope for lip flaps,
     and effect times (the video uses them for the flame, flashes and comic sound words).

Word times: kokoro-onnx does not return timestamps, so each word gets a share of the line's voiced
duration weighted by its length and punctuation. Good enough for captions in a test; the planned
faster-whisper alignment (studio prompt v2, Phase 1) would replace it.

Setup: .venv with kokoro-onnx + soundfile, and the two model files in .venv/models/
(kokoro-v1.0.int8.onnx, voices-v1.0.bin). See modules/series/README.md.
"""
import hashlib
import json
import math
import os
import re
import sys

import numpy as np
import soundfile as sf

SR = 24000
FPS = 30
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MODELS = os.path.join(ROOT, ".venv", "models")

GAP_AFTER_LINE_MS = 260
SHOT_LEAD_MS = 200
SHOT_TAIL_MS = 250
CARD_MIN_MS = 2600


# ---------- sound effects (all synthesized) ----------

def _t(seconds):
    return np.arange(int(SR * seconds)) / SR


def _env(n, attack=0.005, release=0.1):
    a = max(1, int(SR * attack))
    r = max(1, int(SR * release))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


def _noise(n, seed):
    return np.random.default_rng(seed).uniform(-1, 1, n)


def _lowpass(x, alpha):
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def sfx(name):
    if name == "click":
        out = np.zeros(int(SR * 0.45))
        for start in (0.0, 0.18):
            t = _t(0.025)
            tick = np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 220) + 0.4 * _noise(len(t), 1) * np.exp(-t * 300)
            s = int(SR * start)
            out[s:s + len(tick)] += tick
        return out * 0.7
    if name == "ignite":
        t = _t(1.3)
        n = _lowpass(_noise(len(t), 2), 0.08)
        swell = np.clip(t / 0.25, 0, 1) * np.exp(-np.clip(t - 0.35, 0, None) * 2.2)
        rumble = 0.35 * np.sin(2 * np.pi * 55 * t) * swell
        return (n * 2.8 * swell + rumble) * 0.8
    if name == "cutoff":
        t = _t(0.5)
        return (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 9) + 0.25 * _lowpass(_noise(len(t), 3), 0.2) * np.exp(-t * 25)) * 0.9
    if name == "zap":
        t = _t(0.9)
        crackle = _noise(len(t), 4) * (np.sin(2 * np.pi * 60 * t) > 0.2)
        buzz = 0.5 * np.sign(np.sin(2 * np.pi * 120 * t))
        boom = 0.8 * np.sin(2 * np.pi * 45 * t) * np.exp(-t * 4)
        return (0.55 * crackle + 0.25 * buzz + boom) * np.exp(-t * 2.5) * 0.9
    if name == "chirp":
        t = _t(0.09)
        return 0.55 * np.sin(2 * np.pi * 3200 * t) * _env(len(t), 0.003, 0.02)
    if name == "sting":
        t = _t(2.2)
        chord = sum(np.sin(2 * np.pi * f * t) for f in (110, 130.8, 155.6, 220))
        return 0.18 * chord * np.clip(t / 0.15, 0, 1) * np.exp(-t * 1.3)
    if name == "hum":
        t = _t(2.6)
        n = _lowpass(_noise(len(t), 5), 0.03) * 2.5
        return (n + 0.15 * np.sin(2 * np.pi * 60 * t)) * _env(len(t), 0.4, 0.6) * 0.6
    if name == "van":
        t = _t(1.8)
        f = 38 + 14 * np.clip(t / 1.2, 0, 1)
        phase = 2 * np.pi * np.cumsum(f) / SR
        engine = 0.5 * np.sign(np.sin(phase)) * 0.3 + 0.4 * np.sin(phase * 2)
        return _lowpass(engine, 0.15) * _env(len(t), 0.5, 0.6) * 1.2
    if name == "pop":
        t = _t(0.12)
        return (np.sin(2 * np.pi * 900 * t) * np.exp(-t * 60) + 0.3 * _noise(len(t), 6) * np.exp(-t * 90)) * 0.6
    if name == "drip":
        t = _t(0.25)
        f = 1400 * np.exp(-t * 14) + 500
        return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18)
    raise SystemExit(f"Unknown sound effect '{name}'")


# ---------- voice ----------

_kokoro = None


def kokoro():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(os.path.join(MODELS, "kokoro-v1.0.int8.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    return _kokoro


def spoken_text(text, pronunciations):
    for p in sorted(pronunciations, key=lambda p: -len(p["term"])):
        text = re.sub(rf"(?<![\w]){re.escape(p['term'])}(?![\w])", p["say"], text)
    return text


def trim(audio, threshold=0.012):
    idx = np.where(np.abs(audio) > threshold)[0]
    if len(idx) == 0:
        return audio
    start = max(0, idx[0] - int(SR * 0.02))
    end = min(len(audio), idx[-1] + int(SR * 0.06))
    return audio[start:end]


def voice_line(text, voice, pronunciations, cache_dir):
    say = spoken_text(text, pronunciations)
    key = hashlib.sha1(json.dumps([say, voice], sort_keys=True).encode()).hexdigest()[:16]
    path = os.path.join(cache_dir, f"{key}.wav")
    if os.path.exists(path):
        audio, _ = sf.read(path, dtype="float32")
        return audio
    samples, sr = kokoro().create(say, voice=voice["voice"], speed=float(voice.get("speed", 1.0)), lang=voice.get("lang", "en-us"))
    assert sr == SR, f"Unexpected sample rate {sr}"
    audio = trim(np.asarray(samples, dtype=np.float32))
    sf.write(path, audio, SR)
    return audio


def word_times(text, start_ms, dur_ms):
    """Estimated word timings: each word gets a share weighted by letters plus punctuation pauses."""
    words = text.split()
    weights = []
    for w in words:
        letters = len(re.sub(r"[^\w]", "", w)) or 1
        pause = 4 if re.search(r"[.!?]$", w) else 2 if re.search(r"[,;:]$|\.\.\.$", w) else 0
        weights.append((letters + 1.2, pause))
    total = sum(a + b for a, b in weights)
    out, t = [], start_ms
    for w, (a, b) in zip(words, weights):
        d = dur_ms * a / total
        out.append({"text": w, "startMs": round(t), "endMs": round(t + d)})
        t += d + dur_ms * b / total
    return out


def mouth_envelope(audio):
    per = SR // FPS
    frames = math.ceil(len(audio) / per)
    rms = np.array([np.sqrt(np.mean(audio[i * per:(i + 1) * per] ** 2) + 1e-12) for i in range(frames)])
    ref = np.percentile(rms, 90) or 1.0
    return [round(float(min(1.0, v / ref)), 2) for v in rms]


# ---------- build ----------

def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: make_audio.py <episode.json>")
    ep_path = os.path.abspath(sys.argv[1])
    episode = json.load(open(ep_path))
    series_dir = os.path.dirname(os.path.dirname(ep_path))
    series = json.load(open(os.path.join(series_dir, "series.json")))
    chars = {c["id"]: c for c in series["characters"]}
    pron = series.get("pronunciations", [])

    out_dir = os.path.join(ROOT, "public", "audio", "series", episode["id"])
    cache_dir = os.path.join(ROOT, "public", "audio", "series", "_cache")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)

    clips = []  # (start_sample, audio, gain)
    shots, lines, effects = [], [], []
    cursor = 0.0  # ms

    def place(audio, gain=1.0):
        clips.append((int(cursor * SR / 1000), audio, gain))
        return len(audio) / SR * 1000

    for shot in episode["shots"]:
        shot_start = cursor
        cursor += SHOT_LEAD_MS
        for beat in shot["beats"]:
            kind = beat["type"]
            if kind == "line":
                who = beat["who"]
                if who not in chars:
                    raise SystemExit(f"Shot {shot['id']}: unknown character '{who}'")
                audio = voice_line(beat["text"], chars[who]["voice"], pron, cache_dir)
                dur = place(audio)
                lines.append({
                    "who": who,
                    "shot": shot["id"],
                    "text": beat["text"],
                    "expr": beat.get("expr"),
                    "startMs": round(cursor),
                    "endMs": round(cursor + dur),
                    "words": word_times(beat["text"], cursor, dur),
                    "mouth": mouth_envelope(audio),
                })
                cursor += dur + beat.get("gapMs", GAP_AFTER_LINE_MS)
            elif kind == "sfx":
                audio = sfx(beat["name"])
                gain = beat.get("gain", 0.9)
                dur = place(audio, gain)
                effects.append({"name": beat["name"], "label": beat.get("label"), "react": beat.get("react"), "shot": shot["id"], "startMs": round(cursor)})
                # Effects overlap the next beat a little so the pacing stays snappy
                cursor += dur * beat.get("hold", 0.75)
            elif kind == "pause":
                cursor += beat["ms"]
            else:
                raise SystemExit(f"Shot {shot['id']}: unknown beat type '{kind}'")
        cursor += SHOT_TAIL_MS
        if shot["location"] in ("card", "endcard"):
            cursor = max(cursor, shot_start + CARD_MIN_MS)
        shots.append({"id": shot["id"], "startMs": round(shot_start), "endMs": round(cursor)})

    total = int(cursor * SR / 1000) + SR // 2
    mix = np.zeros(total, dtype=np.float64)
    for start, audio, gain in clips:
        end = min(total, start + len(audio))
        mix[start:end] += audio[: end - start] * gain
    peak = np.max(np.abs(mix)) or 1.0
    mix = mix / peak * 0.89  # about -1 dBFS
    sf.write(os.path.join(out_dir, "episode.wav"), mix.astype(np.float32), SR)

    manifest = {
        "episode": episode["id"],
        "voiceEngine": "kokoro-onnx (Kokoro-82M v1.0, int8)",
        "wordTimes": "estimated from text length (no aligner yet)",
        "durationMs": round(total / SR * 1000),
        "audio": f"audio/series/{episode['id']}/episode.wav",
        "shots": shots,
        "lines": lines,
        "effects": effects,
    }
    json.dump(manifest, open(os.path.join(out_dir, "manifest.json"), "w"), indent=1)
    print(f"{episode['id']}: {manifest['durationMs'] / 1000:.1f} s, {len(shots)} shots, {len(lines)} lines, {len(effects)} effects")


if __name__ == "__main__":
    main()
