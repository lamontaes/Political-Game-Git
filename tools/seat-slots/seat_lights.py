"""Copies of every seat cut-out for a place's other lights (morning, night, rain): moved by how that
painting is shifted against midday, and recolored to its light from the room right around the seat.

usage: seat_lights.py OUTDIR MIDDAY.jpg light=PATH [light=PATH ...]
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from align import align
W, H = 1672, 941

def main(outdir, midday, lights):
    meta = json.load(open(os.path.join(outdir, "seats.json")))
    O = np.array(Image.open(midday).convert("RGB").resize((W, H)))
    for spec in lights:
        name, path = spec.split("=", 1)
        L = np.array(Image.open(path).convert("RGB").resize((W, H), Image.LANCZOS))
        # Where midday's pixels sit in this light: flow from midday to it.
        aligned, _, (gy, gx) = align(O, L, np.zeros((H, W), bool))
        for s in meta["seats"]:
            for v in s["variants"]:
                im = np.array(Image.open(os.path.join(outdir, "cut", v["file"])).convert("RGBA")).astype(float)
                h, w = im.shape[:2]
                x0, y0 = v["left"], v["top"]
                cy, cx = min(H - 1, y0 + h // 2), min(W - 1, x0 + w // 2)
                dy, dx = gy[cy, cx], gx[cy, cx]
                # Ring of room around the person: midday vs this light, same spot.
                a = im[..., 3] > 30
                full = np.zeros((H, W), bool)
                full[y0:y0 + h, x0:x0 + w] = a[: H - y0, : W - x0]
                ring = ndimage.binary_dilation(full, iterations=10) & ~ndimage.binary_dilation(full, iterations=2)
                src = O[ring].astype(float)
                dst = aligned[ring].astype(float)
                rgb = im[..., :3].copy()
                for c in range(3):
                    A = np.vstack([src[:, c], np.ones(len(src))]).T
                    gain, bias = np.linalg.lstsq(A, dst[:, c], rcond=None)[0]
                    gain = float(np.clip(gain, 0.25, 1.6))
                    rgb[..., c] = rgb[..., c] * gain + bias
                out = np.dstack([np.clip(rgb, 0, 255), im[..., 3]]).astype(np.uint8)
                fn = v["file"].replace(".png", f"__{name}.png")
                Image.fromarray(out).save(os.path.join(outdir, "cut", fn))
                v.setdefault("lights", {})[name] = {"file": fn, "left": int(round(x0 + dx)), "top": int(round(y0 + dy))}
        print("light", name, "done")
    json.dump(meta, open(os.path.join(outdir, "seats.json"), "w"), indent=1)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
