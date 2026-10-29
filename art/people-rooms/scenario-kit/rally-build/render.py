"""Assemble one person instance from the kit: a body (with its own painted face)
in one pose, clothes and hair recolored by palette, optionally another person's
hairstyle. Keeps the drawing's pixels wherever nothing changes."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from kit import Person

# three-stop palettes: shadow, mid, light (sRGB)
PAL = {
    # tops
    'navy': [(22, 30, 58), (40, 56, 104), (78, 98, 150)],
    'maroon': [(58, 14, 26), (110, 30, 48), (158, 66, 84)],
    'forest': [(18, 46, 28), (38, 88, 52), (82, 132, 92)],
    'mustard': [(120, 86, 14), (196, 150, 40), (232, 196, 96)],
    'heather': [(84, 86, 92), (136, 138, 146), (190, 192, 198)],
    'red': [(96, 16, 16), (172, 38, 36), (214, 88, 80)],
    'teal': [(10, 60, 64), (24, 112, 118), (84, 166, 170)],
    'plum': [(52, 24, 60), (96, 52, 108), (146, 100, 158)],
    'cream': [(150, 140, 118), (214, 204, 180), (246, 240, 224)],
    'black': [(14, 14, 16), (40, 40, 44), (82, 82, 88)],
    'orange': [(130, 52, 12), (210, 104, 34), (240, 160, 90)],
    'sky': [(56, 96, 140), (104, 152, 200), (166, 202, 232)],
    'olive': [(52, 56, 24), (96, 102, 50), (146, 150, 96)],
    'rust': [(88, 36, 18), (150, 70, 38), (196, 118, 82)],
    # trousers
    'denim': [(22, 34, 66), (44, 66, 112), (92, 118, 160)],
    'khaki': [(110, 90, 58), (176, 152, 108), (216, 198, 158)],
    'charcoal': [(26, 28, 32), (56, 58, 64), (98, 100, 108)],
    'brown': [(46, 30, 20), (88, 60, 42), (134, 100, 76)],
    'stone': [(110, 106, 98), (164, 160, 150), (208, 204, 194)],
    # shoes
    'white': [(150, 150, 154), (214, 214, 218), (246, 246, 248)],
    'tan': [(96, 62, 32), (156, 108, 64), (200, 158, 112)],
    # hair
    'h-black': [(8, 8, 10), (26, 24, 26), (60, 56, 58)],
    'h-darkbrown': [(22, 12, 8), (58, 36, 24), (98, 68, 48)],
    'h-brown': [(44, 26, 14), (98, 64, 38), (150, 108, 70)],
    'h-auburn': [(52, 18, 10), (122, 48, 26), (178, 92, 56)],
    'h-blond': [(112, 82, 40), (186, 152, 92), (232, 210, 152)],
    'h-gray': [(70, 70, 74), (142, 142, 146), (204, 204, 208)],
    'h-white': [(120, 120, 124), (198, 198, 202), (240, 240, 242)],
}

_cache = {}


def person(name):
    if name not in _cache:
        _cache[name] = Person(name)
    return _cache[name]


def lum(rgb):
    a = rgb.astype(np.float32) / 255
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def shade_map(rgb, weight, pal, ref_mask):
    """Repaint to a palette keeping the drawing's shading: each pixel keeps its
    lightness relative to the part's middle tone (outlines stay dark)."""
    L = lum(rgb)
    vals = L[ref_mask]
    if vals.size < 50:
        return rgb
    # knit texture in a dark cloth turns into speckles in a light one: keep only part of it
    L = 0.7 * ndi.gaussian_filter(L, 1.2) + 0.3 * L
    vals = L[ref_mask]
    med, hi = np.percentile(vals, [50, 98])
    d, m, l = [np.array(c, np.float32) for c in pal]
    r = L / max(med, 1e-3)
    rh = max(hi / max(med, 1e-3), 1.05)
    below = m * (np.clip(r, 0, 1) ** 0.9)[..., None]
    t = np.clip((r - 1) / (rh - 1), 0, 1)[..., None]
    above = m + (l - m) * t
    out = np.where((r <= 1)[..., None], below, above)
    w = weight[..., None]
    return (rgb * (1 - w) + out * w).clip(0, 255).astype(np.uint8)


