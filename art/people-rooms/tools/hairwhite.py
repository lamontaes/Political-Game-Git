"""Cut hair pieces from a hair edit of a white-background bald sheet (the profile and three-quarter-back
sheets). The six figure boxes are found exactly as sbcut.py found them on the bald sheet, so each piece
sits in the same pixel frame as figs/v2-NAME-<f|m>-<build>.png. A hair pixel is one the edit changed,
that is not background, in the top part of its figure (head and shoulders, where long hair falls).
usage: python3 hairwhite.py BALD_SHEET EDIT NAME OUTDIR   -> OUTDIR/v2-NAME-<f|m>-<build>-hair.png + NAME-hair.json"""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage
import v2cut
bald_p, edit_p, name, outdir = sys.argv[1:5]; os.makedirs(outdir, exist_ok=True)
B = np.asarray(Image.open(bald_p).convert('RGB')).astype(float)
E = np.asarray(Image.open(edit_p).convert('RGB').resize((B.shape[1], B.shape[0]), Image.LANCZOS)).astype(float)
bg = np.median(np.concatenate([B[:6].reshape(-1, 3), B[-6:].reshape(-1, 3)]), 0)
fig = np.abs(B - bg).sum(2) > 36                               # the bald figures, found as sbcut.py does
fig = ndimage.binary_fill_holes(ndimage.binary_opening(fig, iterations=1))
lab, n = ndimage.label(fig); sizes = ndimage.sum(fig, lab, range(1, n + 1))
fig = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 2000])
alpha = ndimage.gaussian_filter(fig.astype(float), 0.6) * fig
alpha = np.maximum(alpha, ndimage.binary_erosion(fig) * 1.0); A = (alpha * 255).astype(np.uint8)
mx, mn = E.max(2), E.min(2); sat = (mx - mn) / (mx + 1)
changed = (np.abs(E - B).sum(2) > 60) & (np.abs(E - bg).sum(2) > 40) & (sat < 0.2)   # hair was painted plain gray; warm skin re-shading is not hair
BUILDS = ['slim', 'medium', 'heavy']; rec = {'sheet': name, 'mode': 'hair-white', 'figures': []}
for r, c, (X0, Y0, X1, Y1), keep in v2cut.body_cells(A):
    sex = 'fm'[r]; fid = f'v2-{name}-{sex}-{BUILDS[c]}'
    ys = np.where(fig[Y0:Y1, X0:X1].any(1))[0]; top = Y0 + ys.min(); hgt = ys.max() - ys.min()
    m = np.zeros_like(changed); y1 = int(top + hgt * 0.42)
    m[max(0, top - 60):y1, X0:X1] = changed[max(0, top - 60):y1, X0:X1]
    m = ndimage.binary_opening(m, iterations=1)
    l2, n2 = ndimage.label(m)
    if n2:                                                      # keep pieces touching the head (the top fifth of the figure)
        head_zone = np.zeros_like(m); head_zone[max(0, top - 60):int(top + hgt * 0.2), X0:X1] = True
        good = [i + 1 for i in range(n2) if (head_zone & (l2 == i + 1)).any()]
        m = np.isin(l2, good)
    a = (ndimage.gaussian_filter(m.astype(float), 0.7) * 255).clip(0, 255).astype(np.uint8)
    piece = np.dstack([E[Y0:Y1, X0:X1].astype(np.uint8), a[Y0:Y1, X0:X1]])
    Image.fromarray(piece).save(f'{outdir}/{fid}-hair.png')
    rec['figures'].append({'id': fid, 'hairPx': int(m[Y0:Y1, X0:X1].sum()), 'box': [int(X0), int(Y0), int(X1), int(Y1)]})
drift = float(np.abs(E - B).sum(2)[(~changed) & fig].mean()) if fig.any() else None
rec['driftOnBody'] = round(drift, 1) if drift is not None else None
json.dump(rec, open(f'{outdir}/{name}-hair.json', 'w'), indent=1)
print(name, os.path.basename(edit_p), [f['hairPx'] for f in rec['figures']], rec['driftOnBody'])
