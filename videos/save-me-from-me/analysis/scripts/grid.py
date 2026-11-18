import json, sys, numpy as np, librosa
d = sys.argv[1]
y, sr = librosa.load(f"{d}/song.mp3", sr=22050)
onset = librosa.onset.onset_strength(y=y, sr=sr)
t, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, start_bpm=80, units="time")
bf = librosa.time_to_frames(beats, sr=sr)
phase = int(np.argmax([onset[bf[p::4]].mean() for p in range(4)]))
bars = beats[phase::4]
print(f"tempo {float(np.atleast_1d(t)[0]):.1f}, beats {len(beats)}, bars {len(bars)}, first downbeat {bars[0]:.2f}, median bar {np.median(np.diff(bars)):.2f}s")
snap = lambda x: float(beats[np.argmin(abs(beats - x))])
cues = {"drums_in": 18.13, "V1": 27.48, "PC1": 37.1, "CH1": 50.02, "from_me_1": 59.3, "from_me_2": 70.0, "save_me_last": 73.9,
        "break": 77.6, "V2": 104.14, "walls": 117.82, "PC2": 127.56, "CH2": 142.64, "transition": 165.5, "bridge": 175.66,
        "instr2": 189.0, "FC": 213.26, "vocals_end": 239.9, "tail": 248.0, "fade": 260.0, "end": 272.7}
out = {k: round(snap(v), 2) if k != "end" else v for k, v in cues.items()}
for k, v in out.items(): print(f"{k:13s} {cues[k]:7.2f} -> {v:7.2f}  ({int(v//60)}:{v%60:05.2f})")
json.dump({"tempo": 80.7, "beats": [round(float(b), 3) for b in beats], "bars": [round(float(b), 3) for b in bars], "cues": out},
          open(f"{d}/grid.json", "w"), indent=1)
