"""Check (and repair) the people kit against the owner's recurring complaints.

The drawing is the truth for what is visible. Every pixel the drawing shows as
skin, hair, sweater, trousers or shoes must come from that same part in the
stack; otherwise a recolor puts the wrong color there. Each mismatch type maps
to something the owner has called out:
  top on skin       -> "sleeves are bleeding into people's hands"
  top in hair       -> "I see green on the woman's long hair"
  trousers in top   -> "his pants are coming through"
  skin in shoes     -> hollow shoes showing bare feet
  hair on skin      -> hair over a face
Usage:
  python3 kit_check.py               check every person and pose, write a report, exit 1 on any flag
  python3 kit_check.py --repair      fix the kit in place, then check again
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from colors import de

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, 'kit')
ORDER = ['body', 'shoes', 'trousers', 'top', 'hair', 'phone']  # trouser hems fall over the shoes
CLASSES = ['body', 'trousers', 'shoes', 'top', 'hair']
NAMES = {('top', 'body'): 'sweater color on skin (hands/neck)', ('hair', 'top'): 'hair part holds sweater (sweater in hair)',
         ('top', 'hair'): 'sweater part holds hair', ('trousers', 'top'): 'trousers part holds sweater (pants through sweater)',
         ('top', 'trousers'): 'sweater part holds trousers', ('shoes', 'body'): 'shoe shows skin (hollow shoe)',
         ('body', 'shoes'): 'skin where the shoe is', ('hair', 'body'): 'hair part holds skin (hair over face)',
         ('body', 'top'): 'skin part holds sweater', ('body', 'hair'): 'skin part holds hair'}
MIN_CLUSTER = 12
SPECK = 3   # garment specks on skin are counted from this size


def mad(a, b):
    return np.abs(a.astype(np.float32) - np.asarray(b, np.float32)).mean(-1)


def lum(rgb):
    a = rgb.astype(np.float32) / 255
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def load(p, k):
    d = os.path.join(KIT, p, str(k))
    return {n: np.asarray(Image.open(os.path.join(d, n + '.png'))).copy() for n in ORDER if os.path.exists(os.path.join(d, n + '.png'))}


def drawing(p, k):
    """The sheet's own pixels for this figure, on the kit's canvas."""
    from kit import Person
    if p not in drawing.cache:
        drawing.cache[p] = Person(p)
    P = drawing.cache[p]
    f = P.figures[k]
    H, W = P.src.shape[:2]
    x0, y0 = max(0, f['box'][0] - 24), max(0, f['box'][1] - 24)
    m = json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'][k]
    w, h = m['size']
    return P.src[y0:y0 + h, x0:x0 + w].astype(np.float32)
drawing.cache = {}


def tone_sets(p, lay, src):
    """Reference colors per part, sampled from the part's own image (dark, middle, light);
    skin from the body where the drawing shows it."""
    ref = {}
    for g in ['trousers', 'shoes', 'top', 'hair']:
        if g in lay:
            px = lay[g][lay[g][..., 3] > 250][:, :3].astype(np.float32)
            px = px[lum(px[None])[0] > 0.12] if len(px) else px
            if len(px) > 30:
                ref[g] = [np.percentile(px, q, axis=0) for q in (20, 50, 85)]
    # skin and hair colors are fixed per figure from the original drawing at export time
    k_ = lay.get('_k')
    refs = json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'][k_]['refs']
    ref['body'] = [np.array(c, np.float32) for c in refs['skin']]
    # a part's own colors never include skin it wrongly holds (a sweater over a neck would hide
    # itself), unless the part itself is skin-colored (khaki trousers, blond hair)
    for g in ['hair', 'top', 'trousers', 'shoes']:
        if g in lay and g in ref:
            px = lay[g][lay[g][..., 3] > 250][:, :3].astype(np.float32)
            if len(px) > 30:
                skin_d = np.min(np.stack([de(px, c) for c in ref['body']]), 0)
                keep = px[skin_d > 20]
                if len(keep) > max(30, 0.4 * len(px)):
                    ref[g] = [np.percentile(keep, q, axis=0) for q in (20, 50, 85)]
    for g in CLASSES:
        ref.setdefault(g, [np.array([999, 999, 999], np.float32)])
    return ref


def classify(src, ref):
    d = np.stack([np.min(np.stack([de(src, c) for c in ref[g]]), 0) for g in CLASSES])
    cls = np.argmin(d, 0)
    srt = np.sort(d, 0)
    return cls, d, srt[0], srt[1]


def owner(lay):
    H, W = lay['body'].shape[:2]
    own = np.full((H, W), -1)
    solid_all = np.zeros((H, W), np.float32)
    for n in ORDER:
        if n not in lay:
            continue
        a = lay[n][..., 3] > (10 if n == 'hair' else 128)  # see-through stubble still counts as hair
        if n in CLASSES:
            own = np.where(a, CLASSES.index(n), own)
        elif n == 'phone':
            own = np.where(a, -2, own)
    return own


def mismatches(p, k, lay=None):
    lay = lay or load(p, k)
    lay['_k'] = k
    src = drawing(p, k)
    ref = tone_sets(p, lay, src)
    lay.pop('_k', None)
    # where each part can be at all: shoes at the feet, hair on the head and shoulders
    H = src.shape[0]
    rows = np.arange(H)[:, None] / H
    union0 = np.max([lay[n][..., 3] for n in lay], axis=0) > 128
    ys = np.nonzero(union0.any(1))[0]
    top_y, bot_y = (ys.min(), ys.max()) if len(ys) else (0, H)
    rel = (np.arange(H)[:, None] - top_y) / max(bot_y - top_y, 1)
    ref = dict(ref)
    cls, d, d1, d2 = classify(src, ref)
    d = d.copy()
    d[CLASSES.index('shoes')] = np.where(np.broadcast_to(rel < 0.82, d[0].shape), 1e3, d[CLASSES.index('shoes')])
    d[CLASSES.index('hair')] = np.where(np.broadcast_to(rel > 0.6, d[0].shape), 1e3, d[CLASSES.index('hair')])
    d[CLASSES.index('trousers')] = np.where(np.broadcast_to(rel < 0.35, d[0].shape), 1e3, d[CLASSES.index('trousers')])
    # the legs are always covered (no shorts): below hand height the body never owns a pixel,
    # and inside the trousers' outline only a hand on the hip or in a pocket is body
    d[CLASSES.index('body')] = np.where(np.broadcast_to(rel > 0.6, d[0].shape), 1e3, d[CLASSES.index('body')])
    if 'trousers' in lay:
        pose_ = json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'][k]['pose']
        if not any(w in pose_ for w in ('hip', 'pockets')):
            tz = ndi.binary_fill_holes(lay['trousers'][..., 3] > 128) & np.broadcast_to(rel > 0.45, d[0].shape)
            d[CLASSES.index('body')] = np.where(tz, 1e3, d[CLASSES.index('body')])
    # nothing worn on the body is ever on the face
    mp_ = json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'][k]
    hcx_, ht_, st_ = mp_['head_cx'], mp_['head_top'], mp_['stature']
    facebox = np.zeros(d[0].shape, bool)
    facebox[max(0, int(ht_)):int(ht_ + 0.15 * st_), max(0, int(hcx_ - 0.07 * st_)):int(hcx_ + 0.07 * st_)] = True
    if not any(w in mp_['pose'] for w in ('fist', 'filming')):   # raised arms pass beside the head
        for g_ in ['top', 'trousers', 'shoes']:
            d[CLASSES.index(g_)] = np.where(facebox, 1e3, d[CLASSES.index(g_)])
    if mp_['pose'].startswith('front'):
        eyes = np.zeros(d[0].shape, bool)
        eyes[int(ht_ + 0.05 * st_):int(ht_ + 0.085 * st_), max(0, int(hcx_ - 0.04 * st_)):int(hcx_ + 0.04 * st_)] = True
        d[CLASSES.index('hair')] = np.where(eyes, 1e3, d[CLASSES.index('hair')])
    # hair only where the hair shape is (a hand's dark shading is never hair)
    if 'hair' in lay:
        allowed = ndi.binary_dilation(lay['hair'][..., 3] > 40, iterations=5)
        d[CLASSES.index('hair')] = np.where(allowed, d[CLASSES.index('hair')], 1e3)
    cls = np.argmin(d, 0); srt = np.sort(d, 0); d1, d2 = srt[0], srt[1]
    own = owner(lay)
    lay.pop('_k', None)
    union = np.max([lay[n][..., 3] for n in lay], axis=0)
    interior = ndi.binary_erosion(union > 250, iterations=2)
    line = lum(src) < 0.17
    valid = (own >= 0) & interior & ~line
    oi = np.clip(own, 0, None)
    d_own = np.take_along_axis(d, oi[None], 0)[0]
    # clearly drawn as another part: far from the owner's colors, close to the drawn class, and a clear winner
    bad = valid & (cls != own) & (d_own > 16) & (d1 < 14) & (d_own > 1.6 * d1 + 4)
    # inside the hair, color cannot tell blond hair from skin: hair and skin are judged at the hair's edge only
    if 'hair' in lay:
        hair_inside = ndi.binary_erosion(lay['hair'][..., 3] > 128, iterations=4)
        hb = (CLASSES.index('hair'), CLASSES.index('body'))
        pair = ((own == hb[0]) & (cls == hb[1])) | ((own == hb[1]) & (cls == hb[0]))
        bad &= ~(hair_inside & pair)
    if p.startswith('man'):
        # beard texture on the lower face stays drawn on the face; it is not a defect
        mp = json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'][k]
        face = np.zeros(bad.shape, bool); face[int(mp['head_top'] + 0.075 * mp['stature']):int(mp['head_top'] + 0.2 * mp['stature'])] = True
        bad &= ~(face & (own == CLASSES.index('body')) & (cls == CLASSES.index('hair')))
    bad = ndi.binary_opening(bad, iterations=1)
    # backstop: in its own colors the stack must reproduce the drawing everywhere inside the figure
    C = np.zeros(src.shape, np.float32); Aa = np.zeros(src.shape[:2], np.float32)
    for n_ in ORDER:
        if n_ in lay:
            a_ = lay[n_][..., 3:4].astype(np.float32) / 255
            C = lay[n_][..., :3] * a_ + C * (1 - a_); Aa = a_[..., 0] + Aa * (1 - a_[..., 0])
    stack_rgb = C / np.maximum(Aa[..., None], 1e-3)
    differ = interior & (Aa > 0.5) & (de(stack_rgb, src) > 18)
    differ = ndi.binary_opening(differ, iterations=1)
    lab2, n2 = ndi.label(differ)
    repro = []
    for i, sl in enumerate(ndi.find_objects(lab2)):
        reg = lab2[sl] == i + 1
        if reg.sum() >= MIN_CLUSTER:
            repro.append(dict(owner='stack', drawn='drawing', px=int(reg.sum()), box=[sl[1].start, sl[0].start, sl[1].stop, sl[0].stop],
                              what='stack differs from the drawing'))
    bad = bad | differ
    lab, n = ndi.label(bad & ~differ)
    flags = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        reg = lab[sl] == i + 1
        size = int(reg.sum())
        if size < MIN_CLUSTER:
            continue
        o = int(np.bincount(own[sl][reg]).argmax()); c = int(np.bincount(cls[sl][reg]).argmax())
        flags.append(dict(owner=CLASSES[o], drawn=CLASSES[c], px=size, box=[sl[1].start, sl[0].start, sl[1].stop, sl[0].stop],
                          what=NAMES.get((CLASSES[o], CLASSES[c]), f'{CLASSES[o]} part holds {CLASSES[c]}')))
    flags += repro
    # garment specks sitting on skin the drawing shows (knuckles, fingers)
    skinish = (cls == CLASSES.index('body')) & (d1 < 14) & interior
    for g in ['top', 'trousers', 'shoes', 'hair']:
        if g in lay:
            sp = skinish & (lay[g][..., 3] > 60) & (own == CLASSES.index(g))
            labs, ns = ndi.label(sp)
            cnt = sum(1 for i in range(ns) if (labs == i + 1).sum() >= SPECK)
            if cnt:
                ys_, xs_ = np.nonzero(sp)
                flags.append(dict(owner=g, drawn='body', px=int(sp.sum()), box=[int(xs_.min()), int(ys_.min()), int(xs_.max()), int(ys_.max())],
                                  what=f'{cnt} {g} specks on skin'))
                bad = bad | sp
    return flags, (bad, cls, own, src, lay, differ, d1)


def repair(p, k):
    """Hand each mismatched pixel to the part the drawing shows there."""
    lay = load(p, k)
    touched = np.zeros(lay['body'].shape[:2], bool)
    for it in range(3):
        flags, (bad, cls, own, src, lay, differ, d1) = mismatches(p, k, lay)
        if not flags:
            break
        grow = (ndi.binary_dilation(bad, iterations=1) & (cls != own) & (own >= 0)) | ndi.binary_dilation(differ, iterations=1)
        ys, xs = np.nonzero(grow)
        for y, x in zip(ys, xs):
            want = CLASSES[cls[y, x]]
            if not (d1[y, x] < 14):
                # not clearly any part by color: the highest part that reaches this pixel takes the drawing's pixel
                reach = [n_ for n_ in ORDER if n_ in lay and n_ in CLASSES and lay[n_][y, x, 3] > 0]
                want = reach[-1] if reach else 'body'
            if want not in lay:
                continue
            # remove every part stacked above the wanted one at this pixel
            for n in ORDER[ORDER.index(want) + 1:]:
                if n in lay:
                    lay[n][y, x, 3] = 0
            lay[want][y, x, :3] = src[y, x].astype(np.uint8)
            lay[want][y, x, 3] = 255
            touched[y, x] = True
    # garments have no holes: trousers are filled solid (except a hand on a hip or in a pocket),
    # and tiny specks inside any garment are filled with the drawing's own pixels
    src_ = drawing(p, k)
    pose_ = json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'][k]['pose']
    for g in ['trousers', 'top', 'shoes']:
        if g not in lay:
            continue
        solid = lay[g][..., 3] > 128
        holes = ndi.binary_fill_holes(solid) & ~solid
        if not (g == 'trousers' and not any(w in pose_ for w in ('hip', 'pockets'))):
            lab_, n_ = ndi.label(holes)
            if n_:
                sz = ndi.sum(holes, lab_, range(1, n_ + 1))
                holes = np.isin(lab_, [i + 1 for i, v in enumerate(sz) if v < 60])
        above = np.zeros(holes.shape, bool)
        for n_ in ORDER[ORDER.index(g) + 1:]:
            if n_ in lay:
                above |= lay[n_][..., 3] > 128
        holes &= ~above
        if g != 'trousers' or any(w in pose_ for w in ('hip', 'pockets')):
            # a small gap can be a fingertip (on a sweater, or a hand on the hip): only fill where the drawing is not skin
            sk = json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'][k]['refs']['skin']
            dsk = np.min(np.stack([de(src_, np.array(s_, np.float32)) for s_ in sk]), 0)
            holes &= dsk > 14
        lay[g][holes, :3] = src_[holes].astype(np.uint8)
        lay[g][holes, 3] = 255
        touched |= holes
    d = os.path.join(KIT, p, str(k))
    for n, l in lay.items():
        Image.fromarray(l, 'RGBA').save(os.path.join(d, n + '.png'))
        tf = os.path.join(d, n + '_tone.png')
        if os.path.exists(tf):
            t = np.asarray(Image.open(tf)).copy()
            t[..., 1] = l[..., 3]
            # pixels newly given to this part get a tone from their own lightness (base band)
            # pixels the repair touched take their shading from their own (drawing) color
            from colors import to_lab
            t[..., 0] = np.where(touched, np.clip(to_lab(l[..., :3])[..., 0] * 2.55, 0, 255), t[..., 0]).astype(np.uint8)
            Image.fromarray(t, 'LA').save(tf)
    return mismatches(p, k)[0]


def crops(report, out):
    sys.path.insert(0, HERE)
    from engine import person as stackp
    from render import PAL
    tiles = []
    for p, k, flags in report:
        test = dict(p=p, k=k, top='orange', trousers='sky', shoes='white', hair='h-blond')
        im, _, _ = stackp(test, PAL)
        bg = Image.new('RGBA', im.size, (250, 248, 240, 255)); bg.alpha_composite(im)
        r = np.asarray(bg.convert('RGB')); src = drawing(p, k).astype(np.uint8)
        for fl in flags[:4]:
            x0, y0, x1, y1 = fl['box']; cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; R = 60
            a = src[max(0, cy - R):cy + R, max(0, cx - R):cx + R]; b = r[max(0, cy - R):cy + R, max(0, cx - R):cx + R]
            t = Image.fromarray(np.hstack([a, b])).resize((480, 240))
            from PIL import ImageDraw
            ImageDraw.Draw(t).text((4, 4), f'{p} {k}: {fl["what"]} ({fl["px"]}px)', fill=(220, 0, 0))
            tiles.append(t)
    if not tiles:
        return
    cols = 3
    W = Image.new('RGB', (cols * 484, ((len(tiles) + cols - 1) // cols) * 244), (255, 255, 255))
    for i, t in enumerate(tiles):
        W.paste(t, ((i % cols) * 484, (i // cols) * 244))
    W.save(out, quality=88)


if __name__ == '__main__':
    people = sorted(d for d in os.listdir(KIT) if os.path.isdir(os.path.join(KIT, d)))
    report = []
    for p in people:
        n = len(json.load(open(os.path.join(KIT, p, 'meta.json')))['poses'])
        for k in range(n):
            flags = repair(p, k) if '--repair' in sys.argv else mismatches(p, k)[0]
            if flags:
                report.append((p, k, flags))
    total = sum(len(f) for _, _, f in report)
    for p, k, fl in report:
        for f in fl:
            print(f'{p} pose {k}: {f["what"]} ({f["px"]} px at {f["box"]})')
    out = sys.argv[sys.argv.index('--crops') + 1] if '--crops' in sys.argv else None
    if out and report:
        crops(report, out)
    print(f'{total} flags in {len(report)} poses')
    sys.exit(1 if total else 0)
