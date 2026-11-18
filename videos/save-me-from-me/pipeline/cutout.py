"""Alpha mattes of Alisson with rembg (MIT). Writes grayscale masks (white = her).
Usage: cutout.py <model> <out_dir> <image> [<image> ...]   models: isnet-general-use, birefnet-portrait, birefnet-general"""
import sys, os, time
from PIL import Image
from rembg import new_session, remove
session = new_session(sys.argv[1]); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
for f in sys.argv[3:]:
    t = time.time()
    mask = remove(Image.open(f).convert("RGB"), session=session, only_mask=True, post_process_mask=True)
    mask.save(os.path.join(out, os.path.basename(f)))
    print(f"{os.path.basename(f)} {time.time() - t:.1f}s")
