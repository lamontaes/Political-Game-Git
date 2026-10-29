"""Intro frames assembled from whole drawn figures (lifted off their sheets, nothing recolored)."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'looks'))
sys.path.insert(0, os.path.join(HERE, '..', 'build-rally'))
from lift import lift
from colors import to_lab

FORMAL = os.path.join(HERE, '..', 'formal')
_cache = {}


def fig(sheet, k, folder=FORMAL):
    key = (folder, sheet)
    if key not in _cache:
        # the heavy woman's front rally row was drawn with six people
        _cache[key] = lift(os.path.join(folder, sheet + '.png'), count=6 if sheet == 'woman-heavy-rr1' else 5)
    return _cache[key][k]


def hands_line(f):
    """Lowest row of skin in the upper body (the forearms and hands resting on a desk)."""
    a = np.asarray(f['img'])
    lab = to_lab(a[..., :3])
    skin = (a[..., 3] > 200) & (lab[..., 1] > 8) & (lab[..., 2] > 10) & (lab[..., 0] > 35) & (lab[..., 0] < 85)
    h = a.shape[0]
    top = f['head_top']
    face_bottom = top + int(0.11 * (f['feet'] - top))
    rows = np.nonzero(skin[face_bottom + 10:int(top + 0.6 * (f['feet'] - top))].any(1))[0]
    return int(rows.max() + face_bottom + 10) if len(rows) else int(top + 0.4 * (f['feet'] - top))


def at_desk(canvas, f, head_top_y, hands_y, center_x, desk_edge_y):
    """Seat a figure behind a desk: head top and hands land on the given rows. Below the desk's
    back edge only the hands and cuffs show (they rest on the desk); the body is behind it."""
    ht, hl = f['head_top'], hands_line(f)
    s = (hands_y - head_top_y) / max(hl - ht, 1)
    a = np.asarray(f['img']).copy()
    lab = to_lab(a[..., :3])
    skin = (a[..., 3] > 200) & (lab[..., 1] > 8) & (lab[..., 2] > 10) & (lab[..., 0] > 35) & (lab[..., 0] < 85)
    from scipy import ndimage as ndi
    keep = ndi.binary_dilation(skin, iterations=3)
    edge_src = int(round(ht + (desk_edge_y - head_top_y) / s))
    below = np.zeros(skin.shape, bool); below[edge_src:] = True
    a[below & ~keep, 3] = 0
    a[hl + int(8 / s):] = 0
    im = Image.fromarray(a, 'RGBA')
    im = im.convert('RGBa').resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS).convert('RGBA')
    xs = np.nonzero(np.asarray(f['img'])[ht:ht + 8, :, 3].any(0))[0]
    cx = xs.mean() if len(xs) else f['img'].width / 2
    canvas.alpha_composite(im, (int(round(center_x - cx * s)), int(round(head_top_y - ht * s))))


def standing(canvas, f, x, feet_y, stature, shadow=True, clip_below=None):
    s = stature / f['stature']
    im = f['img'].convert('RGBa').resize((max(1, int(f['img'].width * s)), max(1, int(f['img'].height * s))), Image.LANCZOS).convert('RGBA')
    ox, oy = int(round(x - f['foot_cx'] * s)), int(round(feet_y - f['feet'] * s))
    if shadow:
        sw, sh = int(stature * 0.30), max(4, int(stature * 0.045))
        sm = Image.new('L', (sw * 2, sh * 2), 0)
        ImageDraw.Draw(sm).ellipse((sw // 2, sh // 2, sw * 3 // 2, sh * 3 // 2), fill=95)
        sm = sm.filter(ImageFilter.GaussianBlur(sh * 0.35))
        dark = Image.new('RGBA', sm.size, (40, 36, 40, 0)); dark.putalpha(sm)
        canvas.alpha_composite(dark, (int(x - sw), int(feet_y - sh)))
    x0, y0 = max(0, -ox), max(0, -oy)
    canvas.alpha_composite(im.crop((x0, y0, im.width, im.height)), (max(0, ox), max(0, oy)))


CASUAL = os.path.join(HERE, '..', 'casual')


def place_spot(canvas, f, spot):
    """Put a whole figure at one of the game's measured spots: its head top and head center on the
    spot's, its height (head top to feet) matched to the spot's box; furniture in front stays in front."""
    ht = f['head_top']
    s = (spot['box'][3] - spot['headTop']) / max(f['feet'] - ht, 1)
    im = f['img'].convert('RGBa').resize((max(1, int(f['img'].width * s)), max(1, int(f['img'].height * s))), Image.LANCZOS).convert('RGBA')
    a0 = np.asarray(f['img'])[..., 3] > 128
    xs = np.nonzero(a0[ht:ht + max(4, int(0.04 * f['stature']))].any(0))[0]
    cx = xs.mean() if len(xs) else f['img'].width / 2
    ox, oy = int(round(spot['headX'] - cx * s)), int(round(spot['headTop'] - ht * s))
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    x0, y0 = max(0, -ox), max(0, -oy)
    layer.alpha_composite(im.crop((x0, y0, im.width, im.height)), (max(0, ox), max(0, oy)))
    L = np.asarray(layer).copy()
    fl = spot.get('frontLine')
    if fl and spot['tags'].get('coveredBy', 'none') != 'none':
        X0 = spot['frontLineX0']
        cols = np.arange(X0, min(X0 + len(fl), L.shape[1]))
        lim = np.array(fl[:len(cols)])[None, :]
        cut = np.arange(L.shape[0])[:, None] > lim
        L[:, cols, 3] = np.where(cut, 0, L[:, cols, 3])
    canvas.alpha_composite(Image.fromarray(L))


def room_light(canvas_before, f_img, box):
    """Light a figure like the room around it (a dim warm living room at night is not daylight)."""
    a = np.asarray(canvas_before.convert('RGB')).astype(np.float32)
    x0, y0, x1, y1 = [int(v) for v in box]
    H, W = a.shape[:2]
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    m = a[y0:y1, x0:x1].reshape(-1, 3).mean(0)
    L = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255
    tint = m / max(m.max(), 1)
    k = np.clip(L / 0.6, 0.55, 1.0)
    fac = 0.45 + 0.55 * tint * k
    im = np.asarray(f_img).astype(np.float32).copy()
    im[..., :3] = np.clip(im[..., :3] * fac, 0, 255)
    return Image.fromarray(im.astype(np.uint8), 'RGBA')
