"""Spot data for a standard room shot: plates/<shot>.plate.png (painted with green mannequins) and
plates/<shot>.empty.png (the same picture with them removed) -> plates/<shot>.mannequins.json.

Each mannequin found in the plate is matched to its template spot (templates/<template>.json) by position,
so its pose and angle are the library's. Same fields as art/people-rooms/mannequin-plates (pose, seat, facing,
head, box, feet or hands + deskEdge, front) plus angle, packPoses (the v3 pack poses that fit until pack v4
draws people on the library poses) and pictures (frames the game fills with the room owner's family).

python3 export.py <shot> <template> [frame boxes as x0,y0,x1,y1 ...]"""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'intro'))
from mannequins import green_mask, front_pieces, with_outline  # noqa: E402

FACING = {'front': 0, 'tq-left': -45, 'tq-right': 45, 'btq-left': -135, 'btq-right': 135}
SEAT = {'sitdesk': 'desk-chair', 'sit': 'chair', 'couch': 'couch'}
PACK = {'stand': ['pockets', 'hip', 'speak'], 'talk': ['speak'], 'fold': ['fold'], 'clap': ['clap'], 'walk': ['walk'],
        'lectern': ['lectern'], 'sit': ['talk', 'listen'], 'sitdesk': ['address', 'write'], 'couch': ['watch', 'talk', 'listen']}


def desk_back_edge(empty, spot, hands):
    g = np.asarray(empty.convert('L')).astype(float)
    gy = np.abs(ndi.sobel(ndi.gaussian_filter(g, 1.0), 0))
    x0, _, x1, _ = spot['box']; cx = int(spot['head']['x']); half = (x1 - x0) // 2
    lo = spot['head']['top'] + int(0.45 * (hands - spot['head']['top']))
    prof = gy[lo:hands - 1, max(0, cx - half):cx + half].mean(1)
    return int(lo + int(np.argmax(prof)))


def desk_width(empty, spot):
    """Length of the desk's front edge in pixels: the dark drawn line of the desk top's front edge (the strongest
    level edge just below the back edge), followed left and right from the spot's center. A seated adult's head
    sits about 0.3 of a big desk's length above its top."""
    g = np.asarray(empty.convert('L')).astype(float)
    gy = np.abs(ndi.sobel(ndi.gaussian_filter(g, 0.8), 0))
    cx = int(spot['head']['x']); half = max(10, (spot['box'][2] - spot['box'][0]) // 2)
    lo = spot['deskEdge'] + 4
    hi = spot['deskEdge'] + int(0.4 * (spot['hands'] - spot['head']['top'])) + 8
    prof = gy[lo:hi, cx - half:cx + half].mean(1)
    y = lo + int(np.argmax(prof))
    dark = (g[y - 2:y + 3] < 75).any(0)
    dark = ndi.binary_closing(dark, iterations=3)
    if not dark[cx]:
        return 0
    l = cx
    while l > 0 and dark[l - 1]:
        l -= 1
    r = cx
    while r < len(dark) - 1 and dark[r + 1]:
        r += 1
    return int(r - l + 1)


def export(shot, template, frames=()):
    plate = Image.open(os.path.join(HERE, 'plates', shot + '.plate.png')).convert('RGB')
    empty = Image.open(os.path.join(HERE, 'plates', shot + '.empty.png')).convert('RGB')
    tpl = json.load(open(os.path.join(HERE, 'templates', template + '.json')))
    sx, sy = plate.width / tpl['size'][0], plate.height / tpl['size'][1]
    green = green_mask(plate)
    lab, n = ndi.label(green)
    comps = [(i + 1, sl) for i, sl in enumerate(ndi.find_objects(lab)) if (lab[sl] == i + 1).sum() > 400]
    spots, used = [], set()
    for s in tpl['spots']:
        x0, y0, x1, y1 = s['box']
        cx, cy = (x0 + x1) / 2 * sx, (y0 + min(y1, tpl['size'][1])) / 2 * sy
        best, bd = None, 1e9
        for j, sl in comps:
            if j in used:
                continue
            d = np.hypot((sl[1].start + sl[1].stop) / 2 - cx, (sl[0].start + sl[0].stop) / 2 - cy)
            if d < bd:
                best, bd = j, d
        if best is None or bd > 0.6 * (y1 - y0) * sy:
            print('no mannequin found for', s['pose'], s['angle'], 'near', int(cx), int(cy))
            continue
        used.add(best)
        M = lab == best
        ys, xs = np.nonzero(M)
        mt, mb = int(ys.min()), int(ys.max())
        hrow = int(mt + 0.05 * (mb - mt)); hx = np.nonzero(M[hrow])[0]
        top_x = xs[ys < mt + max(3, int(0.05 * (mb - mt)))]
        spot = dict(id=f'{shot}-{len(spots)}', pose=s['pose'], angle=s['angle'], facing=FACING[s['angle']],
                    seat=SEAT.get(s['pose'], 'none'), packPoses=PACK[s['pose']],
                    head={'top': mt, 'x': round(float(top_x.mean()), 1), 'width': int(np.ptp(hx)) if len(hx) else 0},
                    box=[int(xs.min()), mt, int(xs.max()) + 1, mb + 1])
        if s['pose'] == 'sitdesk':
            # the body stops at the desk's back edge (the strongest level edge in the empty room between the
            # chest and the hands); only the hands and cuffs come forward onto the desk top
            spot.update(hands=mb, deskEdge=desk_back_edge(empty, spot, mb))
            spot['deskWidth'] = desk_width(empty, spot)
            # what of the body lies on the desk (forearms and hands): the mannequin's shape below the desk edge
            bx0, by0, bx1, by1 = spot['box']
            on = with_outline(M, plate).copy(); on[:spot['deskEdge']] = False
            fn = f'{shot}.ondesk-{len(spots)}.png'
            Image.fromarray((on[by0:by1, bx0:bx1] * 255).astype(np.uint8)).save(os.path.join(HERE, 'plates', fn))
            spot['onDesk'] = fn
        else:
            spot.update(feet=mb)
            front = front_pieces(M, plate, xs, ys, mt, mb)
            if front.any():
                bx0, by0, bx1, by1 = spot['box']
                fn = f'{shot}.front-{len(spots)}.png'
                Image.fromarray((front[by0:by1, bx0:bx1] * 255).astype(np.uint8)).save(os.path.join(HERE, 'plates', fn))
                spot['front'] = fn
        spots.append(spot)
    out = {'shot': shot, 'size': list(plate.size), 'backdrop': shot + '.empty.png', 'plate': shot + '.plate.png',
           'camera': {'horizon': round(tpl['horizon'] * sy)}, 'spots': spots,
           'pictures': [{'id': f'{shot}-frame-{k}', 'box': list(b), 'fill': 'room owner family photo'} for k, b in enumerate(frames)]}
    json.dump(out, open(os.path.join(HERE, 'plates', shot + '.mannequins.json'), 'w'), indent=1)
    return out


if __name__ == '__main__':
    fr = [tuple(int(v) for v in a.split(',')) for a in sys.argv[3:]]
    print(json.dumps(export(sys.argv[1], sys.argv[2], fr), indent=1))
