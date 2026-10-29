"""Pick-and-stack people: a person is body + shoes + trousers + top + hair,
each a finished image from the kit, painted from a palette through its tone map."""
import json, os
import numpy as np
from PIL import Image

KIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit')
ORDER = ['body', 'shoes', 'trousers', 'top', 'hair', 'phone']  # trouser hems fall over the shoes
_meta, _img = {}, {}


def meta(p):
    if p not in _meta:
        _meta[p] = json.load(open(os.path.join(KIT, p, 'meta.json')))
    return _meta[p]


def img(p, k, part):
    key = (p, k, part)
    if key not in _img:
        f = os.path.join(KIT, p, str(k), part + '.png')
        _img[key] = np.asarray(Image.open(f)) if os.path.exists(f) else None
    return _img[key]


def lut(pal):
    """256-step tone ramp: drawn lines, shadow, base, highlight, with soft steps."""
    s, b, h = [np.array(c, np.float32) for c in pal]
    t = np.arange(256, dtype=np.float32)
    def step(x, edge, w=10):
        return np.clip((x - edge + w) / (2 * w), 0, 1)
    col = s[None] * (1 - step(t, 120)[:, None]) + b[None] * step(t, 120)[:, None]
    col = col * (1 - step(t, 200)[:, None]) + h[None] * step(t, 200)[:, None]
    line = s * 0.32
    col = col * step(t, 32, 8)[:, None] + line[None] * (1 - step(t, 32, 8)[:, None])
    return col.clip(0, 255)


def paint(p, k, part, color):
    """Repaint one part to a single color through its lightness map."""
    from colors import recolor_lab
    im = img(p, k, part)
    if im is None:
        return None
    tone = np.asarray(Image.open(os.path.join(KIT, p, str(k), part + '_tone.png')))
    out = im.copy()
    out[..., :3] = recolor_lab(tone[..., 0], tone[..., 1], color, meta(p)['tones'][part]['Lmed']).astype(np.uint8)
    return out


def fit_hair(p, k, donor, kd):
    """Another person's hair for the same pose, fitted to this skull."""
    from scipy import ndimage as ndi
    def skull(pp, kk):
        b = img(pp, kk, 'body')[..., 3] > 128
        m = meta(pp)['poses'][kk]
        top, cx = int(m['head_top']), int(m['head_cx'])
        r = top + int(0.035 * m['stature'])
        xs = np.nonzero(b[r, max(0, cx - 120):cx + 120])[0]
        w = (xs.max() - xs.min()) if len(xs) else 60
        c = (xs.max() + xs.min()) / 2 + max(0, cx - 120) if len(xs) else cx
        return top, c, w
    t0, c0, w0 = skull(p, k)
    t1, c1, w1 = skull(donor, kd)
    s = w0 / max(w1, 1)
    h = Image.fromarray(img(donor, kd, 'hair')).convert('RGBa')
    h = np.asarray(h.resize((max(1, int(h.width * s)), max(1, int(h.height * s))), Image.LANCZOS).convert('RGBA'))
    tone = Image.open(os.path.join(KIT, donor, str(kd), 'hair_tone.png')).convert('L')
    tone = np.asarray(tone.resize((h.shape[1], h.shape[0]), Image.BILINEAR))
    W, H = meta(p)['poses'][k]['size']
    out = np.zeros((H, W, 4), np.uint8); tout = np.zeros((H, W), np.uint8)
    ox, oy = int(round(c0 - c1 * s)), int(round(t0 - t1 * s))
    ys0, xs0, ys1, xs1 = max(0, oy), max(0, ox), min(H, oy + h.shape[0]), min(W, ox + h.shape[1])
    out[ys0:ys1, xs0:xs1] = h[ys0 - oy:ys1 - oy, xs0 - ox:xs1 - ox]
    tout[ys0:ys1, xs0:xs1] = tone[ys0 - oy:ys1 - oy, xs0 - ox:xs1 - ox]
    return out, tout


def person(spec, PAL):
    """spec: p, k, and optional top/trousers/shoes/hair palette names ('own' or absent = own colors),
    hairstyle=[donor, k] to wear another person's hair."""
    p, k = spec['p'], spec['k']
    tones = meta(p)['tones']
    m = meta(p)['poses'][k]
    W, H = m['size']
    C = np.zeros((H, W, 3), np.float32); A = np.zeros((H, W), np.float32)
    for part in ORDER:
        if part == 'hair' and spec.get('hairstyle'):
            d, kd = spec['hairstyle']
            im, tone = fit_hair(p, k, d, kd)
            from colors import recolor_lab
            col = PAL[spec['hair']][1] if spec.get('hair') and spec['hair'] != 'own' else None
            im = im.copy()
            if col is not None:
                im[..., :3] = recolor_lab(tone, im[..., 3], col, meta(d)['tones']['hair']['Lmed']).astype(np.uint8)
        elif part in tones:
            name = spec.get(part)
            # own colors: the part exactly as drawn; a picked color: repainted through its lightness map
            im = paint(p, k, part, PAL[name][1]) if name and name != 'own' else img(p, k, part)
        else:
            im = img(p, k, part)
        if im is None:
            continue
        a = im[..., 3].astype(np.float32) / 255
        C = im[..., :3] * a[..., None] + C * (1 - a[..., None]); A = a + A * (1 - a)
    rgb = np.where(A[..., None] > 1e-3, C / np.maximum(A[..., None], 1e-3), 0)
    out = np.dstack([rgb, A * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA'), tuple(m['feet']), m['stature']
