"""Room templates in the standard camera: library mannequins laid on the floor grid.

library(pose) -> {angle: RGBA cut-out} from mqlib/<pose>.png (the 8-angle sheet layout: top row
back-3/4 left, back, back-3/4 right; middle profiles; bottom row front-3/4 left, front, front-3/4 right).
template(spots) -> a 16:9 light gray canvas with a faint horizon line and the mannequins, plus the
spot list with each mannequin's pixel box (for matching the painted plate afterwards)."""
import os, json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, '..', 'mqlib')
W, H = 1376, 768
HORIZON = 0.40
ROWS = {'front': 0.92, 'middle': 0.77, 'back': 0.63, 'medium-front': 1.08, 'medium-middle': 0.95}
ANGLES = ['front', 'tq-left', 'tq-right', 'btq-left', 'btq-right']
_lib = {}


def library(pose):
    if pose in _lib:
        return _lib[pose]
    src = np.asarray(Image.open(os.path.join(LIB, pose + '.png')).convert('RGB')).astype(np.int32)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    green = (g > r + 25) & (g > b + 15)
    dark = (src.sum(-1) < 200)
    fig = ndi.binary_fill_holes(ndi.binary_closing(green | (dark & ndi.binary_dilation(green, iterations=3)), iterations=2))
    lab, n = ndi.label(fig)
    objs = [(sl, lab[sl] == i + 1) for i, sl in enumerate(ndi.find_objects(lab)) if (lab[sl] == i + 1).sum() > 2000]
    hs, ws = src.shape[:2]
    cells = {}
    for sl, m in objs:
        cy = (sl[0].start + sl[0].stop) / 2 / hs; cx = (sl[1].start + sl[1].stop) / 2 / ws
        if cy < 0.42:   # top row: backs
            key = 'btq-left' if cx < 0.36 else 'btq-right' if cx > 0.64 else 'back'
        elif cy > 0.58:  # bottom row: fronts
            key = 'tq-left' if cx < 0.36 else 'tq-right' if cx > 0.64 else 'front'
        else:
            key = 'profile-left' if cx < 0.5 else 'profile-right'
        rgba = np.zeros((sl[0].stop - sl[0].start, sl[1].stop - sl[1].start, 4), np.uint8)
        rgba[..., :3] = src[sl]; rgba[..., 3] = m * 255
        cells[key] = Image.fromarray(rgba, 'RGBA')
    ov = json.load(open(os.path.join(LIB, 'overrides.json'))) if os.path.exists(os.path.join(LIB, 'overrides.json')) else {}
    for a, b in ov.get(pose, {}).get('swap', []):
        if a in cells and b in cells:
            cells[a], cells[b] = cells[b], cells[a]
    _lib[pose] = cells
    return cells


def template(spots, out_png, out_json):
    """spots: [{pose, angle, row, x (0-1 across the frame), scale (optional)}]"""
    canvas = Image.new('RGBA', (W, H), (214, 214, 216, 255))
    d = ImageDraw.Draw(canvas)
    hy = int(HORIZON * H)
    d.line([(0, hy), (W, hy)], fill=(170, 170, 176, 255), width=2)
    placed = []
    for i, s in sorted(enumerate(spots), key=lambda t: ROWS[t[1]['row']]):
        cut = library(s['pose'])[s['angle']]
        feet = ROWS[s['row']] * H
        standing = 1.06 * (feet - hy)
        seated = s['pose'] in ('sit', 'sitdesk', 'couch')
        h = standing * (0.72 if seated else 1.0) * s.get('scale', 1.0)
        k = h / cut.height
        im = cut.resize((max(1, int(cut.width * k)), max(1, int(h))), Image.LANCZOS)
        x0, y0 = int(s['x'] * W - im.width / 2), int(feet - im.height)
        canvas.alpha_composite(im, (x0, y0))
        placed.append(dict(i=i, pose=s['pose'], angle=s['angle'], row=s['row'], box=[x0, y0, x0 + im.width, y0 + im.height]))
    canvas.convert('RGB').save(out_png)
    json.dump({'size': [W, H], 'horizon': hy, 'spots': placed}, open(out_json, 'w'), indent=1)
    return placed


STRIP = ['tq-left', 'front', 'tq-right', 'btq-left', 'btq-right']


def strip(pose, out_png, w=1376, h=768, top=40, bottom=24):
    """The five angles of one pose in a row on light gray (16:9): the layout reference for drawing a person
    in that pose. Same height for every angle, standing or seated, feet on one line."""
    cells = library(pose)
    canvas = Image.new('RGB', (w, h), (214, 214, 216))
    slot = w / len(STRIP)
    for i, a in enumerate(STRIP):
        c = cells[a]
        k = (h - top - bottom) / c.height
        im = c.resize((max(1, int(c.width * k)), max(1, int(c.height * k))), Image.LANCZOS)
        if im.width > slot * 0.96:
            s = slot * 0.96 / im.width
            im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
        canvas.paste(im, (int(slot * (i + 0.5) - im.width / 2), h - bottom - im.height), im)
    canvas.save(out_png)
    return out_png


