"""People pack v4 (proof): people drawn on the library poses. Each Firefly sheet is one person in one outfit
and hairstyle drawn over a pose strip (five angles in a row: tq-left, front, tq-right, btq-left, btq-right).

python3 v4.py <sheet.png> <person> <pose> <outfit-slug> "<outfit words>" "<hair words>" [dress]
cuts the five figures, saves v4/people/<person>/<outfit>/<pose>/<angle>.png and adds them to v4/manifest.json."""
import os, sys, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'looks'))
sys.path.insert(0, os.path.join(HERE, '..', 'pack'))
from lift import lift  # noqa: E402
from build_pack import metrics  # noqa: E402
import template as T  # noqa: E402

OUT = os.path.join(HERE, 'v4')
FACING = {'front': 0, 'tq-left': -45, 'tq-right': 45, 'btq-left': -135, 'btq-right': 135}
SEAT = {'sitdesk': 'desk-chair', 'sit': 'chair', 'couch': 'couch'}


def clear_pockets(img, bg, tol=20):
    """Sheet gray trapped between an arm and the body (or between legs) belongs to the background: clear
    enclosed pieces close to the sheet's gray. A white shirt is brighter than the sheet and stays."""
    import numpy as np
    from scipy import ndimage as ndi
    a = np.asarray(img).copy()
    rgb = a[..., :3].astype(np.int32)
    g = (a[..., 3] > 0) & (np.abs(rgb - np.asarray(bg)).max(-1) < tol) & ((rgb.max(-1) - rgb.min(-1)) < 14)
    lab, n = ndi.label(g)
    for k, sl in enumerate(ndi.find_objects(lab)):
        piece = lab[sl] == k + 1
        # the whole piece must average the sheet's gray (a shaded white shirt averages brighter)
        if piece.sum() >= 25 and np.abs(rgb[sl][piece].mean(0) - np.asarray(bg)).max() < 5:
            a[sl][piece, 3] = 0
    return Image.fromarray(a)


def sheet_bg(sheet):
    import numpy as np
    src = np.asarray(Image.open(sheet).convert('RGB')).astype(np.int32)
    return np.median(np.concatenate([src[:6].reshape(-1, 3), src[:, :6].reshape(-1, 3), src[:, -6:].reshape(-1, 3)]), 0)


def add(sheet, person, pose, outfit, outfit_words, hair_words, dress='formal'):
    figs = lift(sheet, count=5)
    if len(figs) != 5:
        raise SystemExit(f'{sheet}: found {len(figs)} figures, not 5')
    path = os.path.join(OUT, 'manifest.json')
    man = json.load(open(path)) if os.path.exists(path) else {'pack': 'v4-proof', 'figures': []}
    man['figures'] = [f for f in man['figures'] if not (f['person'] == person and f['outfit'] == outfit and f['pose'] == pose)]
    for angle, f in zip(T.STRIP, figs):   # lift returns figures left to right
        fid = f'{person}/{outfit}/{pose}/{angle}'
        os.makedirs(os.path.join(OUT, 'people', os.path.dirname(fid)), exist_ok=True)
        f['img'] = clear_pockets(f['img'], sheet_bg(sheet))
        f['img'].save(os.path.join(OUT, 'people', fid + '.png'))
        man['figures'].append({'id': fid, 'person': person, 'kind': 'look', 'pose': pose, 'angle': angle, 'facing': FACING[angle],
                               'seat': SEAT.get(pose, 'none'), 'dress': dress, 'outfit': outfit, 'outfitLabel': outfit_words,
                               'hair': hair_words, 'file': f'people/{fid}.png', 'sheet': os.path.basename(sheet), **metrics(f['img'])})
    json.dump(man, open(path, 'w'), indent=1)
    return [f['id'] for f in man['figures'] if f['person'] == person and f['outfit'] == outfit and f['pose'] == pose]