def gradient_map(rgb, weight, pal, ref_mask):
    """Repaint pixels through a shadow-mid-light ramp keyed on their own lightness.
    ref_mask picks the pixels whose lightness range defines the ramp."""
    L = lum(rgb)
    vals = L[ref_mask]
    if vals.size < 50:
        return rgb
    lo, mid, hi = np.percentile(vals, [12, 55, 97])
    d, m, l = [np.array(c, np.float32) for c in pal]
    t = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)
    tm = (mid - lo) / max(hi - lo, 1e-3)
    out = np.where((t < tm)[..., None], d + (m - d) * (t / max(tm, 1e-3))[..., None],
                   m + (l - m) * ((t - tm) / max(1 - tm, 1e-3))[..., None])
    # outlines and deep shade fade toward black, as drawn
    dark = np.clip(L / max(lo, 1e-3), 0, 1)[..., None]
    out = np.where((L < lo)[..., None], d * dark, out)
    w = weight[..., None]
    return (rgb * (1 - w) + out * w).clip(0, 255).astype(np.uint8)


def stack(layers, keys):
    """Premultiplied 'over' of the named layers, returned straight RGB + alpha."""
    H, W = next(iter(layers.values())).shape[:2]
    C = np.zeros((H, W, 3), np.float32)
    A = np.zeros((H, W), np.float32)
    for k in keys:
        if k not in layers:
            continue
        l = layers[k].astype(np.float32)
        a = l[..., 3] / 255
        C = l[..., :3] * a[..., None] + C * (1 - a[..., None])
        A = a + A * (1 - a)
    rgb = np.where(A[..., None] > 1e-3, C / np.maximum(A[..., None], 1e-3), 0)
    return rgb.clip(0, 255), A


def agree(src, lay, lo=22, hi=55):
    d = np.abs(src.astype(np.float32) - lay[..., :3].astype(np.float32)).mean(-1)
    return np.clip((hi - d) / (hi - lo), 0, 1)


def figure_parts(P, k, pad=24):
    f = P.figures[k]
    x0, y0, x1, y1 = f['box']
    H, W = P.src.shape[:2]
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
    own_full = np.zeros(P.src.shape[:2], bool)
    fx0, fy0, fx1, fy1 = f['box']
    own_full[fy0:fy1, fx0:fx1] = f['own']
    own = ndi.binary_dilation(own_full[y0:y1, x0:x1], iterations=3)
    lay = {n: l[y0:y1, x0:x1] * own[..., None] for n, l in P.layers.items()}
    src = P.src[y0:y1, x0:x1].copy()
    if getattr(P, 'hair_from_drawing', False):
        lay['hair'] = drawn_hair(src, lay, own, f, (x0, y0))
    return (x0, y0, x1, y1), src, lay, own


def drawn_hair(src, lay, own, f, off):
    """Hair (and facial hair) as the drawing shows it: in the head band, pixels
    the drawing paints differently from the bald body and that are not the top."""
    body = lay['body']
    top = f['head_top'] + f['box'][1] - off[1]
    band = np.zeros(own.shape, bool)
    band[max(0, top - 60):top + int(0.21 * f['stature'])] = True
    not_skin = agree(src, body, 18, 48) < 0.5
    not_top = ~((lay['top'][..., 3] > 128) & (agree(src, lay['top']) > 0.5)) if 'top' in lay else True
    m = band & own & not_skin & not_top & (lum(src) < 0.9) & (body[..., 3] > 60)
    m = ndi.binary_opening(m, iterations=1)
    # light streaks inside the hair look like skin by color; the hair around them closes them in
    m = ndi.binary_fill_holes(ndi.binary_closing(m, iterations=3)) & own & band & (not_top if not isinstance(not_top, bool) else True)
    lab, n = ndi.label(m)
    if n:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 40])
    a = ndi.gaussian_filter(m.astype(np.float32), 0.7)
    out = np.zeros(src.shape[:2] + (4,), np.uint8)
    out[..., :3] = src
    out[..., 3] = (np.clip(a * 1.4, 0, 1) * 255).astype(np.uint8)
    return out


