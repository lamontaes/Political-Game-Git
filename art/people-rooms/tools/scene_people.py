"""Put dressed people into a room painting at its measured spots. Each person is stacked from one pose's wardrobe parts
(body, pants, shoes, dress, shirt, tie, jacket, hair, each in its own color; see stack.py), then the whole stack is
scaled so the body's head matches the spot's head width, lined up by head top and centre, and hidden below the spot's
front line (the furniture in front). Facing: a figure that faces screen-left serves a right-facing spot flipped.
usage: python3 scene_people.py SCENE.json OUT.jpg
SCENE.json: {"spots": "<tagged spots json>", "room": "<empty painting>", "wardrobe": "<dir with <pose>/parts.json>",
  "outfits": "<outfits.json>", "people": [{"spot": i, "pose": "nat-c1", "fig": "f-medium", "outfit": "tee-jeans",
  "colors": {"shirt": rgb, ...}, "skin": rgb, "hair": [n, rgb], "flip": false}]}"""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage
from stack import person
from fit import plate_for, mannequin, fit

def head(alpha):
    """Head top, centre x and width of a body layer, from its outline: the rows above where the shoulders widen out."""
    m = alpha > 128; ys = np.where(m.any(1))[0]; top = ys[0]
    w = np.array([(np.where(r)[0][-1] - np.where(r)[0][0] + 1) if r.any() else 0 for r in m[top:top + 160]])
    skull = np.median(w[8:24]) if len(w) > 24 else w.max()
    end = next((i for i in range(24, len(w)) if w[i] > 1.6 * skull), len(w))
    i = int(np.argmax(w[:max(8, int(end * 0.85))])); r = np.where(m[top + i])[0]
    return top, (r[0] + r[-1]) / 2, w[i]

def dressed(wd, pose, fig, outfit, colors, skin, hair):
    meta = json.load(open(f'{wd}/{pose}/parts.json')); fid = f'v2-{pose}-{fig}'; info = meta['figures'][fid]
    o = {'skin': skin, 'hair': hair, 'parts': {k: [n, colors.get(k, [128, 128, 128])] for k, n in outfit['parts'].items()}}
    img, _ = person(f'{wd}/{pose}', fid, info, o)
    body = np.asarray(Image.open(f'{wd}/{pose}/{fid}/body.png'))[..., 3]
    return img, head(body)

def lap(mask):
    """Row of a seated outline's lap: the widest row in its lower 35-80%, where the thighs rest on the seat."""
    ys = np.where(mask.any(1))[0]; top, bot = ys[0], ys[-1]
    rows = range(int(top + 0.35 * (bot - top)), int(top + 0.8 * (bot - top)) + 1)
    widths = [(np.where(mask[r])[0][-1] - np.where(mask[r])[0][0]) if mask[r].any() else 0 for r in rows]
    return list(rows)[int(np.argmax(widths))]

