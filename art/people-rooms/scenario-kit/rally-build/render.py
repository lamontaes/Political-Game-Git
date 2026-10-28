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


def render(spec):
    """spec: dict(p, k, top, trousers, shoes, hair, hair_from=(p2, k2))
    Returns RGBA image, feet (x, y) and stature in its own pixels."""
    P = person(spec['p'])
    box, src, lay, own = figure_parts(P, spec['k'])
    rgb = src.astype(np.float32)
    under_rgb, under_a = stack(lay, ['body', 'trousers', 'shoes', 'top'])
    full_rgb, full_a = stack(lay, ['body', 'trousers', 'shoes', 'top', 'hair', 'phone'])
    alpha = full_a.copy()
    # edges: the sheet's pixels there are mixed with its gray background, so take the parts' own color
    edge = full_a < 0.98
    rgb[edge] = full_rgb[edge]

    recolored_layers = dict(lay)
    for part in ['top', 'trousers', 'shoes']:
        pal = spec.get(part)
        if not pal or part not in lay:
            continue
        a = lay[part][..., 3] / 255
        w = a * agree(src, lay[part])
        ref = (a > 0.9) & (w > 0.9)
        rgb = shade_map(rgb, w, PAL[pal], ref).astype(np.float32)
        lr = lay[part].copy()
        lr[..., :3] = shade_map(lr[..., :3].astype(np.float32), (lr[..., 3] > 0).astype(np.float32), PAL[pal], lr[..., 3] > 230)
        recolored_layers[part] = lr

    hair_pal = spec.get('hair')
    if spec.get('hair_from'):
        p2, k2 = spec['hair_from']
        # take the old hair away: under it lie the bald head and the completed top
        u_rgb, u_a = stack(recolored_layers, ['body', 'trousers', 'shoes', 'top'])
        R = ndi.binary_dilation(lay['hair'][..., 3] > 10, iterations=3)
        rgb[R] = u_rgb[R]
        alpha[R] = u_a[R]
        top0, cx0, w0 = head_anchor(lay)
        Q = person(p2)
        _, src2, lay2, _ = figure_parts(Q, k2)
        top1, cx1, w1 = head_anchor(lay2)
        s = w0 / max(w1, 1)
        hl = Image.fromarray(lay2['hair']).convert('RGBa')
        hl = hl.resize((max(1, int(hl.width * s)), max(1, int(hl.height * s))), Image.LANCZOS).convert('RGBA')
        H = np.zeros_like(lay['hair'])
        ox, oy = int(round(cx0 - cx1 * s)), int(round(top0 - top1 * s))
        hh = np.asarray(hl)
        ys0, xs0 = max(0, oy), max(0, ox)
        ys1, xs1 = min(H.shape[0], oy + hh.shape[0]), min(H.shape[1], ox + hh.shape[1])
        H[ys0:ys1, xs0:xs1] = hh[ys0 - oy:ys1 - oy, xs0 - ox:xs1 - ox]
        if hair_pal:
            hm = H[..., 3] > 230
            H[..., :3] = gradient_map(H[..., :3].astype(np.float32), (H[..., 3] > 0).astype(np.float32), PAL[hair_pal], hm)
        ha = H[..., 3:4].astype(np.float32) / 255
        rgb = H[..., :3] * ha + rgb * (1 - ha)
        alpha = ha[..., 0] + alpha * (1 - ha[..., 0])
    elif hair_pal and 'hair' in lay:
        a = lay['hair'][..., 3] / 255
        w = a * agree(src, lay['hair'], 30, 70)
        rgb = gradient_map(rgb, w, PAL[hair_pal], (a > 0.9) & (w > 0.9)).astype(np.float32)

    out = np.dstack([rgb.clip(0, 255), (alpha * 255).clip(0, 255)]).astype(np.uint8)
    out[~own] = 0
    f = P.figures[spec['k']]
    fx = f['foot_cx'] + f['box'][0] - box[0]
    fy = f['feet'] + f['box'][1] - box[1]
    return Image.fromarray(out, 'RGBA'), (fx, fy), f['stature']
