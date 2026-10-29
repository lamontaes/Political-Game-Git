"""Mannequin plates first, people second (owner, Oct 28: "do not put people in until there are
mannequins in there for every position").

1. blob_plate(): each person-to-be's own pose, as a flat gray silhouette slightly larger than the
   figure, laid on the empty painting at its position.
2. Firefly repaints every silhouette as a green mannequin sitting or standing IN the furniture
   (hips sunk into cushions, armrests and desk edges drawn over it), room unchanged.
3. fit(): the person in that same pose goes exactly where its silhouette was; wherever the plate
   shows furniture instead of green inside that person's outline, the furniture stays in front."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi


def scaled(f, mode, **p):
    """The figure scaled and positioned: returns (RGBA image, (ox, oy))."""
    img, ht = f['img'], f['head_top']
    a0 = np.asarray(img)[..., 3] > 128
    if mode == 'spot':
        sp = p['spot']
        if sp['tags'].get('coveredBy', 'none') != 'none':
            # the box stops at the furniture: size by the head instead
            from spot_scene import head_metrics
            _, _, hw = head_metrics(img)
            s = sp['headWidth'] / max(hw, 1)
        else:
            s = (sp['box'][3] - sp['headTop']) / max(f['feet'] - ht, 1)
        xs = np.nonzero(a0[ht:ht + max(4, int(0.04 * f['stature']))].any(0))[0]
        cx = xs.mean() if len(xs) else img.width / 2
        ox, oy = sp['headX'] - cx * s, sp['headTop'] - ht * s
    else:   # feet on the floor at (x, feet_y), stature in pixels
        s = p['stature'] / f['stature']
        ox, oy = p['x'] - f['foot_cx'] * s, p['feet_y'] - f['feet'] * s
    s *= p.get('scale', 1.0)
    im = img.convert('RGBa').resize((max(1, int(img.width * s)), max(1, int(img.height * s))), Image.LANCZOS).convert('RGBA')
    return im, (int(round(ox)), int(round(oy)))


def on_canvas(size, im, off):
    L = Image.new('RGBA', size, (0, 0, 0, 0))
    ox, oy = off
    x0, y0 = max(0, -ox), max(0, -oy)
    L.alpha_composite(im.crop((x0, y0, im.width, im.height)), (max(0, ox), max(0, oy)))
    return np.asarray(L)


def blob_plate(backdrop, placements):
    """The empty painting with every pose's silhouette in flat gray, a little larger than the person."""
    base = np.asarray(backdrop.convert('RGB')).astype(np.float32)
    out = base.copy()
    for pl in placements:
        im, off = scaled(pl['fig'], **pl['where'])
        a = on_canvas(backdrop.size, im, off)[..., 3] > 128
        h = max(1, int(np.ptp(np.nonzero(a.any(1))[0])))
        blob = ndi.binary_dilation(a, iterations=max(2, int(0.02 * h)))
        if pl.get('clip_below') is not None:   # behind a desk: only what shows above its top edge
            blob[int(pl['clip_below']):] = False
        ring = blob & ~ndi.binary_erosion(blob, iterations=2)
        out[blob] = (150, 150, 152)
        out[ring] = (70, 70, 74)
        pl['_blob'] = blob
        pl['_person'] = (im, off)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def green_mask(plate):
    a = np.asarray(plate.convert('RGB')).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (g > r + 30) & (g > b + 20) & (g > 80)
    m = ndi.binary_opening(m, iterations=1)
    return ndi.binary_fill_holes(ndi.binary_closing(m, iterations=2))


def fit(backdrop, plate, placements, light=None):
    """Put each person on its mannequin; furniture the plate drew over the mannequin stays in front."""
    plate = plate.convert('RGB').resize(backdrop.size, Image.LANCZOS)
    green = green_mask(plate)
    canvas = backdrop.convert('RGBA').copy()
    for pl in sorted(placements, key=lambda q: q.get('order', 0)):
        im, off = pl['_person']
        if light:
            im = light(backdrop, im, off)
        L = on_canvas(backdrop.size, im, off).copy()
        person = L[..., 3] > 0
        blob = pl['_blob']
        g = green & ndi.binary_dilation(blob, iterations=8)
        if g.sum() < 0.25 * (person & blob).sum():
            pl['_warn'] = 'mannequin missing or moved'
        # inside the silhouette, wherever the plate shows no mannequin, the room is in front
        hidden = blob & ~ndi.binary_dilation(g, iterations=3) & person
        # the head and hair are never hidden by furniture (the mannequin is bald; hair is wider)
        ys = np.nonzero(person.any(1))[0]
        if len(ys):
            top = ys.min(); hgt = ys.max() - top
            hidden[:top + int(0.16 * hgt)] = False
        L[hidden, 3] = 0
        pl['_hidden'] = int(hidden.sum())
        canvas.alpha_composite(Image.fromarray(L))
    return canvas, green


