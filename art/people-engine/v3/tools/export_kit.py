"""Turn each pose sheet and its Layerize split into a pick-and-stack kit.

Done once per sheet. Afterward a person is only a stack of finished images:
body, shoes, trousers, top, hair (in that order; trouser hems fall over the shoes), with any garment or hair
repainted from a palette through its tone map. Rules applied here:
- every part shows the drawing's own pixels wherever the drawing shows that part;
- hair is cut from the drawing (inside the split's hair shape when that shape is
  sound), never over the face;
- hollow shoes are filled from the drawing;
- kit_check.py --repair then hands any pixel the drawing clearly shows as another
  part to that part, so hands are never recolored with a sweater.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from kit import Person
from render import lum
from colors import de

ORDER = ['body', 'shoes', 'trousers', 'top', 'hair', 'phone']  # trouser hems fall over the shoes
TONED = ['top', 'trousers', 'shoes', 'hair']
OUT = 'kit'

POSES = {  # what each figure is, by what is drawn (back = seen from behind)
    'woman-medium': ['back, clapping, turned right', 'back, clapping, turned left', 'back, fist raised', 'back, filming, turned right', 'back, arms folded, turned left', 'back, hand on hip, turned right', 'back, hands in pockets, turned right', 'front, clapping, turned right', 'front, clapping, turned right (2)', 'front, speaking'],
    'woman-slim': ['back, clapping, turned right', 'back, clapping, turned left', 'back, fist raised', 'back, filming, turned left', 'back, arms folded, turned left', 'back, hand on hip, turned right', 'back, hands in pockets, turned right', 'front, clapping, turned right', 'front, clapping, turned right (2)', 'front, speaking'],
    'woman-heavy': ['back, clapping, turned right', 'back, clapping, turned left', 'back, fist raised', 'back, filming, turned left', 'back, arms folded, turned left', 'back, hand on hip, turned right', 'back, hands in pockets', 'front, clapping, turned right', 'front, clapping, turned right (2)', 'front, clapping and talking, turned right', 'front, speaking'],
    'man-medium': ['back, clapping, turned right', 'back, clapping, turned left', 'back, fist raised', 'back, filming, turned left', 'back, arms folded, turned left', 'back, hand on hip, turned right', 'back, hands in pockets, turned right', 'front, clapping, turned right', 'front, clapping, turned left', 'front, speaking'],
    'man-slim': ['back, clapping, turned right', 'back, clapping, turned left', 'back, fist raised', 'back, filming, turned left', 'back, arms folded, turned left', 'back, hand on hip, turned right', 'back, hands in pockets', 'front, clapping, turned right', 'front, clapping, turned left', 'front, speaking'],
    'man-heavy': ['front, clapping, turned right', 'back, clapping, turned left', 'back, fist raised', 'back, filming, turned left', 'front, arms folded, turned right', 'back, hand on hip', 'back, hands in pockets, turned right', 'front, clapping, turned right (2)', 'front, clapping, turned left', 'front, speaking'],
}


P2 = ['seated, writing at a desk', 'seated, talking', 'seated, listening', 'seated, from behind, watching', 'seated on a stool at a counter',
      'walking', 'walking', 'standing, waving', 'standing, on the phone', 'standing at a lectern']
for _p in ['woman-medium', 'man-medium', 'woman-slim', 'man-slim', 'woman-heavy', 'man-heavy']:
    POSES[_p + '-2'] = P2


def mad(a, b):
    return np.abs(a.astype(np.float32) - np.asarray(b, np.float32)).mean(-1)


def export(name):
    P = Person(name)
    H, W = P.src.shape[:2]
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    meta = []
    # tone ranges are shared by all poses of one person, so a color looks the same in every pose
    tones = {}
    figs = []
    for k, f in enumerate(P.figures):
        x0, y0, x1, y1 = f['box']
        pad = 24
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
        own = np.zeros((H, W), bool); fx0, fy0, fx1, fy1 = f['box']; own[fy0:fy1, fx0:fx1] = f['own']
        own = ndi.binary_dilation(own[y0:y1, x0:x1], iterations=3)
        src = P.src[y0:y1, x0:x1].astype(np.float32)
        lay = {n: P.layers[n][y0:y1, x0:x1].copy() * own[..., None] for n in ORDER if n in P.layers}
        A = {n: lay[n][..., 3].astype(np.float32) / 255 for n in lay}
        bgc = np.median(P.src[y0:y1, x0:x1][~ndi.binary_dilation(own, iterations=8)], 0)

        # skin of this figure: the body where nothing covers it, below the head
        cover = sum(A[n] for n in ['trousers', 'shoes', 'top'] if n in A)
        ht = f['head_top'] + f['box'][1] - y0
        band = np.zeros(own.shape, bool); band[max(0, ht - 70):ht + int((0.13 if name.startswith('man') else 0.22) * f['stature'])] = True
        skin_px = (A['body'] > 0.9) & (cover < 0.1) & own & ~band & (mad(src, lay['body'][..., :3]) < 40)
        # skin is warm and above the hips (gray shoe insides showing through are not skin)
        from colors import to_lab
        labsrc = to_lab(src)
        upper = np.zeros(own.shape, bool); upper[:ht + int(0.55 * f['stature'])] = True
        skin_px &= upper & (labsrc[..., 1] > 6) & (labsrc[..., 2] > 6)
        # with no bare skin in view, the body image's own skin is the reference
        skin = np.median(src[skin_px], 0) if skin_px.sum() > 50 else np.median(lay['body'][(A['body'] > 0.9) & own][:, :3], 0)
        # hair color: the crown of the head
        crown = np.zeros(own.shape, bool); crown[ht - 5:ht + int(0.04 * f['stature'])] = True
        cx = int(f['head_cx'] + f['box'][0] - x0)
        crown[:, :max(0, cx - 30)] = False; crown[:, cx + 30:] = False
        crown &= own & (mad(src, bgc) > 25)
        hairc = np.median(src[crown], 0) if crown.sum() > 20 else np.array([30, 28, 30])

        # 1. hair: drawing pixels nearer the hair color than the skin, not the top
        topvis = (A['top'] > 0.5) & (de(src, lay['top'][..., :3]) < 12)
        skin_set0 = src[skin_px] if skin_px.sum() > 50 else lay['body'][(A['body'] > 0.9) & own][:, :3].astype(np.float32)
        skin_tones = [np.percentile(skin_set0, q, axis=0) for q in (10, 50, 90)]
        d_skin = np.min(np.stack([de(src, t) for t in skin_tones]), 0)
        near_hair = de(src, hairc) < d_skin - 4
        hm = band & own & near_hair & ~topvis & (mad(src, bgc) > 20)
        hl = A.get('hair', np.zeros(own.shape)) > 0.5
        sound = hl.sum() < 2.2 * max(hm.sum(), 1)
        if sound:
            # long hair falls to the shoulders and down the back: follow the split's hair shape down
            reach = 0.13 if name.startswith('man') else 0.5  # short men's hair ends at the nape
            band = np.zeros(own.shape, bool); band[max(0, ht - 70):ht + int(reach * f['stature'])] = True
            hm = band & own & near_hair & ~topvis & (mad(src, bgc) > 20)
        if sound:
            hm &= ndi.binary_dilation(hl, iterations=4)
        if sound:
            clear_skin = (de(src, skin) < 22) & (de(src, hairc) > 30) & (A['body'] > 0.5)
            hm = hl & own & ~clear_skin
        hm = ndi.binary_opening(hm, iterations=1)
        front = POSES[name][k].startswith('front') if k < len(POSES[name]) else False
        if sound:
            hm = ndi.binary_fill_holes(ndi.binary_closing(hm, iterations=3)) & band & own & (~topvis | hl)
            if front:
                # a face seen from the front (its skin and the eyes, brows and mouth inside it) is never hair
                st0 = f['stature']; hcx0 = f['head_cx'] + f['box'][0] - x0
                eyes = np.zeros(own.shape, bool)
                eyes[ht + int(0.05 * st0):ht + int(0.085 * st0), max(0, int(hcx0 - 0.04 * st0)):int(hcx0 + 0.04 * st0)] = True
                faceskin = (d_skin < 12) & own & band
                lab_f, n_f = ndi.label(faceskin)
                ids = np.unique(lab_f[eyes & faceskin])
                fbox = np.zeros(own.shape, bool)
                fbox[ht + int(0.035 * st0):ht + int(0.16 * st0), max(0, int(hcx0 - 0.065 * st0)):int(hcx0 + 0.065 * st0)] = True
                # fill only inside the face box: eyes and mouth are enclosed by face skin there, the hair is not
                facearea = ndi.binary_fill_holes(np.isin(lab_f, ids[ids > 0]) & fbox)
                hm &= ~facearea
        else:
            # drawn hair (light streaks in blond hair look like skin by color): take the hair's whole
            # outline, then cut the face skin back out on a face seen from the front
            hm = ndi.binary_fill_holes(ndi.binary_closing(hm, iterations=8)) & band & own & ~topvis
            if front:
                st0 = f['stature']; hcx0 = f['head_cx'] + f['box'][0] - x0
                eyes = np.zeros(own.shape, bool)
                eyes[ht + int(0.05 * st0):ht + int(0.085 * st0), max(0, int(hcx0 - 0.04 * st0)):int(hcx0 + 0.04 * st0)] = True
                faceskin = (d_skin < 12) & own & band
                lab_f, n_f = ndi.label(faceskin)
                ids = np.unique(lab_f[eyes & faceskin])
                fbox = np.zeros(own.shape, bool)
                fbox[ht + int(0.035 * st0):ht + int(0.16 * st0), max(0, int(hcx0 - 0.065 * st0)):int(hcx0 + 0.065 * st0)] = True
                hm &= ~ndi.binary_fill_holes(np.isin(lab_f, ids[ids > 0]) & fbox)
        if name.startswith('man'):
            # men's short hair by shape: the whole head down to the nape that is not sweater,
            # minus the face (traced inside the face box) and the skin at its outer edge (ears, neck)
            st2 = f['stature']; hcx2 = f['head_cx'] + f['box'][0] - x0
            head = np.zeros(own.shape, bool)
            head[max(0, ht - 70):ht + int((0.11 if front else 0.15) * st2)] = True
            head[:, :max(0, int(hcx2 - 0.12 * st2))] = False; head[:, int(hcx2 + 0.12 * st2):] = False
            seed = head & own & ~topvis & (de(src, hairc) < d_skin) & (mad(src, bgc) > 20)
            sil = ndi.binary_fill_holes(ndi.binary_closing(seed, iterations=8)) & head & own & ~topvis & (mad(src, bgc) > 12)
            if front:
                eyes = np.zeros(own.shape, bool)
                eyes[ht + int(0.05 * st2):ht + int(0.085 * st2), max(0, int(hcx2 - 0.04 * st2)):int(hcx2 + 0.04 * st2)] = True
                faceskin = (d_skin < 12) & own
                lab_f, n_f = ndi.label(faceskin)
                ids = np.unique(lab_f[eyes & faceskin])
                fbox = np.zeros(own.shape, bool)
                fbox[ht + int(0.035 * st2):ht + int(0.16 * st2), max(0, int(hcx2 - 0.065 * st2)):int(hcx2 + 0.065 * st2)] = True
                sil &= ~ndi.binary_fill_holes(np.isin(lab_f, ids[ids > 0]) & fbox)
            rim_zone = sil & ~ndi.binary_erosion(sil, iterations=10)
            strict_skin = (d_skin < 7) & (de(src, hairc) > 14)
            sil &= ~(rim_zone & strict_skin)
            sil = ndi.binary_opening(sil, iterations=1)
            hm = ndi.binary_fill_holes(sil)
            sound = False
        lab, n = ndi.label(hm)
        if n:
            sizes = ndi.sum(hm, lab, range(1, n + 1))
            hm = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 60])
        ha = np.clip(ndi.gaussian_filter(hm.astype(np.float32), 0.8) * 1.5, 0, 1)
        ha = np.maximum(ha * (A['hair'] if sound else 1), ha * 0.0) if sound else ha
        if sound:
            ha = np.where(hm, np.maximum(ha, A['hair']), ha * (A['hair'] > 0.2))
        hair = np.zeros(src.shape[:2] + (4,), np.float32)
        hair[..., :3] = src; hair[..., 3] = ha
        if name.startswith('man'):
            # facial hair and stubble: a see-through layer of dark strands over the skin, so a new
            # hair color tints the strands and never paints the skin between them
            # only the lower face of a figure seen from the front (never scalp hair)
            zone = np.zeros(own.shape, bool)
            if front:
                st1 = f['stature']; hcx1 = f['head_cx'] + f['box'][0] - x0
                zone[ht + int(0.09 * st1):, max(0, int(hcx1 - 0.06 * st1)):int(hcx1 + 0.06 * st1)] = True
            zone &= hm
            ds, dh = de(src, skin), de(hairc, skin)
            hairness = np.clip((ds - 10) / max(float(dh) - 10, 1.0), 0, 1)
            a = np.where(zone, np.minimum(ha, hairness), ha)
            # stubble is dots of the hair's own color over the skin, never re-mixed colors
            hair[..., :3] = np.where(zone[..., None], hairc, src)
            hair[..., 3] = a
            ha = a
            under = lay['body'][..., :3].astype(np.float32)
            under = np.where((de(under, skin) < 14)[..., None], under, skin)
            lay['body'][zone, :3] = under[zone].astype(np.uint8)
        lay['hair'] = (hair * [1, 1, 1, 255]).astype(np.uint8)
        A['hair'] = ha

        # 2. shoes: fill hollow shoes from the drawing
        if 'shoes' in A:
            sm = A['shoes'] > 0.5
            filled = ndi.binary_fill_holes(sm) & ~sm
            lay['shoes'][filled, :3] = src[filled]
            lay['shoes'][filled, 3] = 255
            A['shoes'] = lay['shoes'][..., 3] / 255

        # 4. every part shows the drawing wherever the drawing shows it (inside the figure)
        above = np.zeros(own.shape, np.float32)
        union = np.zeros(own.shape, np.float32)
        for nme in reversed(ORDER):
            if nme not in A:
                continue
            vis = A[nme] * (1 - above)
            interior = (vis > 0.9) & (A[nme] > 0.98) & ~((nme == 'body') & (A['hair'] > 0.02))
            lay[nme][interior, :3] = src[interior].astype(np.uint8)
            above = above + A[nme] * (1 - above)
        dark_line = lum(src) < 0.17
        # nothing worn on the body sits on the face or beard
        st = f['stature']; hcx = f['head_cx'] + f['box'][0] - x0
        face = np.zeros(own.shape, bool)
        face[max(0, ht):ht + int(0.15 * st), max(0, int(hcx - 0.07 * st)):int(hcx + 0.07 * st)] = True
        for g in ['top', 'trousers', 'shoes']:
            if g in A:
                core = A[g] > 0.95
                gpx = lay[g][core & ~face][:, :3].astype(np.float32)
                if len(gpx) > 50:
                    gt = [np.percentile(gpx, q, axis=0) for q in (8, 50, 92)]
                    d_g = np.min(np.stack([de(src, t) for t in gt]), 0)
                    lay[g][face & (d_g > 12), 3] = 0
                    A[g] = lay[g][..., 3] / 255
        # hair only where the drawing shows hair (never a neck, a collar or a sweater)
        sure = hm & (de(src, hairc) < 10)
        hpx = src[sure] if sure.sum() > 40 else np.array([hairc], np.float32)
        ht_t = [np.percentile(hpx, q, axis=0) for q in (10, 50, 90)]
        d_h = np.min(np.stack([de(src, t) for t in ht_t]), 0)
        topc = lay['top'][(A['top'] > 0.95)][:, :3].astype(np.float32) if 'top' in A else np.zeros((0, 3))
        d_t = np.min(np.stack([de(src, np.percentile(topc, q, axis=0)) for q in (10, 50, 90)]), 0) if len(topc) > 50 else np.full(own.shape, 999.0)
        hsolid = A['hair'] > 0.5
        edge_zone = (A['hair'] > 0) & ~ndi.binary_erosion(hsolid, iterations=6)
        not_hair = edge_zone & (d_h > 14) & ((d_skin < d_h - 3) | (d_t < d_h - 3)) & ~dark_line
        not_hair = ndi.binary_opening(not_hair, iterations=1)
        if sound:   # hair cut from the drawing is already the drawing's own outline
            lay['hair'][not_hair, 3] = 0
        A['hair'] = lay['hair'][..., 3] / 255
        # stray specks of a garment (a few pixels on a knuckle or past a sleeve) are not garment
        for nme in ['shoes', 'trousers', 'top', 'hair']:
            if nme in A:
                solid = A[nme] > 0.05
                lab_, n_ = ndi.label(solid)
                if n_:
                    sz = ndi.sum(solid, lab_, range(1, n_ + 1))
                    small = np.isin(lab_, [i + 1 for i, v in enumerate(sz) if v < 40])
                    thin = solid & ~ndi.binary_opening(solid, iterations=1) & (A['body'] > 0.5) & (de(src, skin) < 16) & (nme != 'hair')
                    lay[nme][small | thin, 3] = 0
                    A[nme] = lay[nme][..., 3] / 255
        # faint hair inside the figure (over a neck or a collar) is not hair
        inside = ndi.binary_erosion(above > 0.5, iterations=3)
        faint = inside & (A['hair'] < 0.5) & (A['hair'] > 0)
        lay['hair'][faint, 3] = 0; A['hair'] = lay['hair'][..., 3] / 255
        # the figure's outer rim belongs to whatever is on top there; the body under a garment's
        # edge is cut away, so a recolored garment never shows an old-color or skin rim
        rim = (above > 0.02) & ~ndi.binary_erosion(above > 0.5, iterations=3)
        garments = sum(A[n] for n in ['shoes', 'trousers', 'top', 'hair'] if n in A)
        cut = rim & (garments > 0.05)
        lay['body'][cut, 3] = 0; A['body'] = lay['body'][..., 3] / 255
        topmost = np.full(own.shape, '', object)
        for nme in ORDER:
            if nme in A:
                topmost = np.where(A[nme] > 0.05, nme, topmost)
        for nme in A:
            e = (A[nme] > 0.05) & (A[nme] < 0.98) & (above < 0.98) & (topmost == nme)
            if e.any():
                a = np.clip(A[nme][e], 0.25, 1)[:, None]
                lay[nme][e, :3] = np.clip((src[e] - (1 - a) * bgc) / a, 0, 255).astype(np.uint8)

        # hands, necks and wrists drawn in front of a sweater (or trousers) belong to the body, with the
        # drawn outline around them, so a new garment color never reaches skin or the lines on it
        for g in ['top', 'trousers']:
            if g not in A:
                continue
            core = lay[g][A[g] > 0.98][:, :3].astype(np.float32)
            if len(core) < 50:
                continue
            gd = np.min(np.stack([de(core, t) for t in skin_tones]), 0)
            gcol = core[gd > 20]
            if len(gcol) < 0.4 * len(core):
                continue            # a skin-colored garment (khaki): color can't tell it from skin
            gref = [np.percentile(gcol, q, axis=0) for q in (10, 50, 90)]
            d_g = np.min(np.stack([de(src, t) for t in gref]), 0)
            skinreg = (d_skin < 12) & (d_g > d_skin + 6) & (A[g] > 0) & own
            labs, ns = ndi.label(skinreg)
            if ns:
                sz = ndi.sum(skinreg, labs, range(1, ns + 1))
                skinreg = np.isin(labs, [i + 1 for i, v in enumerate(sz) if v >= 25])
            grown = ndi.binary_dilation(skinreg, iterations=2) & (d_g > 10) & (A[g] > 0)
            lay[g][grown, 3] = 0
            A[g] = lay[g][..., 3] / 255
            lay['body'][grown, :3] = src[grown].astype(np.uint8)
            lay['body'][grown, 3] = 255
            A['body'] = lay['body'][..., 3] / 255

        above = np.zeros(own.shape, np.float32)
        for nme in reversed(ORDER):
            if nme not in A:
                continue
            vis = A[nme] * (1 - above)
            interior = (vis > 0.9) & (A[nme] > 0.98) & ~((nme == 'body') & (A['hair'] > 0.02))
            lay[nme][interior, :3] = src[interior].astype(np.uint8)
            above = above + A[nme] * (1 - above)

        skin_set = src[skin_px] if skin_px.sum() > 50 else lay['body'][(A['body'] > 0.9) & own][:, :3].astype(np.float32)
        refs = dict(skin=[np.percentile(skin_set, q, axis=0).round().astype(int).tolist() for q in (20, 50, 85)],
                    hair=np.asarray(hairc).round().astype(int).tolist())
        figs.append(dict(k=k, lay=lay, own=own, off=(x0, y0), f=f, refs=refs))

    # 5. tone maps: perceived lightness (CIE L*) of each part as drawn, lightly smoothed;
    # recolors keep these lightness offsets from the part's middle, so shading stays as drawn
    from colors import to_lab
    for g in TONED:
        vals = []
        for fg in figs:
            if g not in fg['lay']:
                continue
            l = fg['lay'][g]
            m = l[..., 3] > 230
            Lstar = to_lab(l[..., :3])[..., 0]
            mf = m.astype(np.float32)
            Ls = ndi.gaussian_filter(Lstar * mf, 0.8) / np.maximum(ndi.gaussian_filter(mf, 0.8), 1e-3)
            Ls = np.where(l[..., 3] > 0, np.where(m, Ls, Lstar), 0)
            fg.setdefault('tone', {})[g] = np.clip(Ls * 2.55, 0, 255).astype(np.uint8)
            if m.sum():
                vals.append(Ls[m])
        if not vals:
            continue
        v = np.concatenate(vals)
        sel = np.concatenate([fg['lay'][g][fg['lay'][g][..., 3] > 230][:, :3] for fg in figs if g in fg['lay']])
        tones[g] = dict(Lmed=float(np.median(v)), own=np.median(sel, 0).round().astype(int).tolist())

    for fg in figs:
        k = fg['k']; d = os.path.join(OUT, name, str(k)); os.makedirs(d, exist_ok=True)
        for nme, l in fg['lay'].items():
            Image.fromarray(l, 'RGBA').save(os.path.join(d, nme + '.png'), optimize=True)
        for g, t in fg.get('tone', {}).items():
            a = fg['lay'][g][..., 3]
            Image.fromarray(np.dstack([t, a]), 'LA').save(os.path.join(d, g + '_tone.png'), optimize=True)
        f = fg['f']; x0, y0 = fg['off']
        meta.append(dict(k=k, pose=POSES[name][k] if k < len(POSES[name]) else 'pose %d' % k,
                         size=[int(fg['own'].shape[1]), int(fg['own'].shape[0])],
                         feet=[float(f['foot_cx'] + f['box'][0] - x0), float(f['feet'] + f['box'][1] - y0)],
                         head_top=float(f['head_top'] + f['box'][1] - y0), head_cx=float(f['head_cx'] + f['box'][0] - x0),
                         stature=int(f['stature']), refs=fg['refs']))
    json.dump(dict(person=name, poses=meta, tones=tones), open(os.path.join(OUT, name, 'meta.json'), 'w'), indent=1)
    print(name, len(meta), 'poses', {g: tones[g]['own'][1] for g in tones})


if __name__ == '__main__':
    for n in sys.argv[1:]:
        export(n)