def head_anchor(lay):
    """Top of the bald head and its center, from the body layer under the hair."""
    hair = lay['hair'][..., 3] > 128
    body = lay['body'][..., 3] > 128
    hy, hx = np.nonzero(hair)
    cx = int(np.median(hx))
    hw = hx.max() - hx.min()
    win = body[:, max(0, cx - hw // 5):cx + hw // 5]
    top = np.nonzero(win.any(1))[0].min()
    ys, xs = np.nonzero(body[top:top + int(hw * 0.6), max(0, hx.min() - 8):hx.max() + 8])
    hcx = xs.mean() + max(0, hx.min() - 8) if len(xs) else cx
    # head width measured a third of the way down the skull
    r = top + int(hw * 0.35)
    row = np.nonzero(body[r, max(0, hx.min() - 8):hx.max() + 8])[0]
    width = (row.max() - row.min()) if len(row) else hw * 0.7
    return float(top), float(hcx), float(width)


Z = {'body': 1, 'trousers': 2, 'shoes': 3, 'top': 4, 'hair': 5, 'phone': 6}
PAINTED = ['top', 'trousers', 'shoes', 'hair']


def owner_map(src, lay, own, fixed=None):
    """One owner per pixel. A part can own a pixel only where its layer is solid;
    among those, the drawing's color decides, with the part in front favored, so a
    sweater hem stays sweater and a hand over the sweater stays skin."""
    names = [n for n in Z if n in lay]
    H, W = src.shape[:2]
    cost = np.full((len(names), H, W), 1e9, np.float32)
    s = src.astype(np.float32)
    for i, n in enumerate(names):
        l = lay[n]
        d = np.abs(s - l[..., :3].astype(np.float32)).mean(-1)
        c = d - 10.0 * Z[n]
        cost[i] = np.where(l[..., 3] > 128, c, 1e9)
    lab = np.argmin(cost, 0)
    none = cost.min(0) >= 1e9
    if fixed is not None:
        fm, fl = fixed
        lab[fm] = fl[fm]
        none &= ~fm
    # a pixel's owner follows its neighborhood, so no stray speckles of one part inside another
    votes = np.stack([ndi.gaussian_filter(((lab == i) & ~none).astype(np.float32), 1.2) for i in range(len(names))])
    lab = np.argmax(votes, 0)
    out = {n: (lab == i) & ~none & own for i, n in enumerate(names)}
    return out


def palette_paint(rgb, mask, pal=None, sigma=2.0):
    """Repaint one part in three flat tones (shadow, base, highlight) like the
    game's cel shading. Tones follow the drawing's broad light, not its texture;
    the drawn outlines stay as they are. pal=None keeps the part's own colors."""
    if mask.sum() < 30:
        return rgb
    L = lum(rgb)
    m = mask.astype(np.float32)
    Ls = ndi.gaussian_filter(L * m, sigma) / np.maximum(ndi.gaussian_filter(m, sigma), 1e-3)
    v = Ls[mask]
    p15 = np.percentile(L[mask], 15)
    line = mask & (L < 0.6 * p15) & (L < 0.16)
    body = mask & ~line
    t1, t2 = np.percentile(Ls[body], [28, 90]) if body.sum() > 30 else np.percentile(v, [28, 90])
    w = 0.012
    sh = np.clip((t1 + w - Ls) / (2 * w), 0, 1)
    hi = np.clip((Ls - (t2 - w)) / (2 * w), 0, 1)
    ba = np.clip(1 - sh - hi, 0, 1)
    if pal is None:
        def med(sel):
            sel = sel & body
            return np.median(rgb[sel], 0) if sel.sum() > 10 else np.median(rgb[body], 0)
        cs, cb, ch = med(Ls < t1), med((Ls >= t1) & (Ls <= t2)), med(Ls > t2)
    else:
        d, mm, l = [np.array(c, np.float32) for c in pal]
        cs, cb, ch = 0.45 * d + 0.55 * mm, mm, 0.6 * mm + 0.4 * l
    col = sh[..., None] * cs + ba[..., None] * cb + hi[..., None] * ch
    out = rgb.astype(np.float32).copy()
    out[body] = col[body]
    # drawn lines keep their darkness but take a hint of the new color
    out[line] = (0.75 * rgb[line].astype(np.float32) + 0.25 * cs * 0.4)
    return out


def render(spec):
    """spec: dict(p, k, top, trousers, shoes, hair, hair_from=(p2, k2))
    Every garment and the hair are repainted from a palette (their own colors
    when none is given), so all people share one clean look.
    Returns RGBA image, feet (x, y) and stature in its own pixels."""
    P = person(spec['p'])
    box, src, lay, own = figure_parts(P, spec['k'])
    full_rgb, full_a = stack(lay, ['body', 'trousers', 'shoes', 'top', 'hair', 'phone'])
    rgb = src.astype(np.float32)
    alpha = full_a.copy()
    edge = full_a < 0.98
    rgb[edge] = full_rgb[edge]

    fixed = None
    newhair = None
    if spec.get('hair_from'):
        # lift the old hair: under it lie the bald head and the completed top
        u_rgb, u_a = stack(lay, ['body', 'trousers', 'shoes', 'top'])
        R = ndi.binary_dilation(lay['hair'][..., 3] > 10, iterations=3)
        rgb[R] = u_rgb[R]
        alpha[R] = u_a[R]
        names = [n for n in Z if n in lay]
        fl = np.zeros(R.shape, int)
        best = np.zeros(R.shape, int) - 1
        for i, n in enumerate(names):
            if n in ('hair', 'phone'):
                continue
            solid = lay[n][..., 3] > 128
            fl = np.where(solid & (Z[n] > best), i, fl)
            best = np.where(solid & (Z[n] > best), Z[n], best)
        fixed = (R & (best > 0), fl)
        lay = dict(lay)
        lay['hair'] = np.zeros_like(lay['hair'])
        top0, cx0, w0 = head_anchor({'hair': (np.dstack([R] * 4) * 255).astype(np.uint8), 'body': figure_parts(P, spec['k'])[2]['body']})
        _, src2, lay2, _ = figure_parts(person(spec['hair_from'][0]), spec['hair_from'][1])
        top1, cx1, w1 = head_anchor(lay2)
        sc = w0 / max(w1, 1)
        hl = Image.fromarray(lay2['hair']).convert('RGBa')
        hl = hl.resize((max(1, int(hl.width * sc)), max(1, int(hl.height * sc))), Image.LANCZOS).convert('RGBA')
        Hh = np.zeros_like(lay2['hair'][:1, :1]).repeat(rgb.shape[0], 0).repeat(rgb.shape[1], 1)
        ox, oy = int(round(cx0 - cx1 * sc)), int(round(top0 - top1 * sc))
        hh = np.asarray(hl)
        ys0, xs0 = max(0, oy), max(0, ox)
        ys1, xs1 = min(Hh.shape[0], oy + hh.shape[0]), min(Hh.shape[1], ox + hh.shape[1])
        Hh[ys0:ys1, xs0:xs1] = hh[ys0 - oy:ys1 - oy, xs0 - ox:xs1 - ox]
        newhair = Hh

    owners = owner_map(src if fixed is None else rgb.astype(np.uint8), lay, own, fixed)
    for part in PAINTED:
        if part not in owners or (part == 'hair' and newhair is not None):
            continue
        pal = PAL[spec[part]] if spec.get(part) else None
        rgb = palette_paint(rgb, owners[part], pal)

    if newhair is not None:
        hm = newhair[..., 3] > 128
        hr = palette_paint(newhair[..., :3].astype(np.float32), hm, PAL[spec['hair']] if spec.get('hair') else None)
        ha = newhair[..., 3:4].astype(np.float32) / 255
        rgb = hr * ha + rgb * (1 - ha)
        alpha = ha[..., 0] + alpha * (1 - ha[..., 0])

    out = np.dstack([rgb.clip(0, 255), (alpha * 255).clip(0, 255)]).astype(np.uint8)
    out[~own] = 0
    f = P.figures[spec['k']]
    fx = f['foot_cx'] + f['box'][0] - box[0]
    fy = f['feet'] + f['box'][1] - box[1]
    return Image.fromarray(out, 'RGBA'), (fx, fy), f['stature']