def fit_to_mannequins(backdrop, plate, placements, light=None):
    """Like fit(), but each person is re-fitted to its painted mannequin: the same head top, feet
    and head center. Inside the mannequin's outline, whatever the plate drew over it (a cushion
    edge, an armrest, a desk) stays in front of the person."""
    plate = register(backdrop, plate)
    green = green_mask(plate)
    lab, n = ndi.label(green)
    canvas = backdrop.convert('RGBA').copy()
    report = []
    order = sorted(range(len(placements)), key=lambda i: placements[i].get('order', 0))
    used = set()
    for i in order:
        pl = placements[i]
        near = ndi.binary_dilation(pl['_blob'], iterations=25)
        ids = [j for j in np.unique(lab[near & green]) if j and j not in used]
        if not ids:
            report.append((i, 'no mannequin')); continue
        # the components that overlap this silhouette the most
        sizes = [(int(((lab == j) & pl['_blob']).sum()), j) for j in ids]
        sizes.sort(reverse=True)
        bh = max(1, int(np.ptp(np.nonzero(pl['_blob'].any(1))[0])))
        best = sizes[0][1]
        comp = lab == best
        if sizes[0][0] < 0.3 * comp.sum():
            # Firefly painted this person's mannequin a step to the side: the person goes on that
            # mannequin (a whole one of about the right size), never on a sliver of a neighbor
            ch = int(np.ptp(np.nonzero(comp.any(1))[0]))
            if abs(ch - bh) > 0.25 * bh:
                report.append((i, 'no mannequin of the right size: left out')); continue
            used.add(best)
            M = comp
        else:
            keep = [j for s_, j in sizes if s_ > 0.15 * sizes[0][0]]
            used.update(keep)
            # only this person's own mannequin, even where neighbors touch
            M = np.isin(lab, keep) & ndi.binary_dilation(pl['_blob'], iterations=max(4, int(0.06 * bh)))
        ys, xs = np.nonzero(M)
        mt, mb = ys.min(), ys.max()
        mcx = xs[ys < mt + max(3, int(0.05 * (mb - mt)))].mean()
        if pl.get('desk_edge') is not None:
            # seated behind a desk: head top and resting hands from the mannequin
            from frames import at_desk
            at_desk(canvas, pl['fig'], head_top_y=int(mt), hands_y=int(mb), center_x=float(mcx), desk_edge_y=int(pl['desk_edge']))
            report.append((i, 'at desk'))
            continue
        im, off = pl['_person']
        a = np.asarray(im)[..., 3] > 128
        pys, pxs = np.nonzero(a)
        pt, pb = pys.min(), pys.max()
        pcx = pxs[pys < pt + max(3, int(0.05 * (pb - pt)))].mean()
        s = (mb - mt) / max(pb - pt, 1)
        im2 = im.convert('RGBa').resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS).convert('RGBA')
        if light:
            im2 = light(backdrop, im2)
        off2 = (int(round(mcx - pcx * s)), int(round(mt - pt * s)))
        L = on_canvas(backdrop.size, im2, off2).copy()
        person = L[..., 3] > 0
        if pl.get('shadow'):   # a soft contact shadow under the feet of someone standing
            from PIL import ImageDraw, ImageFilter
            fy_ = int(np.nonzero(person.any(1))[0].max()); fx_ = int(np.nonzero(person[fy_ - 3:fy_ + 1].any(0))[0].mean())
            hh = mb - mt; sw, sh = int(hh * 0.28), max(4, int(hh * 0.04))
            sm = Image.new('L', (sw * 2, sh * 2), 0)
            ImageDraw.Draw(sm).ellipse((sw // 2, sh // 2, sw * 3 // 2, sh * 3 // 2), fill=90)
            sm = sm.filter(ImageFilter.GaussianBlur(sh * 0.35))
            dark = Image.new('RGBA', sm.size, (40, 36, 40, 0)); dark.putalpha(sm)
            canvas.alpha_composite(dark, (fx_ - sw, fy_ - sh))
        # furniture in front: inside the mannequin's row span, where the plate shows no mannequin
        # only big pieces of furniture drawn over the mannequin's lower body hide the person
        # (an armrest, a desk edge); slivers where the poses differ never cut an arm or a hand
        span = np.zeros_like(M)
        for y in np.unique(ys):
            row = xs[ys == y]
            span[y, row.min():row.max() + 1] = True
        lower = np.zeros_like(M); lower[mt + int(0.45 * (mb - mt)):] = True
        hidden = person & span & lower & ~ndi.binary_dilation(M, iterations=6)
        labh, nh = ndi.label(hidden)
        if nh:
            sz = ndi.sum(hidden, labh, range(1, nh + 1))
            hidden = np.isin(labh, [j + 1 for j, v in enumerate(sz) if v > 250])
        L[hidden, 3] = 0
        canvas.alpha_composite(Image.fromarray(L))
        report.append((i, f'scale {s:.2f}, hidden {int(hidden.sum())} px'))
    return canvas, green, report


def register(backdrop, plate):
    """Bring a repainted plate onto the empty painting's pixels: resize, then shift by the offset
    that best lines up their edges (Firefly redraws at its own size)."""
    p = plate.convert('RGB').resize(backdrop.size, Image.LANCZOS)
    def edges(im):
        g = np.asarray(im.convert('L').resize((im.width // 4, im.height // 4)), np.float32)
        return np.hypot(ndi.sobel(g, 0), ndi.sobel(g, 1))
    a, b = edges(backdrop), edges(p)
    F = np.fft.fft2(a) * np.conj(np.fft.fft2(b))
    r = np.fft.ifft2(F / (np.abs(F) + 1e-6)).real
    dy, dx = np.unravel_index(np.argmax(r), r.shape)
    if dy > r.shape[0] // 2: dy -= r.shape[0]
    if dx > r.shape[1] // 2: dx -= r.shape[1]
    dx, dy = int(dx * 4), int(dy * 4)
    out = Image.new('RGB', backdrop.size, (0, 0, 0)); out.paste(p, (dx, dy))
    register.last = (dx, dy)
    return out


def export_spots(name, backdrop, plate, placements, out_dir):
    """Write the game's data for a mannequin plate: <name>.mannequins.json plus one front-mask PNG per
    mannequin. Each spot: the pose it was painted in (pose, seat, facing), its head (top, x, width),
    its feet (or, behind a desk, its resting hands and the desk edge), and a mask of the furniture
    painted in front of it (draw the person, then the room through that mask)."""
    import json, os
    plate = register(backdrop, plate)
    green = green_mask(plate)
    lab, n = ndi.label(green)
    spots, used = [], set()
    for i, pl in enumerate(placements):
        near = ndi.binary_dilation(pl['_blob'], iterations=25)
        ids = [j for j in np.unique(lab[near & green]) if j and j not in used]
        if not ids:
            continue
        sizes = sorted([(int(((lab == j) & pl['_blob']).sum()), j) for j in ids], reverse=True)
        best = sizes[0][1]; comp = lab == best
        bh = max(1, int(np.ptp(np.nonzero(pl['_blob'].any(1))[0])))
        if sizes[0][0] < 0.3 * comp.sum():
            M = comp; used.add(best)
        else:
            keep = [j for s_, j in sizes if s_ > 0.15 * sizes[0][0]]; used.update(keep)
            M = np.isin(lab, keep) & ndi.binary_dilation(pl['_blob'], iterations=max(4, int(0.06 * bh)))
        ys, xs = np.nonzero(M)
        mt, mb = int(ys.min()), int(ys.max())
        top_x = xs[ys < mt + max(3, int(0.05 * (mb - mt)))]
        hrow = int(mt + 0.05 * (mb - mt)); hx = np.nonzero(M[hrow])[0]
        span = np.zeros_like(M)
        for y in np.unique(ys):
            row = xs[ys == y]; span[y, row.min():row.max() + 1] = True
        lower = np.zeros_like(M); lower[mt + int(0.45 * (mb - mt)):] = True
        front = span & lower & ~ndi.binary_dilation(M, iterations=6)
        labf, nf = ndi.label(front)
        if nf:
            szf = ndi.sum(front, labf, range(1, nf + 1)); front = np.isin(labf, [j + 1 for j, v in enumerate(szf) if v > 250])
        x0, y0, x1, y1 = int(xs.min()), mt, int(xs.max()) + 1, mb + 1
        spot = dict(id=f'{name}-{len(spots)}', pose=pl['tag'][0], seat=pl['tag'][1], facing=pl['tag'][2],
                    head={'top': mt, 'x': round(float(top_x.mean()), 1), 'width': int(hx.max() - hx.min()) if len(hx) else 0},
                    box=[x0, y0, x1, y1])
        if pl.get('desk_edge') is not None:
            spot.update(hands=mb, deskEdge=int(pl['desk_edge']))
        else:
            spot.update(feet=mb)
        if front.any():
            fm = Image.fromarray((front[y0:y1, x0:x1] * 255).astype(np.uint8))
            fn = f'{name}.front-{len(spots)}.png'; fm.save(os.path.join(out_dir, fn)); spot['front'] = fn
        spots.append(spot)
    json.dump({'scene': name, 'size': list(backdrop.size), 'backdrop': os.path.basename(getattr(backdrop, 'filename', '') or ''),
               'spots': spots}, open(os.path.join(out_dir, f'{name}.mannequins.json'), 'w'), indent=1)
    return spots
