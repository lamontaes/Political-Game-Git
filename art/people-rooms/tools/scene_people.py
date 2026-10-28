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

if __name__ == '__main__':
    sc = json.load(open(sys.argv[1])); out = sys.argv[2]
    S = json.load(open(sc['spots'])); room = Image.open(sc['room']).convert('RGBA').resize(tuple(S['size']), Image.LANCZOS)
    O = {o['id']: o for o in json.load(open(sc['outfits']))['outfits']}
    IDX = json.load(open(f"{sc['wardrobe']}/index.json")) if __import__('os').path.exists(f"{sc['wardrobe']}/index.json") else None
    canvas = room.copy(); W, H = room.size
    K = sc.get('earCorrection', 1.18)
    for p in sorted(sc['people'], key=lambda p: S['spots'][p['spot']]['headTop'] + S['spots'][p['spot']]['headWidth'] * 6):   # far first
        sp = S['spots'][p['spot']]
        img, (ht, hx, hw) = dressed(sc['wardrobe'], p['pose'], p['fig'], O[p['outfit']], p.get('colors', {}), p['skin'], p.get('hair'))
        flip = p.get('flip')
        if flip is None and IDX:                                 # serve a mirrored spot by flipping: the figure's facing and the spot's must point the same way
            ff = IDX['poses'][p['pose']]['facing'][p['fig'][0]]; sf = sp.get('tags', {}).get('facing', 0)
            flip = bool(ff and sf and abs(ff) < 180 and abs(sf) < 180 and (ff > 0) != (sf > 0))
        if flip: img = img.transpose(Image.FLIP_LEFT_RIGHT); hx = img.width - 1 - hx
        al = np.asarray(img)[..., 3] > 128; ys = np.where(al.any(1))[0]; fig_h = ys[-1] - ht + 1
        bx = sp['box']; covered = sp.get('tags', {}).get('coveredBy', 'none') not in ('none', None)
        standing = sp.get('pose', 'stand') != 'sit' and not covered          # a mannequin behind a stage or desk shows only part of the body
        if sp.get('tags', {}).get('coveredBy') == 'lectern' and bx[3] - bx[1] >= 6 * sp['headWidth']:
            standing = True                                      # feet show beside the lectern, so the box runs head to floor
        if standing:                                             # a standing person fills the mannequin from head to feet
            s = (bx[3] - bx[1]) / fig_h
            x0, y0 = round(sp['headX'] - hx * s), round(bx[3] - ys[-1] * s)
        else:                                                    # seated: head width, corrected for ears (the mannequin's head has none)
            s = K * sp['headWidth'] / hw
            x0, y0 = round(sp['headX'] - hx * s), round(sp['headTop'] - ht * s)
        img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0)); layer.alpha_composite(img, (max(0, x0), max(0, y0)), (max(0, -x0), max(0, -y0)))
        A = np.asarray(layer).copy()
        fl, fx0 = sp.get('frontLine'), sp.get('frontLineX0', 0)
        if fl and covered:                                       # only a desk, table, counter, chair back, railing, stage or lectern hides part of a
                                                                 # person; on open floor or on a couch their legs are in front of everything
            k = max(2, int(0.75 * sp['headWidth'])); f = np.asarray(fl)   # between the mannequin's legs its lowest point is the crotch: fill that gap
            fl = [int(f[max(0, c - k):c + k + 1].max()) for c in range(len(f))]
            rows = np.arange(H)[:, None]; lim = np.full(W, H)
            lim[fx0:fx0 + len(fl)] = fl
            xs = np.arange(W); outside = (xs < fx0) | (xs >= fx0 + len(fl))
            lim[outside] = H
            if covered and not standing:                         # behind a stage, desk or counter: its top edge runs straight across the whole person
                reach = int(max(0.4 * (bx[2] - bx[0]), 2.5 * sp['headWidth']))
                lim[max(0, fx0 - reach):min(W, fx0 + len(fl) + reach)] = int(np.median(fl))
            else:                                                # a lectern beside a standing speaker runs on a little past the mannequin's sides
                reach = int(max(0.4 * (bx[2] - bx[0]), 1.5 * sp['headWidth']))
                lim[max(0, fx0 - reach):fx0] = fl[0]; lim[fx0 + len(fl):min(W, fx0 + len(fl) + reach)] = fl[-1]
            A[..., 3] = np.where(rows > lim[None, :] + 2, 0, A[..., 3])
        canvas.alpha_composite(Image.fromarray(A))
    canvas.convert('RGB').save(out, quality=92); print(out)
