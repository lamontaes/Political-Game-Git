"""Put people into a painted room at the game's own measured spots (art/people-rooms/spots/*.json).

A figure is scaled so its head matches the spot's head width, set with its head top at the
spot's head top and its head over the spot's head center; below the spot's front line the
room's furniture is laid back over it, exactly as the game draws people in rooms."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'looks'))
sys.path.insert(0, os.path.join(HERE, '..', 'build-rally'))


def head_metrics(img):
    """Head top, head center x and head width of a cut-out figure (from its own alpha)."""
    a = np.asarray(img)[..., 3] > 128
    rows = np.nonzero(a.any(1))[0]
    widths = a.sum(1)
    top = int(next(r for r in rows if widths[r] > 0.18 * widths.max()))
    # the head: the opaque run under the top, measured a little above the chin
    span = rows.max() - top
    best = None
    for frac in (0.045, 0.05, 0.055):
        r = int(top + frac * span)
        xs = np.nonzero(a[r])[0]
        if not len(xs):
            continue
        runs = np.split(xs, np.nonzero(np.diff(xs) > 2)[0] + 1)
        top_xs = np.nonzero(a[top:top + 6].any(0))[0]
        cx = top_xs.mean() if len(top_xs) else xs.mean()
        run = min(runs, key=lambda r_: abs(r_.mean() - cx))
        w = run.max() - run.min()
        best = (top, float(run.mean()), float(w)) if best is None or w > best[2] else best
    return best


def place(canvas, room, fig, spot, head_scale=1.0):
    top, cx, w = head_metrics(fig)
    s = spot['headWidth'] * head_scale / max(w, 1)
    im = fig.convert('RGBa').resize((max(1, int(fig.width * s)), max(1, int(fig.height * s))), Image.LANCZOS).convert('RGBA')
    ox, oy = int(round(spot['headX'] - cx * s)), int(round(spot['headTop'] - top * s))
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    x0, y0 = max(0, -ox), max(0, -oy)
    layer.alpha_composite(im.crop((x0, y0, im.width, im.height)), (max(0, ox), max(0, oy)))
    L = np.asarray(layer).copy()
    # furniture in front: below the measured front line, inside the spot's columns, the room wins
    fl = spot.get('frontLine')
    if fl and spot['tags'].get('coveredBy', 'none') != 'none':
        X0 = spot['frontLineX0']
        H = L.shape[0]
        yy = np.arange(H)[:, None]
        cols = np.arange(X0, min(X0 + len(fl), L.shape[1]))
        lim = np.array(fl[:len(cols)])[None, :]
        cut = yy > lim
        L[:, cols, 3] = np.where(cut, 0, L[:, cols, 3])
    canvas.alpha_composite(Image.fromarray(L))


def build(room_path, spots_path, cast, out, scale_room=None):
    room = Image.open(room_path).convert('RGBA')
    spots = json.load(open(spots_path))
    size = spots.get('size')
    if size and tuple(size) != room.size:
        room = room.resize(tuple(size), Image.LANCZOS)
    canvas = room.copy()
    sp = spots['spots']
    for idx, fig, hs in sorted(cast, key=lambda c: sp[c[0]]['headTop']):
        place(canvas, room, fig, sp[idx], hs)
    canvas.convert('RGB').save(out, quality=93)
    return canvas
