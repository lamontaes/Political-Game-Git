"""People kit for the rally build: one Layerize split per person's pose sheet.

Each person has a pose sheet (ten poses, same face and clothes) and its
Layerize parts: body (bald, own painted face), trousers, shoes, top, hair,
sometimes a phone. Figures are found in the sheet, and every figure keeps the
drawing's own pixels; parts are used to recolor clothes and hair and to swap
hairstyles between people.
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = ['body', 'trousers', 'shoes', 'top', 'hair']


def _canonical(name):
    n = name.lower()
    for k, words in [('body', ['bod']), ('trousers', ['trouser', 'pant', 'jean']),
                     ('shoes', ['shoe', 'sneaker', 'boot']), ('top', ['top', 'sweater', 'shirt']),
                     ('hair', ['hair']), ('phone', ['phone'])]:
        if any(w in n for w in words):
            return k
    return n


class Person:
    def __init__(self, name):
        self.name = name
        info = json.load(open(os.path.join(HERE, 'layers', name + '.json')))
        self.src = np.asarray(Image.open(os.path.join(HERE, info['sheet'])).convert('RGB'))
        H, W = self.src.shape[:2]
        self.layers = {}
        for L in info['layers']:
            k = L.get('part') or _canonical(L['name'])
            im = Image.open(os.path.join(HERE, 'layers', name, 'z%d.png' % L['z'])).convert('RGBA')
            x0, y0, x1, y1 = L['box']
            if im.size != (x1 - x0, y1 - y0):
                im = im.resize((x1 - x0, y1 - y0), Image.LANCZOS)
            c = np.zeros((H, W, 4), np.uint8)
            c[y0:y1, x0:x1] = np.asarray(im)
            self.layers[k] = c
        self.alpha = np.max([l[..., 3] for l in self.layers.values()], axis=0)
        self.hair_from_drawing = info.get('hair_from_drawing', False)
        self.figures = self._find_figures()

    def _find_figures(self):
        m = ndi.binary_dilation(self.alpha > 40, iterations=6)
        lab, n = ndi.label(m)
        objs = ndi.find_objects(lab)
        figs = []
        for i, sl in enumerate(objs):
            area = (lab[sl] == i + 1).sum()
            if area < 30000:
                continue
            y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
            figs.append(dict(box=(x0, y0, x1, y1), label=i + 1))
        H = self.src.shape[0]
        figs.sort(key=lambda f: (0 if (f['box'][1] + f['box'][3]) / 2 < H / 2 else 1, f['box'][0]))
        for f in figs:
            self._measure(f, lab)
        return figs

    def _measure(self, f, lab):
        x0, y0, x1, y1 = f['box']
        own = lab[y0:y1, x0:x1] == f['label']
        body = (self.layers['body'][y0:y1, x0:x1, 3] > 128) & own
        hair = (self.layers['hair'][y0:y1, x0:x1, 3] > 128) & own if ('hair' in self.layers and not self.hair_from_drawing) else np.zeros_like(body)
        ys, xs = np.nonzero(body | hair)
        feet = ys.max()
        # bald head top: topmost body pixel in a narrow column around the hair's center
        hy, hx = np.nonzero(hair)
        cx = int(np.median(hx)) if len(hx) else int(np.median(xs))
        hw = (hx.max() - hx.min()) if len(hx) else 120
        win = body[:, max(0, cx - hw // 5):cx + hw // 5]
        rows = np.nonzero(win.any(1))[0]
        top = rows.min() if len(rows) else ys.min()
        # head center: body extent a quarter head below the top, inside the hair's span
        r = min(top + int(0.12 * (feet - top) * 0.5), body.shape[0] - 1)
        span = np.nonzero(body[r, max(0, hx.min() - 10 if len(hx) else 0):(hx.max() + 10 if len(hx) else body.shape[1])])[0]
        hcx = (span.min() + span.max()) / 2 + (max(0, hx.min() - 10) if len(hx) else 0) if len(span) else cx
        bot = ys >= feet - 6
        f.update(own=own, feet=int(feet), head_top=int(top), head_cx=float(hcx),
                 foot_cx=float(xs[bot].mean()), stature=int(feet - top))

    def crop(self, k, pad=4):
        f = self.figures[k]
        x0, y0, x1, y1 = f['box']
        return (x0, y0, x1, y1)


def hsv_shift(rgb, hue=None, sat=1.0, val=1.0):
    """Recolor keeping the drawing's light and shade: hue replaced, saturation and value scaled."""
    a = rgb.astype(np.float32) / 255
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    v = mx
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    if hue is None:
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        h = np.zeros_like(mx)
        m = d > 1e-6
        rc = np.where(m, (mx - r) / np.maximum(d, 1e-6), 0)
        gc = np.where(m, (mx - g) / np.maximum(d, 1e-6), 0)
        bc = np.where(m, (mx - b) / np.maximum(d, 1e-6), 0)
        h = np.where(r == mx, bc - gc, np.where(g == mx, 2 + rc - bc, 4 + gc - rc))
        h = (h / 6) % 1
    else:
        h = np.full_like(mx, (hue % 360) / 360)
    s = np.clip(s * sat, 0, 1)
    v = np.clip(v * val, 0, 1)
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.choose(i[..., None].repeat(3, -1) * 0 + i[..., None],
                    [np.stack([v, t, p], -1), np.stack([q, v, p], -1), np.stack([p, v, t], -1),
                     np.stack([p, q, v], -1), np.stack([t, p, v], -1), np.stack([v, p, q], -1)])
    return (out * 255).clip(0, 255).astype(np.uint8)
