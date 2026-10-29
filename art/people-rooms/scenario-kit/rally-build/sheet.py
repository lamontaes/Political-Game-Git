"""Every pose of every person in loud test colors, beside the drawing, for an eye check."""
import sys, json
sys.path.insert(0, '.')
import numpy as np
from PIL import Image
from engine import person, meta
from render import PAL
from kit_check import drawing

def sheet(name, spec_extra, out, scale=0.5):
    cells = []
    for k in range(len(meta(name)['poses'])):
        im, _, _ = person(dict(p=name, k=k, **spec_extra), PAL)
        bg = Image.new('RGBA', im.size, (250, 248, 240, 255)); bg.alpha_composite(im)
        cells.append(np.hstack([drawing(name, k).astype(np.uint8), np.asarray(bg.convert('RGB'))]))
    h = max(c.shape[0] for c in cells)
    cells = [np.pad(c, ((h - c.shape[0], 0), (0, 16), (0, 0)), constant_values=255) for c in cells]
    half = (len(cells) + 1) // 2
    r1, r2 = np.hstack(cells[:half]), np.hstack(cells[half:])
    w = max(r1.shape[1], r2.shape[1])
    r1 = np.pad(r1, ((0, 0), (0, w - r1.shape[1]), (0, 0)), constant_values=255)
    r2 = np.pad(r2, ((0, 0), (0, w - r2.shape[1]), (0, 0)), constant_values=255)
    im = Image.fromarray(np.vstack([r1, r2]))
    im.save(out, quality=88)
    im.resize((int(im.width * scale), int(im.height * scale))).save(out.replace('.jpg', '-s.jpg'), quality=88)

if __name__ == '__main__':
    S = sys.argv[1]
    loud = dict(top='orange', trousers='sky', shoes='white', hair='h-blond')
    for n in ['woman-medium', 'woman-slim', 'woman-heavy', 'man-medium', 'man-slim', 'man-heavy']:
        sheet(n, loud, f'{S}/loud-{n}.jpg')
