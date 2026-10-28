"""Fit a person to the mannequin that marks their spot. Every spot was measured from a flat green mannequin Firefly
painted into the room, so the person should cover that mannequin: same size, same place, sitting where it sat. The fit
tries sizes and small shifts around a first guess and keeps the one whose outline overlaps the mannequin best (IoU).
Behind a stage, desk or counter only the part above that edge is compared, since the mannequin shows only that much."""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage

_plates = {}

def plate_for(spots_path, S):
    """The room's mannequin plate at the empty painting's size."""
    key = (spots_path, S['plate'])
    if key not in _plates:
        root = spots_path.split('art/people-rooms/')[0]
        _plates[key] = np.asarray(Image.open(os.path.join(root, S['plate'])).convert('RGB').resize(tuple(S['size']), Image.LANCZOS)).astype(int)
    return _plates[key]

def mannequin(P, sp):
    """The spot's mannequin: flat green pixels joined to the one under its head, kept inside its box."""
    r, g, b = P[..., 0], P[..., 1], P[..., 2]
    green = (g > 150) & (g - r > 90) & (g - b > 90)
    x0, y0, x1, y1 = sp['box']; pad = max(4, int(0.3 * sp['headWidth']))
    box = np.zeros(green.shape, bool); box[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
    lab, _ = ndimage.label(green & box)
    hy = min(green.shape[0] - 1, int(sp['headTop'] + 0.6 * sp['headWidth'])); hx = int(sp['headX'])
    ys, xs = np.where(lab > 0)
    if not len(ys): return green & box
    k = lab[hy, hx] or lab[ys[np.argmin((ys - hy) ** 2 + (xs - hx) ** 2)], xs[np.argmin((ys - hy) ** 2 + (xs - hx) ** 2)]]
    return lab == k

def fit(fig_alpha, s0, x0, y0, M, lim=None, scales=(0.84, 0.9, 0.95, 1.0, 1.05, 1.1, 1.16), shift=0.9, hw=40, shift_y=None):
    """fig_alpha: the person's alpha (unscaled). s0, (x0, y0): first guess of scale and top-left in the room.
    M: mannequin mask (room size). lim: per-column row below which the room is in front (None on open floor).
    Returns (scale, x0, y0, iou)."""
    H, W = M.shape; ys, xs = np.where(M)
    if not len(ys): return s0, x0, y0, 0.0
    pad = int(1.2 * hw); wx0, wy0 = max(0, xs.min() - pad), max(0, ys.min() - pad); wx1, wy1 = min(W, xs.max() + pad), min(H, ys.max() + pad)
    f = max(1.0, (wy1 - wy0) / 110.0)                                   # work at about 110 px tall
    Mw = np.asarray(Image.fromarray((M[wy0:wy1, wx0:wx1] * 255).astype(np.uint8)).resize((max(1, int((wx1 - wx0) / f)), max(1, int((wy1 - wy0) / f))))) > 127
    vis = None
    if lim is not None:
        rows = np.arange(H)[:, None]; V = rows <= lim[None, :]
        vis = np.asarray(Image.fromarray((V[wy0:wy1, wx0:wx1] * 255).astype(np.uint8)).resize(Mw.shape[::-1])) > 127
    A = Image.fromarray((np.asarray(fig_alpha) > 128).astype(np.uint8) * 255)
    best = (0.0, s0, x0, y0); step = max(1, int(0.15 * hw / f)); rng = int(shift * hw / f)
    rng_y = int((shift if shift_y is None else shift_y) * hw / f)
    for k in scales:
        s = s0 * k; fw, fh = max(1, int(A.width * s / f)), max(1, int(A.height * s / f))
        Fm = np.asarray(A.resize((fw, fh))) > 127
        # keep the head where the first guess put it when the size changes: scale about the first guess's top-left
        bx, by = (x0 - wx0) / f, (y0 - wy0) / f
        for dy in range(-rng_y, rng_y + 1, step) if rng_y else (0,):
            for dx in range(-rng, rng + 1, step):
                ox, oy = int(round(bx + dx)), int(round(by + dy))
                C = np.zeros_like(Mw)
                sx0, sy0 = max(0, -ox), max(0, -oy); tx0, ty0 = max(0, ox), max(0, oy)
                w = min(fw - sx0, Mw.shape[1] - tx0); h = min(fh - sy0, Mw.shape[0] - ty0)
                if w <= 0 or h <= 0: continue
                C[ty0:ty0 + h, tx0:tx0 + w] = Fm[sy0:sy0 + h, sx0:sx0 + w]
                if vis is not None: C &= vis
                inter = (C & Mw).sum(); uni = (C | Mw).sum()
                iou = inter / uni if uni else 0.0
                if iou > best[0]: best = (iou, s, wx0 + ox * f, wy0 + oy * f)
    iou, s, bx0, by0 = best
    return s, int(round(bx0)), int(round(by0)), float(iou)
