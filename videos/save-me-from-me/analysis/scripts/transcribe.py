import sys, json
import soundfile as sf, numpy as np, librosa
from faster_whisper import WhisperModel
y, sr = sf.read(sys.argv[1], dtype="float32")
if y.ndim > 1: y = y.mean(axis=1)
y = librosa.resample(y, orig_sr=sr, target_sr=16000)
m = WhisperModel(sys.argv[3] if len(sys.argv) > 3 else "small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(y, language="en", word_timestamps=True, condition_on_previous_text=False)
out = []
for s in segs:
    out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
                "words": [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)} for w in s.words]})
    print(f"{s.start:7.2f} {s.end:7.2f}  {s.text.strip()}")
json.dump(out, open(sys.argv[2], "w"), indent=1)
