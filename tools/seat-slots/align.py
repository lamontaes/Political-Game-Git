"""Warp image B onto image A by patch shifts (block matching on edges), smoothed into a flow field."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def gray(x):
    return x.astype(float) @ [0.299, 0.587, 0.114]

def align(A, B, ignore, tile=48, search=10, warp=True):
    H, W = A.shape[:2]
    ga, gb = gray(A), gray(B)
    ea = np.hypot(ndimage.sobel(ga, 0), ndimage.sobel(ga, 1))
    eb = np.hypot(ndimage.sobel(gb, 0), ndimage.sobel(gb, 1))
    ny, nx = H // tile, W // tile
    fy = np.zeros((ny, nx)); fx = np.zeros((ny, nx)); wgt = np.zeros((ny, nx))
    for j in range(ny):
        for i in range(nx):
            y0, x0 = j * tile, i * tile
            pa = ea[y0:y0 + tile, x0:x0 + tile]
            ok = ~ignore[y0:y0 + tile, x0:x0 + tile]
            if ok.mean() < 0.5 or pa[ok].std() < 4:
                continue
            best, bv = (0, 0), None
            for dy in range(-search, search + 1, 1):
                for dx in range(-search, search + 1, 1):
                    yy, xx = y0 + dy, x0 + dx
                    if yy < 0 or xx < 0 or yy + tile > H or xx + tile > W:
                        continue
                    pb = eb[yy:yy + tile, xx:xx + tile]
                    v = np.abs(pa - pb)[ok].mean()
                    if bv is None or v < bv:
                        bv, best = v, (dy, dx)
            fy[j, i], fx[j, i] = best
            wgt[j, i] = 1
    # Fill tiles without a match from their neighbors, then smooth.
    for f in (fy, fx):
        known = wgt > 0
        if known.any():
            idx = ndimage.distance_transform_edt(~known, return_distances=False, return_indices=True)
            f[:] = f[tuple(idx)]
            f[:] = ndimage.median_filter(f, size=3)
    gy = ndimage.zoom(fy, (H / ny, W / nx), order=1)[:H, :W]
    gx = ndimage.zoom(fx, (H / ny, W / nx), order=1)[:H, :W]
    if not warp:
        return None, (fy, fx), (gy, gx)
    yy, xx = np.mgrid[0:H, 0:W]
    out = np.dstack([ndimage.map_coordinates(B[..., c].astype(float), [yy + gy, xx + gx], order=1, mode="nearest") for c in range(3)])
    return out.clip(0, 255).astype(np.uint8), (fy, fx), (gy, gx)


def rigid_shift(mask, all_people, flow):
    """Room flow samples source coordinates: moving a source person uses its negative.

    A whole-pixel translation preserves every source edge, including single hair
    pixels. No room pixels beneath a person participate in the estimate.
    """
    ring = ndimage.binary_dilation(mask, iterations=16)
    ring &= ~ndimage.binary_dilation(all_people, iterations=4)
    if not ring.any():
        raise ValueError("no_room_ring")
    gy, gx = flow
    return -int(round(float(np.median(gx[ring])))), -int(round(float(np.median(gy[ring]))))

if __name__ == "__main__":
    W, H = 1672, 941
    M = np.array(Image.open(sys.argv[1]).convert("RGB").resize((W, H)))
    B = np.array(Image.open(sys.argv[2]).convert("RGB").resize((W, H), Image.LANCZOS))
    P = np.array(Image.open(sys.argv[3]).convert("L").resize((W, H))) > 110
    ignore = ndimage.binary_dilation(P, iterations=6)
    out, (fy, fx), _ = align(M, B, ignore)
    Image.fromarray(out).save(sys.argv[4])
    ring = ndimage.binary_dilation(P, iterations=12) & ~ndimage.binary_dilation(P, iterations=3)
    for name, X in (("before", B), ("after", out)):
        d = np.abs(X.astype(int) - M.astype(int)).mean(axis=2)
        print(name, "outside", round(d[~ignore].mean(), 2), "ring", round(d[ring].mean(), 2))
    print("shift range y", fy.min(), fy.max(), "x", fx.min(), fx.max())
