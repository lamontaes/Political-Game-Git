"""Preview a standard room shot with pack figures placed on its spots, the way the game fits them:
at a desk, head top and hands rows matched (only hands show below the desk edge); elsewhere head top to
feet matched, head centered on the spot's head x, furniture in front drawn back through the front mask.

python3 preview.py <shot> <out.jpg> <figure id for spot 0> [<figure id for spot 1> ...]"""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'intro'))
from frames import hands_line  # noqa: E402
from colors import to_lab  # noqa: E402

PACK = os.path.join(HERE, '..', 'pack', 'v3')


def figure(fid, man):
    f = next(x for x in man['figures'] if x['id'] == fid)
    if f['kind'] == 'look':
        img = Image.open(os.path.join(PACK, f['file'])).convert('RGBA')
    else:   # a kit figure in its drawn colors: stack its parts
        img = None
        for part in ['body', 'shoes', 'trousers', 'top', 'hair', 'phone']:
            if part in f['parts']:
                p = Image.open(os.path.join(PACK, f['parts'][part]['file'])).convert('RGBA')
                img = p if img is None else Image.alpha_composite(img, p)
    return f, {'img': defringe(img), 'head_top': f['head']['top'], 'feet': f['feet']['y'], 'stature': f['stature']}


def defringe(img, sheet=(214, 214, 216), reach=2):
    """Drop the light gray rim the drawing sheet leaves on a figure's edge (invisible on a light wall, a white
    halo on a dark desk): edge pixels close to the sheet's gray, or lighter than the drawn line next to them."""
    a = np.asarray(img).copy()
    alpha = a[..., 3] > 0
    edge = alpha & ndi.binary_dilation(~alpha, iterations=reach)
    rgb = a[..., :3].astype(np.int32)
    grayish = (np.abs(rgb - np.array(sheet)).max(-1) < 30) | ((rgb.min(-1) > 170) & (np.ptp(rgb, -1) < 25))
    a[edge & grayish, 3] = 0
    return Image.fromarray(a)


def desk(canvas, d, head_top_y, hands_y, center_x, desk_edge_y):
    """Seat a figure behind a desk: head top and hands on the spot's rows; below the desk's back edge only
    the hands and their own drawn outline show (no cuff or sleeve slivers floating beside them)."""
    ht, hl = d['head_top'], hands_line(d)
    s = (hands_y - head_top_y) / max(hl - ht, 1)
    a = np.asarray(d['img']).copy()
    lab = to_lab(a[..., :3])
    skin = (a[..., 3] > 200) & (lab[..., 1] > 8) & (lab[..., 2] > 10) & (lab[..., 0] > 35) & (lab[..., 0] < 85)
    skin = ndi.binary_opening(skin, iterations=1)
    line = (lab[..., 0] < 30) & (a[..., 3] > 0)
    keep = ndi.binary_fill_holes(skin | (line & ndi.binary_dilation(skin, iterations=2)))
    edge_src = int(round(ht + (desk_edge_y - head_top_y) / s))
    below = np.zeros(skin.shape, bool); below[edge_src:] = True
    a[below & ~keep, 3] = 0
    a[hl + int(8 / s):] = 0
    im = Image.fromarray(a).convert('RGBa').resize((max(1, int(a.shape[1] * s)), max(1, int(a.shape[0] * s))), Image.LANCZOS).convert('RGBA')
    xs = np.nonzero(np.asarray(d['img'])[ht:ht + 8, :, 3].any(0))[0]
    cx = xs.mean() if len(xs) else a.shape[1] / 2
    canvas.alpha_composite(im, (int(round(center_x - cx * s)), int(round(head_top_y - ht * s))))


def place(canvas, spot, f, d, fronts):
    if 'deskEdge' in spot:
        desk(canvas, d, spot['head']['top'], spot['hands'], spot['head']['x'], spot['deskEdge'])
        return
    s = (spot['feet'] - spot['head']['top']) / max(d['feet'] - d['head_top'], 1)
    im = d['img'].convert('RGBa').resize((max(1, int(d['img'].width * s)), max(1, int(d['img'].height * s))), Image.LANCZOS).convert('RGBA')
    ox = int(round(spot['head']['x'] - f['head']['x'] * s)); oy = int(round(spot['head']['top'] - d['head_top'] * s))
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layer.alpha_composite(im.crop((max(0, -ox), max(0, -oy), im.width, im.height)), (max(0, ox), max(0, oy)))
    canvas.alpha_composite(layer)
    if spot.get('front'):
        x0, y0, x1, y1 = spot['box']
        m = Image.open(os.path.join(HERE, 'plates', spot['front'])).convert('L')
        fronts.append((m, (x0, y0)))


def preview(shot, out, fids):
    meta = json.load(open(os.path.join(HERE, 'plates', shot + '.mannequins.json')))
    man = json.load(open(os.path.join(PACK, 'manifest.json')))
    empty = Image.open(os.path.join(HERE, 'plates', meta['backdrop'])).convert('RGBA')
    canvas = empty.copy()
    fronts = []
    order = sorted(range(len(meta['spots'])), key=lambda i: meta['spots'][i].get('feet', meta['spots'][i].get('hands', 0)))
    for i in order:
        if i < len(fids) and fids[i]:
            f, d = figure(fids[i], man)
            place(canvas, meta['spots'][i], f, d, fronts)
    for m, xy in fronts:   # the room in front of a person goes back over them
        canvas.paste(empty.crop((xy[0], xy[1], xy[0] + m.width, xy[1] + m.height)), xy, m)
    canvas.convert('RGB').save(out, quality=93)
    return out


if __name__ == '__main__':
    print(preview(sys.argv[1], sys.argv[2], sys.argv[3:]))
