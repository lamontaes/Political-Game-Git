"""Make the wardrobe parts of one pose transparent. Every part was painted by Firefly as an edit of the pose's base
(the six bodies in a collared shirt, slacks and dress shoes), so every part is already in place on its body: this only
keeps each part's own pixels and makes the rest transparent. Stacking body, pants, shoes, shirt, tie, jacket and
hair in any combination needs no measuring, moving or scaling.
usage: python3 wardrobe_parts.py BASE MARKER SHEET EDITS_DIR OUTDIR [HAIR_SHEET HAIR_EDITS_PREFIX]
  BASE: the pose base (white background); MARKER: Firefly's flat-color map of the base (shirt yellow, pants blue,
  shoes green); EDITS_DIR holds wp-SHEET-<part>.png; HAIR_SHEET + HAIR_EDITS_PREFIX: the bald sheet the hair was
  painted on and its edits PREFIX-01..12.png (same bodies, same place).
Writes OUTDIR/<figure>/{body,shirt-1..5,jacket-1..5,tie-1,pants-1..5,shoes-1..5,hair-1..12}.png and OUTDIR/parts.json."""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage
import v2cut

FRAME = (1536, 1024)
BUILDS = ['slim', 'medium', 'heavy']; SEX = ['f', 'm']

def load(p):
    im = Image.open(p).convert('RGBA').resize(FRAME, Image.LANCZOS); bg = Image.new('RGBA', FRAME, (255, 255, 255, 255))   # sheets with transparency sit on white, like the edits
    return np.asarray(Image.alpha_composite(bg, im).convert('RGB')).astype(float)

def figure(E):
    bg = np.median(np.concatenate([E[:6].reshape(-1, 3), E[-6:].reshape(-1, 3), E[:, :6].reshape(-1, 3), E[:, -6:].reshape(-1, 3)]), 0)
    f = ndimage.binary_opening(np.abs(E - bg).sum(2) > 45, iterations=1)
    holes, n = ndimage.label(ndimage.binary_fill_holes(f) & ~f)                         # ground between an arm and the body stays ground
    if n: f |= np.isin(holes, 1 + np.where(ndimage.sum(np.ones_like(f), holes, range(1, n + 1)) < 150)[0])
    return f

def green(E):
    """The part Firefly painted in key green: green pixels, closed, plus the dark outline right around them."""
    return keyed(E, lambda r, g, b: (g > r + 35) & (g > b + 15) & (g > 70))

def blue(E):
    """Hair Firefly painted in key blue, plus its outline and the scalp showing between curls."""
    return keyed(E, lambda r, g, b: (b > r + 40) & (b > g + 20) & (b > 70))

def keyed(E, test):
    r, g, b = E[..., 0], E[..., 1], E[..., 2]; mx, mn = E.max(2), E.min(2)
    gr = test(r, g, b) & ((mx - mn) / (mx + 1) > 0.25) & (E.sum(2) < 3 * 235)         # pale edge blends with the white ground are not the garment
    gr = ndimage.binary_closing(ndimage.binary_opening(gr, iterations=1), iterations=2)
    holes, n = ndimage.label(ndimage.binary_fill_holes(gr) & ~gr)                       # fill only small dark holes (buttons, seams), never ground showing through
    if n:
        idx = np.arange(1, n + 1); size = ndimage.sum(np.ones_like(gr), holes, idx); lum = ndimage.mean(E.sum(2) / 3, holes, idx)
        gr |= np.isin(holes, idx[(size < 250) & (lum < 200)])
    dark = E.sum(2) < 3 * 110
    return gr | (dark & ndimage.binary_dilation(gr, iterations=3) & ~ndimage.binary_erosion(gr, iterations=1))

def warm(E):
    mx, mn = E.max(2), E.min(2); return ((mx - mn) / (mx + 1) >= 0.18) & (E[..., 0] > E[..., 2] + 20) & (E[..., 0] >= E[..., 1])

