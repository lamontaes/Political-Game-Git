"""People mask without Adobe, for very sparse crowd versions: what differs from the empty room after alignment.
usage: local_mask.py PLATE VERSION OUT.png"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from align import align
W, H = 1672, 941
def mask(plate, version):
    O = np.array(Image.open(plate).convert("RGB").resize((W, H)))
    V = np.array(Image.open(version).convert("RGB").resize((W, H), Image.LANCZOS))
    rough = np.abs(V.astype(int) - O.astype(int)).max(axis=2) > 60
    warped, _, _ = align(O, V, ndimage.binary_dilation(ndimage.binary_opening(rough, iterations=2), iterations=6))
    a = np.array(Image.fromarray(warped).filter(ImageFilter.GaussianBlur(1.2))).astype(int)
    b = np.array(Image.fromarray(O).filter(ImageFilter.GaussianBlur(1.2))).astype(int)
    d = np.abs(a - b).max(axis=2)
    strong = ndimage.binary_opening(d > 55, iterations=2)
    weak = d > 18
    lab, k = ndimage.label(weak)
    keep = np.zeros(k + 1, bool); keep[np.unique(lab[strong])] = True; keep[0] = False
    m = keep[lab]
    m = ndimage.binary_closing(m, iterations=4)
    m = ndimage.binary_fill_holes(m)
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m)
    if k:
        sz = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
        m = np.isin(lab, 1 + np.nonzero(sz >= 500)[0])
    return m
if __name__ == "__main__":
    m = mask(sys.argv[1], sys.argv[2])
    Image.fromarray((m * 255).astype(np.uint8)).resize((1376, 768)).convert("RGBA").save(sys.argv[3])
