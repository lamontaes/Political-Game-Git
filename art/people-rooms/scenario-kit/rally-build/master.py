"""Master color sheet: every color each person's garments and hair may take.

A part only gets colors near the lightness it was drawn at (hue changes are clean;
big lightness jumps, like dark jeans to light blue, look washed and low quality).
The allowed list per person and part goes into kit/<person>/meta.json for the picker."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from colors import to_lab
from engine import person, meta, KIT

CLOTH = {
    'black': (32, 32, 36), 'charcoal': (58, 60, 66), 'navy': (36, 50, 96), 'denim': (52, 78, 132),
    'royal blue': (46, 78, 168), 'slate': (92, 104, 120), 'forest green': (36, 86, 52), 'olive': (96, 102, 50),
    'teal': (24, 108, 116), 'maroon': (108, 30, 46), 'red': (170, 38, 36), 'rust': (150, 72, 40),
    'plum': (92, 50, 104), 'brown': (88, 60, 42), 'tan': (156, 110, 68), 'mustard': (192, 148, 42),
    'orange': (206, 104, 36), 'khaki': (176, 152, 108), 'stone': (164, 160, 150), 'heather gray': (138, 140, 148),
    'sky blue': (110, 156, 204), 'pink': (214, 138, 156), 'cream': (214, 204, 180), 'white': (232, 232, 234),
}
SHOES = {'black': (30, 30, 34), 'charcoal': (58, 60, 66), 'navy': (36, 50, 96), 'brown': (88, 60, 42),
         'tan': (156, 110, 68), 'burgundy': (98, 30, 40), 'gray': (128, 128, 132), 'cream': (214, 204, 180), 'white': (232, 232, 234)}
HAIR = {'black': (28, 26, 28), 'dark brown': (58, 38, 26), 'brown': (98, 66, 40), 'auburn': (122, 50, 28),
        'light brown': (140, 104, 70), 'strawberry': (176, 110, 70), 'blond': (190, 156, 96), 'gray': (146, 146, 150), 'white': (210, 210, 214)}
LIMIT = {'top': 16, 'trousers': 16, 'shoes': 18, 'hair': 60}
TROUSERS = {n: CLOTH[n] for n in ['black', 'charcoal', 'navy', 'denim', 'slate', 'brown', 'olive', 'forest green', 'maroon', 'khaki', 'stone', 'tan', 'heather gray', 'cream', 'sky blue']}
SOURCE = {'top': CLOTH, 'trousers': TROUSERS, 'shoes': SHOES, 'hair': HAIR}


def allowed(p, part):
    m = meta(p)['tones'][part]
    ref = m['Lmed']
    out = {}
    for n, c in SOURCE[part].items():
        L = float(to_lab(np.array(c, np.float32))[0])
        if abs(L - ref) <= LIMIT[part]:
            out[n] = c
    return out


def write_palettes():
    for p in sorted(os.listdir(KIT)):
        f = os.path.join(KIT, p, 'meta.json')
        if not os.path.exists(f):
            continue
        m = json.load(open(f))
        m['palettes'] = {part: allowed(p, part) for part in ['top', 'trousers', 'shoes', 'hair'] if part in m['tones']}
        if p.startswith('man'):
            m['palettes']['hair'] = {}   # men keep their drawn hair (a new color reaches ears and eyes)
        json.dump(m, open(f, 'w'), indent=1)
        meta.__globals__['_meta'].pop(p, None)


def sheet(p, k, out):
    F = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
    FB = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
    pal = meta(p)['palettes']
    W0, H0 = meta(p)['poses'][k]['size']
    crops = {'top': (0.12, 0.55), 'trousers': (0.5, 1.0), 'shoes': (0.82, 1.0), 'hair': (0.0, 0.22)}
    rows = []
    for part in ['hair', 'top', 'trousers', 'shoes']:
        y0, y1 = crops[part]
        tiles = []
        for name, col in pal[part].items():
            im, _, _ = person({'p': p, 'k': k, part: name}, {name: [col, col, col]})
            bg = Image.new('RGBA', im.size, (250, 248, 240, 255)); bg.alpha_composite(im)
            t = bg.convert('RGB').crop((0, int(H0 * y0), W0, int(H0 * y1)))
            t.thumbnail((240, 300))
            cell = Image.new('RGB', (250, t.height + 34), (255, 255, 255)); cell.paste(t, (5, 30))
            ImageDraw.Draw(cell).text((6, 4), name, font=F, fill=(40, 40, 44))
            tiles.append(cell)
        h = max(c.height for c in tiles)
        row = Image.new('RGB', (len(tiles) * 254 + 140, h), (255, 255, 255))
        ImageDraw.Draw(row).text((6, h // 2 - 14), part, font=FB, fill=(20, 20, 24))
        for i, c in enumerate(tiles):
            row.paste(c, (140 + i * 254, 0))
        rows.append(row)
    W = max(r.width for r in rows)
    sh = Image.new('RGB', (W, sum(r.height + 16 for r in rows) + 60), (255, 255, 255))
    ImageDraw.Draw(sh).text((10, 14), p.replace('-', ' ') + ': every color this person can wear', font=FB, fill=(20, 20, 24))
    y = 60
    for r in rows:
        sh.paste(r, (0, y)); y += r.height + 16
    sh.save(out, quality=90)


if __name__ == '__main__':
    write_palettes()
    S = sys.argv[1]
    front = {'woman-medium': 7, 'woman-slim': 7, 'woman-heavy': 7, 'man-medium': 7, 'man-slim': 7, 'man-heavy': 7}
    for p, k in front.items():
        print(p, {part: list(v) for part, v in meta(p)['palettes'].items()})
        sheet(p, k, os.path.join(S, f'master-{p}.jpg'))
