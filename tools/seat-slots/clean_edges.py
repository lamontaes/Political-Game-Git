"""Clear background halo from seat cut-outs: pixels near a cut-out's edge whose color matches the empty room at
that spot are room, not person. usage: clean_edges.py OUTDIR PLATE.jpg [ring=8] [tol=30]"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
d, plate = sys.argv[1], sys.argv[2]
ring_w = int(sys.argv[3]) if len(sys.argv) > 3 else 8
tol = int(sys.argv[4]) if len(sys.argv) > 4 else 30
meta = json.load(open(os.path.join(d, "seats.json")))
P = np.array(Image.open(plate).convert("RGB").resize((meta["width"], meta["height"]))).astype(int)
n = cleared = 0
for s in meta["seats"]:
    for v in s["variants"]:
        fp = os.path.join(d, "cut", v["file"])
        im = np.array(Image.open(fp).convert("RGBA")).astype(int)
        h, w = im.shape[:2]; x0, y0 = v["left"], v["top"]
        bg = P[y0:y0 + h, x0:x0 + w]
        hh, ww = bg.shape[:2]
        a = im[:hh, :ww, 3] > 20
        ring = a & ~ndimage.binary_erosion(a, iterations=ring_w)
        same = np.abs(im[:hh, :ww, :3] - bg).max(axis=2) < tol
        kill = ring & same
        # keep only the part still attached to the body
        keep = a & ~kill
        lab, k = ndimage.label(keep)
        if k > 1:
            sz = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
            big = np.isin(lab, 1 + np.nonzero(sz >= max(30, 0.02 * keep.sum()))[0])
            keep = big
        alpha = ndimage.gaussian_filter(keep.astype(float), 0.7) * 255
        alpha = np.minimum(alpha, im[:hh, :ww, 3])
        im[:hh, :ww, 3] = alpha.astype(int)
        cleared += int(kill.sum()); n += 1
        Image.fromarray(im.astype(np.uint8)).save(fp)
print("cleaned", n, "cut-outs, cleared px", cleared)