def placement(sp, alpha, ht, hx, hw, W, H, plate, K=1.18):
    """Where a person goes on a spot: scale, top-left, how well they cover the spot's mannequin, and the row per column
    below which the room is in front of them (None on open floor)."""
    al = alpha > 128; ys = np.where(al.any(1))[0]; fig_h = ys[-1] - ht + 1
    bx = sp['box']; tags = sp.get('tags', {}); covered = tags.get('coveredBy', 'none') not in ('none', None)
    lectern = tags.get('coveredBy') == 'lectern'
    standing = sp.get('pose', 'stand') != 'sit' and not covered          # a mannequin behind a stage or desk shows only part of the body
    if lectern and bx[3] - bx[1] >= 6 * sp['headWidth']:
        standing = True                                      # feet show beside the lectern, so the box runs head to floor
    lim = None; fl, fx0 = sp.get('frontLine'), sp.get('frontLineX0', 0)
    if fl and covered:                                       # only a desk, table, counter, chair back, railing, stage or lectern hides part of a
        f = np.asarray(fl)                                   # person; on open floor or on a couch their legs are in front of everything
        if not lectern:                                      # between the mannequin's legs its lowest point is the crotch: fill that gap
            k = max(2, int(0.75 * sp['headWidth'])); f = np.array([f[max(0, c - k):c + k + 1].max() for c in range(len(f))])
        lim = np.full(W, H)
        lim[fx0:fx0 + len(f)] = f
        if not standing:                                     # behind a stage, desk or counter: its top edge runs straight across the whole person
            reach = int(max(0.4 * (bx[2] - bx[0]), 2.5 * sp['headWidth']))
            lim[max(0, fx0 - reach):min(W, fx0 + len(f) + reach)] = int(np.median(f))
        else:                                                # a lectern beside a standing speaker runs on a little past the mannequin's sides
            reach = int(max(0.4 * (bx[2] - bx[0]), 1.5 * sp['headWidth']))
            lim[max(0, fx0 - reach):fx0] = f[0]; lim[fx0 + len(f):min(W, fx0 + len(f) + reach)] = f[-1]
    feet = standing or not covered                           # feet show: standing, or sitting on a couch, chair or bed
    M = mannequin(plate, sp) if plate is not None else None
    if feet:                                               # head top to feet: the feet land on the floor where the mannequin's did
        s = (bx[3] - bx[1]) / fig_h
        x0, y0 = round(sp['headX'] - hx * s), round(bx[3] - ys[-1] * s)
    else:                                                    # behind a desk, table, counter or stage: head width, corrected for ears
        s = K * sp['headWidth'] / hw
        x0, y0 = round(sp['headX'] - hx * s), round(sp['headTop'] - ht * s)
    if M is not None:                                        # then slide the whole outline over the spot's own mannequin: the hips go where it sat
        if feet: s, x0, y0, iou = fit(alpha, s, x0, y0, M, lim, hw=sp['headWidth'], scales=(0.97, 1.0, 1.03), shift=1.2 if not standing else 0.5, shift_y=0)
        else: s, x0, y0, iou = fit(alpha, s, x0, y0, M, lim, hw=sp['headWidth'], scales=(0.92, 0.96, 1.0, 1.04, 1.08), shift=0.8, shift_y=0.15)
    else: iou = 0.0
    return s, x0, y0, iou, lim

if __name__ == '__main__':
    sc = json.load(open(sys.argv[1])); out = sys.argv[2]
    S = json.load(open(sc['spots'])); room = Image.open(sc['room']).convert('RGBA').resize(tuple(S['size']), Image.LANCZOS)
    O = {o['id']: o for o in json.load(open(sc['outfits']))['outfits']}
    IDX = json.load(open(f"{sc['wardrobe']}/index.json")) if __import__('os').path.exists(f"{sc['wardrobe']}/index.json") else None
    canvas = room.copy(); W, H = room.size
    try: PLATE = plate_for(sc['spots'], S)
    except Exception: PLATE = None
    FITS = []
    K = sc.get('earCorrection', 1.18)
    for p in sorted(sc['people'], key=lambda p: S['spots'][p['spot']]['headTop'] + S['spots'][p['spot']]['headWidth'] * 6):   # far first
        sp = S['spots'][p['spot']]
        img, (ht, hx, hw) = dressed(sc['wardrobe'], p['pose'], p['fig'], O[p['outfit']], p.get('colors', {}), p['skin'], p.get('hair'))
        flip = p.get('flip')
        if flip is None and IDX:                                 # serve a mirrored spot by flipping: the figure's facing and the spot's must point the same way
            ff = IDX['poses'][p['pose']]['facing'][p['fig'][0]]; sf = sp.get('tags', {}).get('facing', 0)
            flip = bool(ff and sf and abs(ff) < 180 and abs(sf) < 180 and (ff > 0) != (sf > 0))
        if flip: img = img.transpose(Image.FLIP_LEFT_RIGHT); hx = img.width - 1 - hx
        s, x0, y0, iou, lim = placement(sp, np.asarray(img)[..., 3], ht, hx, hw, W, H, PLATE, K); FITS.append((p['spot'], p['pose'], round(iou, 2)))
        img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0)); layer.alpha_composite(img, (max(0, x0), max(0, y0)), (max(0, -x0), max(0, -y0)))
        A = np.asarray(layer).copy()
        if lim is not None:
            rows = np.arange(H)[:, None]
            A[..., 3] = np.where(rows > lim[None, :] + 2, 0, A[..., 3])
        canvas.alpha_composite(Image.fromarray(A))
    canvas.convert('RGB').save(out, quality=92); print(out, 'fit', FITS)