def main():
    base_p, marker_p, sheet, ed, out = sys.argv[1:6]
    hair_sheet = sys.argv[6] if len(sys.argv) > 6 else None; hair_pre = sys.argv[7] if len(sys.argv) > 7 else None
    B = load(base_p); figB = figure(B); M = load(marker_p)
    near = lambda col, tol=120: (np.abs(M - np.array(col, float)).sum(2) < tol) & figB
    regions = {'shirt': near((255, 255, 0)), 'pants': near((0, 0, 255)), 'shoes': near((0, 255, 0))}
    skinB = warm(B)
    for k in regions: regions[k] = ndimage.binary_dilation(ndimage.binary_closing(regions[k], iterations=2), iterations=3) & figB & ~skinB   # each garment with its own outline, never skin
    clothes = regions['shirt'] | regions['pants'] | regions['shoes']
    D = lambda m, n: ndimage.binary_dilation(m, iterations=n)
    feet = D(regions['shoes'], 4)
    zone = {'shoes': D(regions['shoes'], 10), 'pants': D(regions['pants'], 30) & ~feet, 'shirt': D(regions['shirt'], 30) & ~feet,
            'jacket': (D(regions['shirt'], 60) | D(regions['pants'], 20)) & ~feet, 'tie': D(regions['shirt'], 6), 'dress': D(regions['shirt'] | regions['pants'], 30) & ~feet}
    cells = v2cut.body_cells((figB * 255).astype(np.uint8))
    H0 = load(hair_sheet) if hair_sheet else None
    rows = np.arange(FRAME[1])[:, None]
    PARTS = [('shirt', 'sh', range(2, 7)), ('jacket', 'jk', range(1, 8)), ('tie', 'ti', range(1, 2)), ('pants', 'pa', range(1, 7)), ('shoes', 'ft', range(2, 7)), ('dress', 'dr', range(1, 2))]
    edits = {}
    for part, code, rng in PARTS:
        for i in rng:
            for pre, key in (('wk', True), ('wp', False)):
                p = f'{ed}/{pre}-{sheet}-{code}{i}.png'
                if os.path.exists(p): E = load(p); edits[(part, i)] = (E, figure(E), green(E) if key else np.abs(E - B).sum(2) > 60, key); break
    hairs = {}
    if hair_pre:
        for i in range(1, 13):
            pb = f"{os.path.dirname(hair_pre)}/{os.path.basename(hair_pre).replace('hk-', 'hb-').replace('hr-', 'hb-')}-{i:02d}.png"
            p = f'{hair_pre}-{i:02d}.png'
            if os.path.exists(pb): E = load(pb); hairs[i] = (E, blue(E))                # key blue: the whole hair, even over a gray shirt
            elif os.path.exists(p):
                E = load(p); mx, mn = E.max(2), E.min(2); sat = (mx - mn) / (mx + 1)
                hairs[i] = (E, (np.abs(E - H0).sum(2) > 60) & (sat < 0.22))
    meta = {'sheet': sheet, 'frame': list(FRAME), 'order': ['body', 'pants', 'shoes', 'dress', 'shirt', 'tie', 'jacket', 'hair'], 'figures': {}}
    for r, c, (X0, Y0, X1, Y1), keep in cells:
        fid = f'v2-{sheet}-{SEX[r]}-{BUILDS[c]}'; od = f'{out}/{fid}'; os.makedirs(od, exist_ok=True)
        X0, Y0, X1, Y1 = max(0, X0 - 40), max(0, Y0 - 70), min(FRAME[0], X1 + 40), min(FRAME[1], Y1 + 10)   # room for big hair and wide jackets
        ys = np.where(keep.any(1))[0]; top, bot = ys.min(), ys.max(); Hh = bot - top
        cell = np.zeros(FRAME[::-1], bool); cell[Y0:Y1, X0:X1] = True
        band = lambda a, b: cell & (rows >= top + a * Hh) & (rows <= top + b * Hh)
        near_body = {False: ndimage.binary_dilation(keep, iterations=22), True: ndimage.binary_dilation(keep, iterations=48)}
        def save(m, src, name):
            m = m & cell & near_body[name.startswith('hair')]                                # nothing stray far from this body
            a = (ndimage.gaussian_filter(m.astype(float), 0.5) * 255).clip(0, 255).astype(np.uint8)
            rgb = np.where(a[..., None] > 0, src, 0).astype(np.uint8)                       # nothing kept under transparent pixels
            Image.fromarray(np.dstack([rgb, a])[Y0:Y1, X0:X1]).save(f'{od}/{name}.png', optimize=True); return int(m.sum())
        info = {'box': [int(X0), int(Y0), int(X1), int(Y1)], 'parts': {}}
        # leftovers below the chin that are neither skin nor marked clothing (belt, cuffs, buttons) belong to the nearest garment
        rest = keep & ~clothes & ~skinB & cell & (rows > top + 0.16 * Hh)
        lab = np.zeros(FRAME[::-1], np.uint8)
        for n, k in enumerate(('shirt', 'pants', 'shoes'), 1): lab[regions[k] & keep] = n
        dist, (iy, ix) = ndimage.distance_transform_edt(lab == 0, return_indices=True)
        near = np.where(rest & (dist <= 12), lab[iy, ix], 0)
        dp = ndimage.distance_transform_edt(lab != 2)
        near = np.where(rest & (dp <= 12), 2, near)                                      # the belt and waistband go with the pants
        own = {k: (regions[k] & keep) | (near == n) for n, k in enumerate(('shirt', 'pants', 'shoes'), 1)}
        grow = lambda m, k: ndimage.binary_dilation(m, iterations=k)          # underlap: a lower layer runs a few px under the one drawn over it,
        own['pants'] = own['pants'] | (grow(own['pants'], 3) & (own['shoes'] | own['shirt']))   # so two soft edges never meet over nothing
        body = keep & ~clothes & ~(near > 0)
        info['parts']['body'] = save(body | (grow(body, 2) & keep), B, 'body')
        for part in ('shirt', 'pants', 'shoes'): info['parts'][f'{part}-1'] = save(own[part], B, f'{part}-1')
        for (part, i), (E, figE, ch, key) in edits.items():
            if key:                                                                  # whole green garment + bare skin where the old garment was
                m = figE & ch & band(-0.02, 1.02) & zone[part]                         # only near where this garment sits on the base: an edit that greened too much keeps just its own piece
                if part in ('shirt', 'pants', 'shoes', 'dress'):                          # skin the new garment uncovers (forearms, shins, ankles), with its own outline
                    reg = (regions['shirt'] | regions['pants']) if part == 'dress' else regions[part]
                    sk = figE & warm(E) & reg
                    m |= sk | (figE & (E.sum(2) < 3 * 110) & ndimage.binary_dilation(sk, iterations=3) & ndimage.binary_dilation(reg, iterations=3))
                if part == 'pants': m |= figE & regions['pants'] & ~warm(E)                   # hems and seams in the old pants area that are not skin, right down to the shoes (drawn on top)
                if part == 'pants':                                                       # the belt Firefly left unpainted just above the green
                    g2 = ch & cell; top_g = np.where(g2.any(0), g2.argmax(0), FRAME[1])
                    m |= figE & ~warm(E) & (rows >= top_g[None, :] - 28) & (rows < top_g[None, :]) & cell & ndimage.binary_dilation(g2, iterations=28)   # runs up under the shirt, so no waist gap
                m &= ~((E.min(2) > 225) & (E.max(2) - E.min(2) < 18))                  # background showing through a gap (between the calves under a skirt) is never part of a garment
                if part == 'pants': m |= ndimage.binary_dilation(m, iterations=3) & figE & regions['shoes']   # runs under the shoes: no light seam at the hem
                m = ndimage.binary_opening(m, iterations=1)
                if (ch & cell).sum() < 400: continue                                    # this figure's garment did not change (women-only pieces on the men)
                ref = (regions[{'shoes': 'shoes', 'pants': 'pants'}.get(part, 'shirt')] & keep).sum()
                if part != 'tie' and m.sum() < 0.35 * ref:                               # Firefly lost most of this garment: leave it out, it gets repainted
                    print('thin', fid, f'{part}-{i}', int(m.sum()), int(ref), file=sys.stderr); continue
                info['parts'][f'{part}-{i}'] = save(m, E, f'{part}-{i}'); continue
            if part == 'shirt': m = figE & (regions['shirt'] | (ch & band(0.10, 0.72)))
            elif part == 'jacket': m = figE & ch & band(0.10, 0.80)
            elif part == 'tie': m = figE & ch & band(0.12, 0.60)
            elif part == 'pants': m = figE & (regions['pants'] | (ch & band(0.40, 0.97)))
            else: m = figE & (regions['shoes'] | (ch & band(0.84, 1.01)))
            m = ndimage.binary_opening(m, iterations=1)
            info['parts'][f'{part}-{i}'] = save(m, E, f'{part}-{i}')
        for i, (E, hm) in hairs.items():
            m = hm & band(-0.15, 0.45) & ndimage.binary_dilation(keep, iterations=40)
            m = ndimage.binary_opening(m, iterations=1); lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
            if n:
                headz = band(-0.05, 0.14) & ndimage.binary_dilation(keep, iterations=4)
                m &= np.isin(lab, [j + 1 for j in range(n) if ((lab == j + 1) & headz).any()])
            m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=2))
            info['parts'][f'hair-{i}'] = save(m, E, f'hair-{i}')
        meta['figures'][fid] = info
    json.dump(meta, open(f'{out}/parts.json', 'w'), indent=1)
    print(sheet, {k: len(v['parts']) for k, v in meta['figures'].items()})

if __name__ == '__main__': main()
