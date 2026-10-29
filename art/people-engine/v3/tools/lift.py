"""Lift whole figures off a drawn look sheet (plain light gray background).

The background is flooded in from the picture's edges, so a figure's dark outline
stops it and gray clothes inside a figure are never touched. Edge pixels lose the
gray they were blended with. Nothing is cut into parts or recolored."""
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build-rally'))
from colors import de


def lift(path, count=5):
    src = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    H, W = src.shape[:2]
    border = np.concatenate([src[:6].reshape(-1, 3), src[-6:].reshape(-1, 3), src[:, :6].reshape(-1, 3), src[:, -6:].reshape(-1, 3)])
    bg = np.median(border, 0)
    d = de(src, bg)
    near = d < 9
    lab, n = ndi.label(near)
    edge_ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgmask = np.isin(lab, edge_ids[edge_ids > 0])
    # background enclosed by a figure (between an arm and the body): flat sheet gray, no shading
    for i, sl in enumerate(ndi.find_objects(lab)):
        if i + 1 in edge_ids:
            continue
        reg = lab[sl] == i + 1
        if reg.sum() < 40:
            continue
        dv = d[sl][reg]
        # only truly flat sheet gray (a white shirt is close to the gray but never this flat and close)
        if dv.mean() < 2.6 and dv.std() < 1.6 and np.percentile(dv, 95) < 5:
            bgmask[sl] |= reg
    fig = ~bgmask
    fig = ndi.binary_opening(fig, iterations=1)
    # soft edge: the outermost ring takes alpha from how far its color is from the gray
    # a smooth edge: the mask is feathered by under a pixel, so the drawn outline ends cleanly
    core = ndi.binary_erosion(fig, iterations=1)   # the outermost pixel is half sheet gray: drop it
    a = np.clip(ndi.gaussian_filter(core.astype(np.float32), 0.6) * 1.7 - 0.35, 0, 1)
    a[~fig] = 0
    aa = np.clip(a, 0.2, 1)[..., None]
    rgb = np.where((a < 0.999)[..., None], np.clip((src - (1 - aa) * bg) / aa, 0, 255), src)
    rgba = np.dstack([rgb, a * 255]).astype(np.uint8)
    # figures, left to right: every sheet holds `count` people in a row; split at the emptiest
    # column between neighbors (hands that nearly touch never merge two people)
    # people are whole connected shapes: each goes to the slot its middle falls in; only a shape
    # wide enough to be two touching people is split at its emptiest column
    slot = W / count
    lab0, n0 = ndi.label(fig)
    sizes0 = ndi.sum(fig, lab0, range(1, n0 + 1)) if n0 else []
    groups = [np.zeros(fig.shape, bool) for _ in range(count)]
    col = ndi.gaussian_filter1d((a > 0.5).sum(0).astype(np.float32), 3)
    for j, sl in enumerate(ndi.find_objects(lab0)):
        if sizes0[j] < 0.003 * max(sizes0):
            continue
        comp = lab0[sl] == j + 1
        x0_, x1_ = sl[1].start, sl[1].stop
        if (x1_ - x0_) < 1.35 * slot:
            xs_ = np.nonzero(comp.any(0))[0] + x0_
            ys_, cxs_ = np.nonzero(comp)
            k_ = int(min(count - 1, max(0, (cxs_.mean() + x0_) // slot)))
            groups[k_][sl] |= comp
        else:
            # two people touching: cut at the emptiest column near each slot boundary inside it
            cuts = [x0_]
            for i in range(1, count):
                bnd = int(i * slot)
                if x0_ < bnd < x1_:
                    lo, hi = max(x0_, int(bnd - 0.3 * slot)), min(x1_, int(bnd + 0.3 * slot))
                    cuts.append(lo + int(np.argmin(col[lo:hi])))
            cuts.append(x1_)
            full = np.zeros(fig.shape, bool); full[sl] = comp
            for c0, c1 in zip(cuts[:-1], cuts[1:]):
                part = np.zeros(fig.shape, bool); part[:, c0:c1] = full[:, c0:c1]
                ys_, xs_ = np.nonzero(part)
                if len(xs_):
                    groups[int(min(count - 1, max(0, xs_.mean() // slot)))] |= part
    figs = []
    for m in groups:
        ys, xs = np.nonzero(m)
        if not len(ys):
            continue
        sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        figs.append((sl, ndi.binary_dilation(m, iterations=1)[sl]))
    out = []
    for sl, m in figs:
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        crop = rgba[y0:y1, x0:x1].copy()
        crop[~m] = 0
        alpha = crop[..., 3] > 128
        rows = np.nonzero(alpha.any(1))[0]
        widths = alpha.sum(1)
        maxw = widths.max()
        # head top: first row as wide as a head (a raised fist is narrower)
        head_top = int(next((r for r in rows if widths[r] > 0.3 * maxw), rows.min()))
        feet = int(rows.max())
        xs = np.nonzero(alpha[feet - 4:feet + 1].any(0))[0]
        out.append(dict(img=Image.fromarray(crop, 'RGBA'), head_top=head_top, feet=feet,
                        foot_cx=float(xs.mean()) if len(xs) else crop.shape[1] / 2, stature=feet - head_top, box=[x0, y0, x1, y1]))
    return out


if __name__ == '__main__':
    for p in sys.argv[1:]:
        figs = lift(p)
        print(p, len(figs), [f['stature'] for f in figs])
