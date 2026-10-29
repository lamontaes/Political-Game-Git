"""Spots for a finished room: library silhouettes laid on the empty backdrop (gray with a dark rim, the intro
recipe), one plate per group of spots that don't overlap. Firefly repaints each silhouette as a green mannequin
sitting or standing in the furniture; export_multi() then reads every mannequin with its known pose and angle.

Sizes come from the room's own painted people: standing height = K_STAND * (feet - horizon), seated = K_SEAT * ..."""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
import template as T

HERE = os.path.dirname(os.path.abspath(__file__))


def blob_plate(empty, spots, horizon, k_stand, k_seat, out_png, out_json):
    im = Image.open(empty).convert('RGB'); a = np.asarray(im).astype(np.int32).copy()
    placed = []
    for s in spots:
        cut = T.library(s['pose'])[s['angle']]
        seated = s['pose'] in ('sit', 'sitdesk', 'couch')
        h = (k_seat if seated else k_stand) * (s['feet'] - horizon) * s.get('scale', 1.0)
        k = h / cut.height
        c = cut.resize((max(1, int(cut.width * k)), max(1, int(h))), Image.LANCZOS)
        m = np.asarray(c)[..., 3] > 128
        x0 = int(s['x'] - c.width / 2); y0 = int(s['feet'] - c.height)
        blob = np.zeros(a.shape[:2], bool)
        ys, xs = np.nonzero(m)
        ok = (ys + y0 >= 0) & (ys + y0 < a.shape[0]) & (xs + x0 >= 0) & (xs + x0 < a.shape[1])
        blob[ys[ok] + y0, xs[ok] + x0] = True
        ring = blob & ~ndi.binary_erosion(blob, iterations=2)
        a[blob] = (150, 150, 156); a[ring] = (70, 70, 74)
        placed.append(dict(s, box=[x0, y0, x0 + c.width, y0 + c.height], blob=None))
        np.save(out_json.replace('.json', f'.blob{len(placed) - 1}.npy'), blob)
    Image.fromarray(a.astype(np.uint8)).save(out_png)
    json.dump({'spots': placed, 'horizon': horizon}, open(out_json, 'w'), indent=1)
    return placed


def export_multi(shot, group, plate_png, empty_png, out_dir):
    """Read the repainted plate of one silhouette group: each green mannequin is matched to its silhouette (so its
    pose and angle are the library's), with its head, feet and the furniture painted in front of it. Returns spots."""
    sys.path.insert(0, os.path.join(HERE, '..', 'intro'))
    from mannequins import green_mask, register, front_pieces, with_outline
    empty = Image.open(empty_png).convert('RGB')
    plate = register(empty, Image.open(plate_png).convert('RGB'))
    meta = json.load(open(os.path.join(out_dir, f'{shot}.blobs-{group}.json')))
    g = green_mask(plate)
    lab, n = ndi.label(g)
    spots = []
    for i, s in enumerate(meta['spots']):
        blob = np.load(os.path.join(out_dir, f'{shot}.blobs-{group}.blob{i}.npy'))
        near = ndi.binary_dilation(blob, iterations=20)
        ids, cnt = np.unique(lab[near & g], return_counts=True)
        keep = [j for j, c in zip(ids, cnt) if j and c > 150]
        if not keep:
            print(group, s['id'], 'no mannequin found'); continue
        M = np.isin(lab, keep) & near
        ys, xs = np.nonzero(M)
        mt, mb = int(ys.min()), int(ys.max())
        hrow = int(mt + 0.05 * (mb - mt)); hx = np.nonzero(M[hrow])[0]
        top_x = xs[ys < mt + max(3, int(0.05 * (mb - mt)))]
        spot = dict(id=f'{shot}-{s["id"]}', pose=s['pose'], angle=s['angle'], facing={'front': 0, 'tq-left': -45, 'tq-right': 45, 'btq-left': -135, 'btq-right': 135}[s['angle']],
                    seat={'couch': 'couch', 'sit': 'chair', 'sitdesk': 'desk-chair'}.get(s['pose'], 'none'),
                    head={'top': mt, 'x': round(float(top_x.mean()), 1), 'width': int(np.ptp(hx)) if len(hx) else 0},
                    box=[int(xs.min()), mt, int(xs.max()) + 1, mb + 1], feet=mb, plate=os.path.basename(plate_png))
        blob_feet = int(np.nonzero(blob.any(1))[0].max())
        moved = mb > blob_feet + 15   # Firefly placed it lower (in front of furniture)
        if moved:
            spot['moved'] = True
            spots.append(spot); continue
        if mb < blob_feet - 20:
            # furniture (a desk) hides the lower body: the feet are the silhouette's, the furniture is the cutout
            # everything across the person's width from where the mannequin disappears down to the floor
            w = int(xs.max() - xs.min())
            front = np.zeros_like(blob)
            m_ = max(w, 60)
            front[mb - 1:blob_feet + 3, max(0, int(xs.min()) - m_):int(xs.max()) + m_] = True
            spot['feet'] = blob_feet
            # Firefly may draw a half-hidden mannequin small; the silhouette was sized to the room
            blob_top = int(np.nonzero(blob.any(1))[0].min())
            if blob_top < mt:
                spot['head']['top'] = blob_top; mt = blob_top
            fy, fx = np.nonzero(front)
            spot['box'] = [int(min(xs.min(), fx.min())), mt, int(max(xs.max(), fx.max())) + 1, blob_feet + 1]
            bx0, by0, bx1, by1 = spot['box']
            fn = f'{shot}.front-{s["id"]}-{os.path.basename(plate_png)[:-4]}.png'
            Image.fromarray((front[by0:by1, bx0:bx1] * 255).astype(np.uint8)).save(os.path.join(out_dir, fn))
            spot['front'] = fn
            spots.append(spot); continue
        # what is painted in front: inside the silhouette, where the plate shows no mannequin (couch arm, desk)
        # (thin slivers where Firefly drew the mannequin a little slimmer than its silhouette are not furniture)
        # only furniture that really crosses the body counts (a silhouette Firefly redrew a little off is no evidence)
        front = front_pieces(M, plate, xs, ys, mt, mb)
        lab2, n2 = ndi.label(front)
        big = [k + 1 for k, sl in enumerate(ndi.find_objects(lab2)) if (lab2[sl] == k + 1).sum() > 120]
        front = np.isin(lab2, big)
        if front.any():
            fy, fx = np.nonzero(front)
            # the silhouette's own feet show where the body really reaches when furniture hides the lower part
            bys = np.nonzero(blob.any(1))[0]
            spot['feet'] = int(bys.max())
            spot['box'] = [int(min(xs.min(), fx.min())), mt, int(max(xs.max(), fx.max())) + 1, spot['feet'] + 1]
            bx0, by0, bx1, by1 = spot['box']
            fn = f'{shot}.front-{s["id"]}.png'
            Image.fromarray((front[by0:by1, bx0:bx1] * 255).astype(np.uint8)).save(os.path.join(out_dir, fn))
            spot['front'] = fn
        spots.append(spot)
    return spots
