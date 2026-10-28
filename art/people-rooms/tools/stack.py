"""Stack one pose's transparent parts into dressed people, each part in its own color. Nothing moves or scales:
every part was painted on the same body, so the layers just sit on top of each other in order.
usage: python3 stack.py PARTS_DIR OUTFITS.json OUT.png
OUTFITS.json: list of {"name", "skin", "hair": [n, rgb] or null, "parts": {"pants": [n, rgb], "shoes": [n, rgb], "shirt": [n, rgb], "tie": [n, rgb], "jacket": [n, rgb]}}"""
import os, sys, json, numpy as np
from PIL import Image

ORDER = ['pants', 'shoes', 'dress', 'shirt', 'tie', 'jacket', 'hair']

def dress(P, rgb, skin):
    """Plain gray pixels take the part's color (shading kept through brightness); warm pixels are skin and take the skin color."""
    P = P.astype(float); on = P[..., 3] > 0
    mx, mn = P[..., :3].max(2), P[..., :3].min(2); sat = (mx - mn) / (mx + 1); lum = P[..., :3] @ [0.299, 0.587, 0.114]
    warm = on & (sat >= 0.22) & (P[..., 0] >= P[..., 2]); gray = on & ~warm
    for m, col in ((gray, rgb), (warm, skin)):
        if col is not None and m.any():
            ref = max(1.0, float(np.percentile(lum[m], 60)))
            P[m, :3] = np.clip(np.array(col, float) * (lum[m] / ref)[:, None], 0, 255)
    return Image.fromarray(P.astype(np.uint8))

def person(parts_dir, fid, info, outfit):
    X0, Y0, X1, Y1 = info['box']; d = f'{parts_dir}/{fid}'
    img = dress(np.asarray(Image.open(f'{d}/body.png')), None, outfit['skin'])
    for layer in ORDER:
        spec = outfit['hair'] if layer == 'hair' else outfit['parts'].get(layer)
        if not spec: continue
        n, rgb = spec
        if not os.path.exists(f'{d}/{layer}-{n}.png'):
            if layer not in ('shirt', 'pants', 'shoes'): continue    # body.png is only head and bare skin, so a style
            n = 1                                                    # not painted yet falls back to the base garment
        img = Image.alpha_composite(img, dress(np.asarray(Image.open(f'{d}/{layer}-{n}.png')), rgb, outfit['skin']))
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
