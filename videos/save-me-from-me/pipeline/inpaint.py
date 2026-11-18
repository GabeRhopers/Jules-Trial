"""Remove objects or extend images with LaMa (big-lama, Apache 2.0), run directly with TorchScript.
Usage: inpaint.py <image> <mask> <out> [grow_px] [work_scale]   mask: white = area to fill
Big holes fill better at a lower working scale (e.g. 0.5); the fill is then upscaled and blended into the original."""
import sys, numpy as np, torch, cv2
torch.set_num_threads(2); torch.set_grad_enabled(False)
img = cv2.imread(sys.argv[1])[:, :, ::-1]; mask = cv2.imread(sys.argv[2], cv2.IMREAD_GRAYSCALE)
grow = int(sys.argv[4]) if len(sys.argv) > 4 else 15
if grow: mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow * 2 + 1, grow * 2 + 1)))
scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
full_img, full_mask = img, mask
if scale != 1.0:
    img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    mask = cv2.resize(mask, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_NEAREST)
mask = (mask > 127).astype(np.float32)
h, w = mask.shape; ph, pw = (8 - h % 8) % 8, (8 - w % 8) % 8
t_img = torch.from_numpy(np.pad(img, ((0, ph), (0, pw), (0, 0)), mode="reflect").copy()).permute(2, 0, 1)[None].float() / 255
t_msk = torch.from_numpy(np.pad(mask, ((0, ph), (0, pw)), mode="reflect").copy())[None, None]
model = torch.jit.load("/home/user/mv-models/big-lama.pt", map_location="cpu").eval()
res = (model(t_img, t_msk)[0].permute(1, 2, 0).numpy()[:h, :w].clip(0, 1) * 255).astype(np.uint8)
if scale != 1.0:
    res = cv2.resize(res, (full_img.shape[1], full_img.shape[0]), interpolation=cv2.INTER_CUBIC)
    soft = cv2.GaussianBlur((full_mask > 127).astype(np.float32), (0, 0), 6)[:, :, None]
    res = (res * soft + full_img * (1 - soft)).astype(np.uint8)
cv2.imwrite(sys.argv[3], res[:, :, ::-1])
print("wrote", sys.argv[3])
