"""Measure a mannequin plate against its empty room painting and write the seat spots.
usage: python3 slots.py EMPTY.jpg PLATE.png OUT.json   (green #00FF00 mannequins; white ones on old plates)
Each spot: the mannequin's visible outline box, head top and center, head width (sets the person's
size), and the smoothed line below which the room is drawn in front of the person.
Also reports how far the plate drifted from the empty painting outside the mannequins."""
import sys, json, collections, numpy as np
from PIL import Image, ImageFilter

def load(p, size=None):
    im = Image.open(p).convert('RGB')
    return im.resize(size) if size and im.size != size else im

def mannequin_mask(a, m):
    mx = m.max(2); mn = m.min(2); sat = (mx - mn) / (mx + 1)
    diff = np.abs(a - m).sum(2)
    R, G, B = m[..., 0], m[..., 1], m[..., 2]
    green = (G > 150) & (G - R > 70) & (G - B > 70) & (diff > 60)   # flat #00FF00 mannequins
    raw = green if green.sum() > 500 else (mx > 175) & (sat < 0.12) & (diff > 60)
    im = Image.fromarray((raw * 255).astype('uint8')).filter(ImageFilter.MedianFilter(5))
    return np.asarray(im) > 128

def components(mask, min_px=150):
    from scipy import ndimage
    lab, n = ndimage.label(mask)
    sizes = np.bincount(lab.ravel())
    return lab, [i for i in range(1, n + 1) if sizes[i] >= min_px]

def head_width(S, top):
    best = 0
    for i, y in enumerate(range(top, min(top + 400, S.shape[0]))):
        xs = np.where(S[y])[0]
        w = xs.max() - xs.min() + 1 if len(xs) else 0
        best = max(best, w) if i < 4 else best
        if i >= 4:
            if w > 1.6 * best and i > 8: break
            if i > 10 and w < 0.8 * best: break
            best = max(best, w)
    return int(best)

def spot(S):
    ys, xs = np.where(S); top = int(ys.min())
    l, r = int(xs.min()), int(xs.max())
    bottom = {}
    raw = np.array([np.where(S[:, x])[0].max() if S[:, x].any() else -1 for x in range(l, r + 1)], float)
    win = max(5, (r - l) // 3)
    sm = [float(np.median(raw[max(0, i - win//2): i + win//2 + 1])) for i in range(len(raw))]
    h = int(ys.max()) - top
    hw = head_width(S, top)
    return {
        'box': [l, top, r, int(ys.max())],
        'headTop': top, 'headX': round(float(xs[ys < top + 6].mean()), 1), 'headWidth': hw,
        'pose': 'stand' if h / max(1, r - l + 1) > 2.4 else 'sit',   # check covered spots by eye
        'frontLine': [round(v) for v in sm], 'frontLineX0': l,
        'pixels': int(S.sum()),
    }

if __name__ == '__main__':
    empty, plate, out = sys.argv[1:4]
    a = load(empty); m = load(plate, a.size)
    A = np.asarray(a, int); M = np.asarray(m, int)
    mask = mannequin_mask(A, M)
    from scipy import ndimage
    lab, ids = components(mask, 40)
    # join pieces of one body that furniture split apart (same columns, small vertical gap);
    # people standing side by side stay separate
    sl = ndimage.find_objects(lab); parent = {i: i for i in ids}
    def has_head(i):   # a piece whose top is much narrower than its widest row starts with its own head
        P = lab[sl[i - 1]] == i; w = P.sum(1); n = max(2, len(w) // 10)
        return np.median(w[:n]) < 0.45 * w.max()
    def find(i):
        while parent[i] != i: i = parent[i]
        return i
    for p in ids:
        for q in ids:
            if q <= p: continue
            ya, xa = sl[p - 1]; yb, xb = sl[q - 1]
            ov = min(xa.stop, xb.stop) - max(xa.start, xb.start)
            narrow = min(xa.stop - xa.start, xb.stop - xb.start)
            gap = max(ya.start, yb.start) - min(ya.stop, yb.stop)
            tall = max(ya.stop - ya.start, yb.stop - yb.start)
            lower = q if yb.start > ya.start else p
            if ov > 0.6 * narrow and gap < 0.25 * tall and not has_head(lower): parent[find(q)] = find(p)
    groups = collections.defaultdict(list)
    for i in ids: groups[find(i)].append(i)
    spots = [spot(np.isin(lab, g)) for g in groups.values()]
    spots = [s for s in spots if s['pixels'] >= 150]
    # neighbours at about the same depth (head top within a band) say what one person looks like there:
    # a much shorter piece is a stray hand or foot, a much wider one is two touching people
    def near(s):
        band = max(30, 0.15 * (s['box'][3] - s['box'][1]))
        return [o for o in spots if abs(o['headTop'] - s['headTop']) < band] or [s]
    keep = []
    for s in spots:
        n = near(s); hs = np.median([o['box'][3] - o['box'][1] for o in n]); ws = np.median([o['box'][2] - o['box'][0] for o in n])
        if len(n) > 2 and (s['box'][3] - s['box'][1]) < 0.4 * hs: continue
        s['touching'] = bool(len(n) > 2 and (s['box'][2] - s['box'][0]) > 1.8 * ws)
        keep.append(s)
    spots = keep
    spots.sort(key=lambda s: (s['headTop'], s['headX']))
    grown = np.asarray(Image.fromarray((mask*255).astype('uint8')).filter(ImageFilter.MaxFilter(15))) > 0
    outside = ~grown
    drift = float(np.abs(A - M).sum(2)[outside].mean())
    changed = float((np.abs(A - M).sum(2)[outside] > 90).mean())
    json.dump({'empty': empty, 'plate': plate, 'size': a.size, 'drift': round(drift, 1), 'changedShare': round(changed, 4), 'spots': spots}, open(out, 'w'), indent=1)
    print(f'{len(spots)} spots, drift {drift:.1f}, changed {changed:.2%}')
