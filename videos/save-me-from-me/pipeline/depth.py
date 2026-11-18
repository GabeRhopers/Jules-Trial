"""Depth maps with Depth Anything V2 Small (Apache 2.0). Near = white, far = black, 16-bit PNG.
Usage: depth.py <out_dir> <image> [<image> ...]"""
import sys, os, numpy as np, torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
torch.set_num_threads(2)
name = "depth-anything/Depth-Anything-V2-Small-hf"
proc = AutoImageProcessor.from_pretrained(name); model = AutoModelForDepthEstimation.from_pretrained(name).eval()
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for f in sys.argv[2:]:
    img = Image.open(f).convert("RGB")
    with torch.no_grad():
        pred = model(**proc(images=img, return_tensors="pt")).predicted_depth
    d = torch.nn.functional.interpolate(pred[None], size=img.size[::-1], mode="bicubic", align_corners=False)[0, 0].numpy()
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    tag = os.path.basename(os.path.dirname(os.path.dirname(f))) + "_" + os.path.splitext(os.path.basename(f))[0]
    Image.fromarray((d * 65535).astype(np.uint16)).save(os.path.join(out, f"{tag}.png"))
    print("depth", tag)
