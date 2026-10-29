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


V4 = os.path.join(HERE, 'v4')


def figure(fid, man):
    root = PACK
    if fid.startswith('v4:'):   # people drawn on the library poses
        fid, root = fid[3:], V4
        man = json.load(open(os.path.join(V4, 'manifest.json')))
    f = next(x for x in man['figures'] if x['id'] == fid)
    if f['kind'] == 'look':
        img = Image.open(os.path.join(root, f['file'])).convert('RGBA')
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


def desk(canvas, d, head_top_y, hands_y, center_x, desk_edge_y, on_desk=None, front=False):
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
    xs = np.nonzero(np.asarray(d['img'])[ht:ht + 8, :, 3].any(0))[0]
    cx = xs.mean() if len(xs) else a.shape[1] / 2
    ox, oy = int(round(center_x - cx * s)), int(round(head_top_y - ht * s))
    if on_desk is not None:
        # the forearms and hands lying on the desk, from the mannequin: map its mask into the figure's pixels
        mask, (mx, my) = on_desk
        m = np.zeros(skin.shape, bool)
        yy, xx = np.nonzero(np.asarray(mask) > 128)
        sy = np.clip(((yy + my - oy) / s).round().astype(int), 0, skin.shape[0] - 1)
        sx = np.clip(((xx + mx - ox) / s).round().astype(int), 0, skin.shape[1] - 1)
        m[sy, sx] = True
        m = ndi.binary_dilation(ndi.binary_closing(m, iterations=2), iterations=max(2, int(4 / s)))
        # within the mannequin's forearms, only what reaches back from the hands (cuff and lower sleeve),
        # never the jacket or tie between two hands
        reach = ndi.binary_dilation(skin, iterations=max(3, int(0.35 * (skin.any(0).sum() ** 0.5))))
        side = np.zeros_like(skin)
        lab, n = ndi.label(ndi.binary_dilation(skin & below, iterations=2))
        for sl in ndi.find_objects(lab):   # forearms come in from the outer side of each hand
            cxh = (sl[1].start + sl[1].stop) / 2
            if cxh < cx:
                side[sl[0].start - 40:sl[0].stop, :sl[1].stop] = True
            else:
                side[sl[0].start - 40:sl[0].stop, sl[1].start:] = True
        keep = keep | (m & reach & side)
    if front:
        # seen straight on, forearms on a desk point at the camera: below the desk's back edge only the hands
        # show, plus the stretch of sleeve right above each hand (never the jacket or tie between two hands)
        keep = skin.copy()
        lab, n = ndi.label(ndi.binary_closing(skin & below, iterations=2))
        for j, sl in enumerate(ndi.find_objects(lab)):
            if (lab[sl] == j + 1).sum() < 40:
                continue
            band = np.zeros_like(skin)
            band[edge_src:sl[0].start + 6, sl[1].start + 2:sl[1].stop - 2] = True
            keep |= band
        keep = ndi.binary_dilation(keep, iterations=1)
    a[below & ~keep, 3] = 0
    a[hl + int(8 / s):] = 0
    im = Image.fromarray(a).convert('RGBa').resize((max(1, int(a.shape[1] * s)), max(1, int(a.shape[0] * s))), Image.LANCZOS).convert('RGBA')
    canvas.alpha_composite(im, (ox, oy))


def place(canvas, spot, f, d, fronts):
    if 'deskEdge' in spot and f.get('deskTop'):
        # drawn behind a table: its back edge goes on the room desk's back edge, arms and hands as drawn
        s = (spot['deskEdge'] - spot['head']['top']) / max(f['deskTop'] - d['head_top'], 1)
        im = d['img'].convert('RGBa').resize((max(1, int(d['img'].width * s)), max(1, int(d['img'].height * s))), Image.LANCZOS).convert('RGBA')
        ox = int(round(spot['head']['x'] - f['head']['x'] * s)); oy = int(round(spot['head']['top'] - d['head_top'] * s))
        layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        layer.alpha_composite(im.crop((max(0, -ox), max(0, -oy), im.width, im.height)), (max(0, ox), max(0, oy)))
        canvas.alpha_composite(layer)
        return
    if 'deskEdge' in spot:
        od = None
        if spot.get('onDesk'):
            od = (Image.open(os.path.join(HERE, 'plates', spot['onDesk'])).convert('L'), tuple(spot['box'][:2]))
        desk(canvas, d, spot['head']['top'], spot['hands'], spot['head']['x'], spot['deskEdge'], od, front=f.get('facing', 0) == 0)
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
