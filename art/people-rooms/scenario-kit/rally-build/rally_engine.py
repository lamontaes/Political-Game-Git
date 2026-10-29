"""The rally built with the character creator: all six people, each in a mix of
colors from their own master color sheet, stacked from the kit (body, shoes,
trousers, top, hair). A few whole drawn looks (Firefly) join the crowd."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'looks'))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from engine import person, meta
from master import CLOTH, HAIR, SHOES
from scene import lectern_mask, stature_at, K

PAL = {**{k: [v, v, v] for k, v in CLOTH.items()}, **{k: [v, v, v] for k, v in SHOES.items()}, **{'h-' + k: [v, v, v] for k, v in HAIR.items()}}
LOOKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'looks')


def check_colors(spec):
    pal = meta(spec['p'])['palettes']
    for part in ['top', 'trousers', 'shoes']:
        if spec.get(part):
            assert spec[part] in pal[part], (spec['p'], part, spec[part])
    if spec.get('hair'):
        assert spec['hair'][2:] in pal['hair'], (spec['p'], spec['hair'])


def figure(spot):
    if 'look' in spot:
        from lift import lift
        sheet, k = spot['look']
        f = lift(os.path.join(LOOKS, sheet + '.png'))[k]
        return f['img'], (f['foot_cx'], f['feet']), f['stature']
    check_colors(spot['spec'])
    return person(spot['spec'], PAL)


def build(spots, out):
    plate = Image.open('plate-try1.png').convert('RGBA')
    pa = np.asarray(plate.convert('RGB'))
    lect = lectern_mask(pa)
    canvas = plate.copy()
    for s in sorted(spots, key=lambda s: s['y']):
        im, (fx, fy), st0 = figure(s)
        st = s.get('stature') or stature_at(s['y']) * s.get('h', 1.0)
        k = st * K / st0
        im = im.convert('RGBa').resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS).convert('RGBA')
        X, Y = s['x'] * K, s['y'] * K
        ox, oy = int(round(X - fx * k)), int(round(Y - fy * k))
        if not s.get('behind_lectern'):
            sw, sh = int(st * K * 0.30), max(4, int(st * K * 0.045))
            sm = Image.new('L', (sw * 2, sh * 2), 0)
            ImageDraw.Draw(sm).ellipse((sw // 2, sh // 2, sw * 3 // 2, sh * 3 // 2), fill=95)
            sm = sm.filter(ImageFilter.GaussianBlur(sh * 0.35))
            dark = Image.new('RGBA', sm.size, (40, 36, 40, 0)); dark.putalpha(sm)
            canvas.alpha_composite(dark, (int(X - sw), int(Y - sh)))
        x0, y0 = max(0, -ox), max(0, -oy)
        canvas.alpha_composite(im.crop((x0, y0, im.width, im.height)), (max(0, ox), max(0, oy)))
        if s.get('behind_lectern'):
            canvas.alpha_composite(Image.fromarray(np.dstack([pa, (lect * 255).astype(np.uint8)])))
    canvas.convert('RGB').save(out, quality=93)


if __name__ == '__main__':
    build(json.load(open(sys.argv[1])), sys.argv[2])
