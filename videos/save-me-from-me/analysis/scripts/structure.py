import json, sys, numpy as np, librosa
d = sys.argv[1]
al = json.load(open(f"{d}/lyrics-aligned.json")); tr = json.load(open(f"{d}/vocals-transcript.json"))
words = [w for l in al for w in l["words"] if w["s"] < 78] + [w for l in tr for w in l["words"] if w["s"] >= 78]
def first(phrase, after=0):
    toks = phrase.lower().split()
    ws = [(w["w"].lower().strip(",.!?'\""), w["s"]) for w in words]
    for i in range(len(ws) - len(toks) + 1):
        if ws[i][1] >= after and all(ws[i + j][0].startswith(t) for j, t in enumerate(toks)):
            return ws[i][1]
for label, ph, after in [("V1 In the mirror","in the mirror",0),("PC1 Can't break out","can't break out",0),("CH1 So save me","so save me",40),
    ("CH1 last Save me","save me",72),("V2 Close my eyes","close my eyes",90),("V2 Now break apart","now break apart",100),
    ("PC2 I try to run","i try to run",120),("CH2 So save me","so save me",140),("BR I need a light","i need a light",170),
    ("FC So save me","so save me",200)]:
    print(f"{label:22s} {first(ph, after)}")
print("last vocal word ends", max(w["e"] for w in words))
# tempo check on drums
y, sr = librosa.load(f"{d}/stems/htdemucs/song/drums.wav", sr=22050)
onset = librosa.onset.onset_strength(y=y, sr=sr)
for prior in (80, 160):
    t, b = librosa.beat.beat_track(onset_envelope=onset, sr=sr, start_bpm=prior, units="time")
    print(f"prior {prior}: tempo {float(np.atleast_1d(t)[0]):.1f}, beats {len(b)}")
ac = librosa.autocorrelate(onset, max_size=200); hop = 512 / sr
for bpm in (80.75, 161.5):
    lag = int(round(60 / bpm / hop)); print(f"autocorr at {bpm} BPM lag {lag}: {ac[lag]/ac[0]:.3f}")
# strong drum hits (top onsets) per 10 s
peaks = librosa.onset.onset_detect(onset_envelope=onset, sr=sr, units="time", backtrack=False)
strength = onset[librosa.time_to_frames(peaks, sr=sr)]
strong = peaks[strength > np.percentile(strength, 75)]
json.dump({"strong_hits": [round(float(x), 3) for x in strong]}, open(f"{d}/drum-hits.json", "w"))
print("strong drum hits:", len(strong), "first", [round(float(x),2) for x in strong[:6]])