def add_desk(sheet, person, outfit, outfit_words, hair_words, dress='formal'):
    """A desk sheet: the person five times behind a flat gray table (address poses, seen straight on). The table
    is keyed out; each figure keeps `deskTop`, the row of the table's back edge in its own pixels, so the fitter
    puts that row on the room desk's back edge and the forearms land on the desk the way they were drawn."""
    import numpy as np, tempfile
    from scipy import ndimage as ndi
    src = np.asarray(Image.open(sheet).convert('RGB')).astype(np.int32)
    H, W = src.shape[:2]
    bg = np.median(np.concatenate([src[:6].reshape(-1, 3), src[:, :6].reshape(-1, 3), src[:, -6:].reshape(-1, 3)]), 0)
    low = src[int(H * 0.55):].reshape(-1, 3)
    sat = low.max(1) - low.min(1)
    cand = low[(sat < 14) & (np.abs(low - bg).sum(1) > 40)]
    vals, counts = np.unique((cand // 4) * 4, axis=0, return_counts=True)
    table_c = vals[np.argmax(counts)] + 2
    lowsat = (src.max(-1) - src.min(-1)) < 16
    front = ndi.binary_opening((np.abs(src - table_c).max(-1) < 14) & lowsat, iterations=2)
    lab, n = ndi.label(front)
    big = [i + 1 for i, sl in enumerate(ndi.find_objects(lab)) if (lab[sl] == i + 1).sum() > 0.01 * H * W]
    front = np.isin(lab, big)
    # each table is a box: its front face plus the top surface above it. Inside the box only the person stays
    # (hands, sleeves in the suit's own color, cuffs, and their outlines); everything else is table.
    sys.path.insert(0, os.path.join(HERE, '..', 'build-rally'))
    from colors import to_lab
    lab_img = to_lab(src.astype(np.uint8))
    skin = (lab_img[..., 1] > 6) & (lab_img[..., 2] > 8) & (lab_img[..., 0] > 28) & (lab_img[..., 0] < 93)
    tab = np.zeros((H, W), bool)
    labf, nf = ndi.label(front)
    for sl in ndi.find_objects(labf):
        x0, x1, ft = sl[1].start, sl[1].stop, sl[0].start
        # top surface: rows above the face that are still mostly non-background, non-skin
        top = ft
        for y in range(ft - 1, max(0, ft - 80), -1):
            row = src[y, x0:x1]
            other = (np.abs(row - bg).max(-1) > 18) & ~skin[y, x0:x1]
            gray = ((row.max(-1) - row.min(-1)) < 18) & (np.abs(row - bg).max(-1) > 18)
            if gray.mean() < 0.25:
                break
            top = y
        box = np.zeros((H, W), bool); box[top:, max(0, x0 - 3):min(W, x1 + 3)] = True
        # the suit's color: the torso just above the table
        torso = src[max(0, top - 60):top - 5, x0 + (x1 - x0) // 4:x1 - (x1 - x0) // 4].reshape(-1, 3)
        tl = to_lab(torso[None].astype(np.uint8))[0]
        cloth = torso[(tl[:, 0] > 15) & (tl[:, 0] < 80) & ~((tl[:, 1] > 8) & (tl[:, 2] > 10))]
        suit = np.median(cloth, 0) if len(cloth) else np.array([60, 60, 90])
        sleeve = np.abs(src - suit).max(-1) < 34
        cuff = (src.min(-1) > 200) & ndi.binary_dilation(skin, iterations=6)
        pm = ndi.binary_closing(skin | sleeve | cuff, iterations=1)   # never opened: that shaves fingertips
        lab2, n2 = ndi.label(pm & box)
        # keep only pieces that touch the body above the table (arms come in from above, hands rest on them)
        above = pm.copy(); above[top:] = False
        keep_ids = [k + 1 for k in range(n2) if (ndi.binary_dilation(lab2 == k + 1, iterations=3) & ndi.binary_dilation(above, iterations=2)).any()
                    or ((lab2 == k + 1) & skin).sum() > 30]
        kept = np.isin(lab2, keep_ids)
        # with their own drawn outlines: the dark line around fingers and sleeves, up to 4 px out
        person_in = ndi.binary_dilation(kept, iterations=1) | (ndi.binary_dilation(kept, iterations=4) & (src.max(-1) < 110))
        tab |= box & ~person_in
    keyed = src.copy(); keyed[ndi.binary_dilation(tab, iterations=1)] = bg
    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False).name
    Image.fromarray(keyed.astype(np.uint8)).save(tmp)
    figs = lift(tmp, count=5)
    path = os.path.join(OUT, 'manifest.json')
    man = json.load(open(path)) if os.path.exists(path) else {'pack': 'v4-proof', 'figures': []}
    man['figures'] = [f for f in man['figures'] if not (f['person'] == person and f['outfit'] == outfit and f['pose'] == 'address')]
    out = []
    for k, f in enumerate(figs):
        img = clear_pockets(f['img'], bg)
        a = np.asarray(img).copy()
        labc, nc = ndi.label(a[..., 3] > 0)
        if nc > 1:   # loose bits of table left at the corners: keep the person (the biggest piece) only
            sizes = ndi.sum(a[..., 3] > 0, labc, range(1, nc + 1))
            a[(labc != int(np.argmax(sizes)) + 1), 3] = 0
            img = Image.fromarray(a)
        m = metrics(img)
        # find this figure's place on the sheet to read the table's back edge under it
        ox, oy = f['box'][0], f['box'][1]
        cols = slice(int(ox + m['head']['x'] - m['head']['width']), int(ox + m['head']['x'] + m['head']['width']))
        rows = np.nonzero(tab[:, cols].any(1))[0]
        desk_top = int(rows.min() - oy) if len(rows) else None
        fid = f'{person}/{outfit}/address/a{k:02d}'
        os.makedirs(os.path.join(OUT, 'people', os.path.dirname(fid)), exist_ok=True)
        img.save(os.path.join(OUT, 'people', fid + '.png'))
        man['figures'].append({'id': fid, 'person': person, 'kind': 'look', 'pose': 'address', 'angle': 'front', 'facing': 0,
                               'seat': 'desk-chair', 'dress': dress, 'outfit': outfit, 'outfitLabel': outfit_words, 'hair': hair_words,
                               'file': f'people/{fid}.png', 'sheet': os.path.basename(sheet), 'deskTop': desk_top, **m})
        out.append((fid, desk_top))
    json.dump(man, open(path, 'w'), indent=1)
    os.unlink(tmp)
    return out


if __name__ == '__main__':
    if sys.argv[1] == 'desk':
        print(add_desk(*sys.argv[2:]))
    else:
        print(add(*sys.argv[1:]))
