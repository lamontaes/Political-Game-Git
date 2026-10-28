"""Owner's blob plates (Oct 28): for every seated or covered spot, the biggest body of the pose that sits there (heavy woman
and heavy man, fitted to the spot's mannequin) painted as one flat green blob on the empty room. Firefly then redraws
whatever is in front of a seated person (a couch edge, an armrest, a table) over the blob; what stays green is exactly
where a person shows, and every build of that pose fits inside it.
usage: python3 blob_guides.py CAST.json OUT.png"""
import sys, json, numpy as np
from PIL import Image
from scene_people import placement, head
from fit import plate_for

WD = 'art/wardrobe'

def outline(pose, fid):
    d = f'{WD}/{pose}/{fid}'; a = None
    for part in ('body', 'shirt-1', 'pants-1', 'shoes-1'):
        x = np.asarray(Image.open(f'{d}/{part}.png'))[..., 3]; a = x if a is None else np.maximum(a, x)
    return a, np.asarray(Image.open(f'{d}/body.png'))[..., 3]

if __name__ == '__main__':
    C = json.load(open(sys.argv[1])); S = json.load(open(C['spots'])); W, H = S['size']
    IDX = json.load(open(f'{WD}/index.json'))['poses']
    room = np.asarray(Image.open(C['room']).convert('RGB').resize((W, H), Image.LANCZOS)).copy()
    plate = plate_for(C['spots'], S); blob = np.zeros((H, W), bool); n = 0
    for p in C['people']:
        sp = S['spots'][p['spot']]; t = sp.get('tags', {})
        if not (t.get('pose', sp.get('pose')) == 'sit' or t.get('coveredBy') not in (None, 'none')): continue
        for sex in 'fm':
            a, b = outline(p['pose'], f"v2-{p['pose']}-{sex}-heavy"); ht, hx, hw = head(b)
            ff = IDX[p['pose']]['facing'][sex]; sf = t.get('facing', 0)
            flip = p.get('flip') if p.get('flip') is not None else bool(ff and sf and abs(ff) < 180 and abs(sf) < 180 and (ff > 0) != (sf > 0))
            if flip: a = a[:, ::-1]; hx = a.shape[1] - 1 - hx
            s, x0, y0, iou, lim = placement(sp, a, ht, hx, hw, W, H, plate)
            A = np.asarray(Image.fromarray(a).resize((max(1, round(a.shape[1] * s)), max(1, round(a.shape[0] * s))))) > 128
            ys, xs = np.where(A); ys = ys + y0; xs = xs + x0; ok = (ys >= 0) & (ys < H) & (xs >= 0) & (xs < W)
            blob[ys[ok], xs[ok]] = True
        n += 1
    room[blob] = (0, 255, 0)
    Image.fromarray(room).save(sys.argv[2]); print(sys.argv[2], n, 'seats', int(blob.sum()), 'px')
