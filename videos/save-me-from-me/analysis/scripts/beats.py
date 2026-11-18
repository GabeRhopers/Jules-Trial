import sys, json, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
tempo = float(np.atleast_1d(tempo)[0])
# downbeat guess: strongest of 4 phases by onset strength
onset = librosa.onset.onset_strength(y=y, sr=sr)
bf = librosa.time_to_frames(beats, sr=sr)
scores = [onset[bf[p::4]].mean() for p in range(4)]
phase = int(np.argmax(scores))
bars = beats[phase::4]
# structural boundaries from chroma+mfcc recurrence
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
feat = librosa.util.sync(np.vstack([librosa.util.normalize(mfcc, axis=1), chroma]), bf)
bounds = librosa.segment.agglomerative(feat, 14)
btimes = [round(float(beats[min(b, len(beats)-1)]), 2) for b in bounds]
json.dump({"tempo": tempo, "beats": [round(float(b), 3) for b in beats], "bars": [round(float(b), 3) for b in bars],
           "downbeat_phase": phase, "segments": btimes}, open(sys.argv[2], "w"))
print(f"tempo {tempo:.1f} BPM, {len(beats)} beats, {len(bars)} bars, first beat {beats[0]:.2f}s")
print("segment starts:", btimes)