def room_box(d, back_floor=0.58, back_top=0.06, side=0.16):
    """A gray one-point-perspective room (floor, side walls, back wall) on the standard horizon, so Firefly
    paints the room in the standard camera instead of copying the style picture's camera."""
    vx, vy = W / 2, HORIZON * H
    bl, br = W * side, W * (1 - side)
    bt, bb = back_top * H, back_floor * H
    def to_edge(x, y):  # extend the ray from the vanishing point through (x, y) to the frame edge
        dx, dy = x - vx, y - vy
        ts = [t for t in [(-vx / dx) if dx < 0 else ((W - vx) / dx) if dx > 0 else 1e9,
                          ((H - vy) / dy) if dy > 0 else (-vy / dy) if dy < 0 else 1e9] if t > 0]
        t = min(ts)
        return vx + dx * t, vy + dy * t
    fl, fr = to_edge(bl, bb), to_edge(br, bb)
    cl, cr = to_edge(bl, bt), to_edge(br, bt)
    d.polygon([(bl, bb), (br, bb), fr, (W, H), (0, H), fl], fill=(196, 186, 172, 255))           # floor
    d.polygon([(0, 0), (bl, bt), (bl, bb), fl, (0, H) if fl[0] > 0 else fl], fill=(170, 170, 176, 255))  # left wall
    d.polygon([(W, 0), (br, bt), (br, bb), fr, (W, H) if fr[0] < W else fr], fill=(170, 170, 176, 255))  # right wall
    d.polygon([(0, 0), (W, 0), (br, bt), (bl, bt)], fill=(222, 222, 226, 255))                        # ceiling
    d.rectangle([bl, bt, br, bb], fill=(205, 205, 210, 255))                                          # back wall
    for a, b in [((bl, bb), fl), ((br, bb), fr), ((bl, bt), cl), ((br, bt), cr)]:
        d.line([a, b], fill=(110, 110, 118, 255), width=2)
    d.rectangle([bl, bt, br, bb], outline=(110, 110, 118, 255), width=2)


def desk_block(d, cx, top_y, feet_y, width):
    """A plain brown desk block whose top is at the seated mannequin's waist and whose front hides the legs."""
    vx, vy = W / 2, HORIZON * H
    x0, x1 = cx - width / 2, cx + width / 2
    depth = (feet_y - top_y) * 0.25
    # top face: back edge recedes toward the vanishing point
    k = depth / max(top_y - vy, 1) if top_y > vy else 0.2
    bx0, bx1, by = x0 + (vx - x0) * k * 0.5, x1 + (vx - x1) * k * 0.5, top_y - depth * 0.6
    d.polygon([(bx0, by), (bx1, by), (x1, top_y), (x0, top_y)], fill=(150, 104, 70, 255), outline=(70, 46, 30, 255))
    d.rectangle([x0, top_y, x1, feet_y], fill=(122, 82, 54, 255), outline=(70, 46, 30, 255), width=2)


def seat_block(d, cx, feet_y, h, width, back=True):
    """A plain upholstered seat under a seated mannequin: seat top at its hips (0.35 of its seated height above
    the floor), front face just behind its feet, and a backrest behind its back for couches."""
    seat_top = feet_y - 0.35 * h
    x0, x1 = cx - width / 2, cx + width / 2
    if back:
        d.rectangle([x0 + width * 0.04, seat_top - 0.42 * h, x1 - width * 0.04, seat_top], fill=(160, 136, 110, 255), outline=(90, 74, 58, 255), width=2)
    d.polygon([(x0 + width * 0.03, seat_top - 0.07 * h), (x1 - width * 0.03, seat_top - 0.07 * h), (x1, seat_top), (x0, seat_top)],
              fill=(190, 166, 136, 255), outline=(90, 74, 58, 255))
    d.rectangle([x0, seat_top, x1, feet_y - 0.04 * h], fill=(172, 148, 120, 255), outline=(90, 74, 58, 255), width=2)


def template2(spots, out_png, out_json, box=None):
    """template() with the gray room box behind and a desk block in front of anyone at a desk (spot desk=width)."""
    canvas = Image.new('RGBA', (W, H), (214, 214, 216, 255))
    d = ImageDraw.Draw(canvas)
    room_box(d, **(box or {}))
    hy = int(HORIZON * H)
    placed = []
    for i, s in sorted(enumerate(spots), key=lambda t: ROWS[t[1]['row']]):
        cut = library(s['pose'])[s['angle']]
        feet = ROWS[s['row']] * H
        standing = 1.06 * (feet - hy)
        seated = s['pose'] in ('sit', 'sitdesk', 'couch')
        h = standing * (0.72 if seated else 1.0) * s.get('scale', 1.0)
        k = h / cut.height
        im = cut.resize((max(1, int(cut.width * k)), max(1, int(h))), Image.LANCZOS)
        x0, y0 = int(s['x'] * W - im.width / 2), int(feet - im.height)
        if s.get('seat'):
            seat_block(d, s['x'] * W, feet, h, s['seat'] * W, back=s.get('back', True))
        canvas.alpha_composite(im, (x0, y0)) if y0 + im.height <= H else canvas.paste(im, (x0, y0), im)
        if s.get('desk'):
            desk_block(d, s['x'] * W, feet - h * 0.47, feet, s['desk'] * W)
        placed.append(dict(i=i, pose=s['pose'], angle=s['angle'], row=s['row'], box=[x0, y0, x0 + im.width, y0 + im.height]))
    canvas.convert('RGB').save(out_png)
    json.dump({'size': [W, H], 'horizon': hy, 'spots': placed}, open(out_json, 'w'), indent=1)
    return placed
