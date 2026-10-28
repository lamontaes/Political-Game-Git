"""Rally in the town square, built only from the people kit.

Every person is one of six bodies (each with its own painted face) in one of
ten poses, with clothes and hair recolored from the parts and, for the women,
hairstyles swapped between them. Everyone faces the speaker: people left of
the lectern turn right, people right of it turn left, the stage supporters
turn toward her. Sizes come from the square's own perspective.
"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
from render import render, lum

PLATE = 'plate-try1.png'
K = 2752 / 1400          # spots are written in 1400-wide picture units
HORIZON = 476            # eye level of the camera (heads of standing adults sit near it)
SLOPE = 1.116            # stature per unit of distance below the horizon


def stature_at(y_feet):
    return SLOPE * (y_feet - HORIZON)


def lectern_mask(plate):
    a = plate.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    brown = (r > g) & (g > b) & (sat > 0.28) & (mx < 0.75) & (mx > 0.18)
    m = np.zeros(plate.shape[:2], bool)
    x0, x1, y0, y1 = 1725, 1915, 806, 1076
    box = brown[y0:y1, x0:x1]
    for y in range(y1 - y0):
        xs = np.nonzero(box[y])[0]
        if len(xs) > 8:
            m[y0 + y, x0 + xs.min():x0 + xs.max() + 1] = True
    # microphone on its gooseneck
    dark = mx < 0.3
    mm = np.zeros_like(m)
    mm[756:820, 1780:1840] = dark[756:820, 1780:1840]
    m |= ndi.binary_dilation(mm, iterations=1)
    m = ndi.binary_closing(m, iterations=2)
    return ndi.gaussian_filter(m.astype(np.float32), 0.8)


def place(canvas, spec, x, y_feet, stature, shadow=True):
    im, (fx, fy), st = render(spec)
    s = stature * K / st
    w, h = max(1, int(im.width * s)), max(1, int(im.height * s))
    im = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    X, Y = x * K, y_feet * K
    ox, oy = int(round(X - fx * s)), int(round(Y - fy * s))
    if shadow:
        sw, sh = int(stature * K * 0.30), max(4, int(stature * K * 0.045))
        sh_img = Image.new('L', (sw * 2, sh * 2), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(sh_img).ellipse((sw // 2, sh // 2, sw * 3 // 2, sh * 3 // 2), fill=95)
        sh_img = sh_img.filter(ImageFilter.GaussianBlur(sh * 0.35))
        dark = Image.new('RGBA', sh_img.size, (40, 36, 40, 0)); dark.putalpha(sh_img)
        canvas.alpha_composite(dark, (int(X - sw), int(Y - sh)))
    canvas.alpha_composite(im, (ox, oy)) if ox >= 0 and oy >= 0 else _paste_clip(canvas, im, ox, oy)


def _paste_clip(canvas, im, ox, oy):
    x0, y0 = max(0, -ox), max(0, -oy)
    crop = im.crop((x0, y0, im.width, im.height))
    canvas.alpha_composite(crop, (max(0, ox), max(0, oy)))


def build(spots, out):
    plate = Image.open(PLATE).convert('RGBA')
    canvas = plate.copy()
    pa = np.asarray(plate.convert('RGB'))
    lect = lectern_mask(pa)
    for s in sorted(spots, key=lambda s: s['y']):
        st = s.get('stature') or stature_at(s['y']) * s.get('h', 1.0)
        place(canvas, s['spec'], s['x'], s['y'], st, shadow=s.get('shadow', True))
        if s.get('behind_lectern'):
            L = Image.fromarray(np.dstack([pa, (lect * 255).astype(np.uint8)]), 'RGBA')
            canvas.alpha_composite(L)
    canvas.convert('RGB').save(out, quality=92)
    return canvas


if __name__ == '__main__':
    spots = json.load(open(sys.argv[1]))
    build(spots, sys.argv[2])
