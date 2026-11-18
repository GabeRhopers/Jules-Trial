"""Slow motion with RIFE 4.25 (Practical-RIFE, MIT): inserts frames between each pair.
Usage: slowmo.py <frames_dir> <out_dir> <factor> [rife_dir]
factor 4 = 4x more frames (plays 4x slower at the same frame rate)."""
import sys, os, glob, time
import numpy as np, torch, cv2
src, out, factor = sys.argv[1], sys.argv[2], int(sys.argv[3])
rife_dir = sys.argv[4] if len(sys.argv) > 4 else "/home/user/mv-models/Practical-RIFE"
sys.path.insert(0, rife_dir); os.chdir(rife_dir)
from train_log.RIFE_HDv3 import Model
torch.set_num_threads(4); torch.set_grad_enabled(False)
model = Model(); model.load_model("train_log", -1); model.eval(); model.device()
os.makedirs(out, exist_ok=True)
files = sorted(glob.glob(os.path.join(src, "*.png")))
def load(f):
    img = cv2.imread(f)[:, :, ::-1].copy()
    t = torch.from_numpy(img).permute(2, 0, 1).float()[None] / 255.0
    h, w = t.shape[2:]; ph, pw = (64 - h % 64) % 64, (64 - w % 64) % 64
    return torch.nn.functional.pad(t, (0, pw, 0, ph)), h, w
def save(t, h, w, i):
    arr = (t[0, :, :h, :w].clamp(0, 1).permute(1, 2, 0).numpy() * 255).round().astype(np.uint8)
    cv2.imwrite(os.path.join(out, f"{i:05d}.png"), arr[:, :, ::-1])
n = 0; t0 = time.time()
prev, h, w = load(files[0])
for f in files[1:]:
    cur, _, _ = load(f)
    save(prev, h, w, n); n += 1
    for k in range(1, factor):
        save(model.inference(prev, cur, k / factor), h, w, n); n += 1
    prev = cur
save(prev, h, w, n); n += 1
print(f"{os.path.basename(src.rstrip('/'))}: {len(files)} -> {n} frames in {time.time() - t0:.0f}s")
