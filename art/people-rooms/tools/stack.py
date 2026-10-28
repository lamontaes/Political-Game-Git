"""Stack one pose's transparent parts into dressed people, each part in its own color. Nothing moves or scales:
every part was painted on the same body, so the layers just sit on top of each other in order.
usage: python3 stack.py PARTS_DIR OUTFITS.json OUT.png
OUTFITS.json: list of {"name", "skin", "hair": [n, rgb] or null, "parts": {"pants": [n, rgb], "shoes": [n, rgb], "shirt": [n, rgb], "tie": [n, rgb], "jacket": [n, rgb]}}"""
import os, sys, json, numpy as np
from PIL import Image
from scipy import ndimage

ORDER = ['pants', 'shoes', 'dress', 'shirt', 'tie', 'jacket', 'hair']

def dress(P, rgb, skin):
    """A part painted in key green (or key blue for hair) is garment exactly where it is green; every other pixel in it is
    bare skin (shins under a skirt, forearms in a tee) or outline, and takes the skin color. A plain gray part (the base
    clothes) keeps the older rule: warm pixels are skin, the rest is garment. Shading is kept through brightness."""
    P = P.astype(float); on = P[..., 3] > 0
    mx, mn = P[..., :3].max(2), P[..., :3].min(2); sat = (mx - mn) / (mx + 1); lum = P[..., :3] @ [0.299, 0.587, 0.114]
    r, g, b = P[..., 0], P[..., 1], P[..., 2]
    key = on & (((g > r + 25) & (g > b + 10)) | ((b > r + 30) & (b > g + 15)))
    if key.sum() > 0.3 * max(1, on.sum()):
        near = key.copy()                                    # the garment's own outline hugs it: within 3 px and not skin-colored
        for _ in range(3):
            n = near.copy(); n[1:] |= near[:-1]; n[:-1] |= near[1:]; n[:, 1:] |= near[:, :-1]; n[:, :-1] |= near[:, 1:]; near = n
        skinlike = (sat >= 0.18) & (P[..., 0] >= P[..., 2]) & (lum > 100)   # a warm-tinted dark pixel by the garment is its outline, not skin
        gray = key | (on & near & ~skinlike); warm = on & ~gray
    else: warm = on & (sat >= 0.22) & (P[..., 0] >= P[..., 2]); gray = on & ~warm
    for m, col in ((gray, rgb), (warm, skin)):
        if col is not None and m.any():
            ref = max(1.0, float(np.percentile(lum[m], 60)))
            P[m, :3] = np.clip(np.array(col, float) * np.minimum(lum[m] / ref, 1.3)[:, None], 0, 255)   # edge pixels blended with the white sheet don't glow
    return Image.fromarray(P.astype(np.uint8))

COVERS = {'shirt': ('jacket',), 'pants': ('shirt', 'jacket', 'dress')}       # garments drawn over a lower one

def trim(lower, uppers):
    """A lower garment painted on the same body can stick out a pixel or two past the one drawn over it (a shirt rim along
    a jacket sleeve). Remove only those thin slivers next to the upper garment; a cuff or a trouser leg is wide and stays."""
    A = lower[..., 3] > 0
    if not uppers or not A.any(): return lower
    up = ndimage.binary_fill_holes(np.any([u[..., 3] > 128 for u in uppers], 0))
    out = A & ~up
    thin = out & ~ndimage.binary_opening(out, iterations=3) & ndimage.binary_dilation(up, iterations=3)
    lower = lower.copy(); lower[thin, 3] = 0
    return lower

def person(parts_dir, fid, info, outfit):
    X0, Y0, X1, Y1 = info['box']; d = f'{parts_dir}/{fid}'
    layers = {}
    for layer in ORDER:
        spec = outfit['hair'] if layer == 'hair' else outfit['parts'].get(layer)
        if not spec: continue
        n, rgb = spec
        if not os.path.exists(f'{d}/{layer}-{n}.png'):
            if layer not in ('shirt', 'pants', 'shoes'): continue    # body.png is only head and bare skin, so a style
            n = 1                                                    # not painted yet falls back to the base garment
        layers[layer] = (np.asarray(Image.open(f'{d}/{layer}-{n}.png')), rgb)
    img = dress(np.asarray(Image.open(f'{d}/body.png')), None, outfit['skin'])
    for layer in ORDER:
        if layer not in layers: continue
        P, rgb = layers[layer]
        P = trim(P, [layers[u][0] for u in COVERS.get(layer, ()) if u in layers])
        img = Image.alpha_composite(img, dress(P, rgb, outfit['skin']))
    return img, (X0, Y0)

if __name__ == '__main__':
    parts_dir, outfits_p, out = sys.argv[1:4]
    meta = json.load(open(f'{parts_dir}/parts.json')); outfits = json.load(open(outfits_p))
    W, H = meta['frame']; rows = []
    for o in outfits:
        frame = Image.new('RGBA', (W, H), (214, 205, 188, 255))
        for fid, info in meta['figures'].items():
            img, at = person(parts_dir, fid, info, o); frame.alpha_composite(img, at)
        rows.append(frame.convert('RGB'))
    sheet = Image.new('RGB', (W * min(2, len(rows)), H * ((len(rows) + 1) // 2)), 'white')
    for i, r in enumerate(rows): sheet.paste(r, ((i % 2) * W, (i // 2) * H))
    sheet.save(out, quality=92); print(out, sheet.size)
