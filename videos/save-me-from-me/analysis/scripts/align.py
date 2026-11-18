import sys, json, stable_whisper
model = stable_whisper.load_faster_whisper("small", device="cpu", compute_type="int8")
text = open(sys.argv[2]).read()
res = model.align(sys.argv[1], text, language="en")
lines = []
for seg in res.segments:
    lines.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip(),
                  "words": [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for w in seg.words]})
json.dump(lines, open(sys.argv[3], "w"), indent=1)
for l in lines: print(f'{l["start"]:7.2f} {l["end"]:7.2f}  {l["text"]}')
