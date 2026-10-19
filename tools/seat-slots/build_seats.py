"""Seat slots for a place: crowd paintings warped onto the empty place painting, every painted person cut out,
people grouped into seats across versions. Writes cutouts + seats.json + preview renders.

usage: build_seats.py PLACE PLATE.jpg OUTDIR V1.png:MASK1.png [V2.png:MASK2.png ...]
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from align import align
W, H = 1672, 941

def split_people(P):
    """One part per painted person: a component is split between the head bumps along its top edge."""
    lab, k = ndimage.label(P)
    parts = []
    for c in range(1, k + 1):
        m = lab == c
        if m.sum() < 400:
            continue
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        h = y1 - y0 + 1
        top = np.array([np.nonzero(m[:, x])[0].min() if m[:, x].any() else 10 ** 6 for x in range(x0, x1 + 1)])
        win = max(9, int(h * 0.18))
        sm = ndimage.minimum_filter1d(top, size=win)
        heads = []
        for i in [i for i in range(len(top)) if top[i] == sm[i] and top[i] < y0 + 0.6 * h]:
            if not heads or i - heads[-1] > win:
                heads.append(i)
            elif top[i] < top[heads[-1]]:
                heads[-1] = i
        if not heads:
            heads = [int(np.argmin(top))]
        if STRICT:
            parts.append(m)  # never cut a blob in two; person_ok drops blobs with two heads
            continue
        cuts = [x0] + [x0 + (heads[j] + heads[j + 1]) // 2 for j in range(len(heads) - 1)] + [x1 + 1]
        for j in range(len(heads)):
            part = m.copy(); part[:, :cuts[j]] = False; part[:, cuts[j + 1]:] = False
            # keep the piece attached to the head; drop crumbs left by the column cut
            pl, pk = ndimage.label(part)
            if pk > 1:
                sz = ndimage.sum(np.ones_like(pl), pl, range(1, pk + 1))
                part = pl == (int(np.argmax(sz)) + 1)
            if part.sum() >= 400:
                parts.append(part)
    return parts

def heads_in(part):
    """Distinct heads along the top edge: high points with a real dip (15% of the height) between them."""
    ys, xs = np.nonzero(part)
    x0, x1, y0 = xs.min(), xs.max(), ys.min()
    h = ys.max() - y0 + 1
    top = np.array([np.nonzero(part[:, x])[0].min() if part[:, x].any() else ys.max() for x in range(x0, x1 + 1)], float)
    win = max(7, int(h * 0.12))
    sm = ndimage.minimum_filter1d(top, size=win)
    peaks = [i for i in range(len(top)) if top[i] == sm[i] and top[i] < y0 + 0.3 * h]
    heads = []
    for i in peaks:
        if heads:
            j = heads[-1]
            dip = top[j:i + 1].max() - max(top[i], top[j])
            if dip < 0.15 * h:
                if top[i] < top[j]:
                    heads[-1] = i
                continue
        heads.append(i)
    return len(heads)

MAX_HEAD_Y = float(os.environ.get("MAX_HEAD_Y", "0.62"))
STRICT = os.environ.get("STRICT", "0") == "1"   # very sparse crowds: keep only people standing alone

def one_body(part, h):
    """No appendage hanging on a thin neck (a neighbor's hair or shoulder glued to the side of a person)."""
    r = max(2, int(0.055 * h))
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    op = ndimage.binary_opening(part, structure=(xx ** 2 + yy ** 2) <= r * r)
    lab, k = ndimage.label(op)
    if k == 0:
        return False
    sz = np.sort(ndimage.sum(np.ones_like(lab), lab, range(1, k + 1)))[::-1]
    if len(sz) > 1 and sz[1] > 0.08 * part.sum():
        return False
    return (part & ~ndimage.binary_dilation(op, iterations=r)).sum() < 0.10 * part.sum()
FURN_MAX = float(os.environ.get("FURN_MAX", "0.18"))  # share of changed pixels allowed around a person  # no seated head is lower than this share of the picture

def person_ok(part, med_by_row, why=None):
    r = _person_ok(part, med_by_row)
    if why is not None: why.append(r)
    return r == "ok"

def _person_ok(part, med_by_row):
    ys, xs = np.nonzero(part)
    if ys.min() > MAX_HEAD_Y * H:          # legs and arms under the front desks
        return "low"
    h, w = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
    if h < 14 or w < 8:
        return "tiny"
    if h > 3.0 * w:                       # a leg or a chair post, not a person
        return "thin"
    if part.sum() < 0.28 * h * w:         # a thin diagonal (chair arm, desk edge)
        return "sparse"
    # One head on top that is narrower than the shoulders below it.
    t = ys.min()
    widths = np.array([part[y].sum() for y in range(t, t + h)], float)
    upper = widths[: max(4, h // 2)]
    shoulder = upper.max()
    head_rows = np.nonzero(widths[: max(3, int(h * 0.3))] < (0.82 if STRICT else 0.7) * shoulder)[0]
    if len(head_rows) < max(2, int(h * (0.04 if STRICT else 0.06))):
        return "nohead"
    if heads_in(part) > 1:
        return "twoheads"
    if STRICT and not one_body(part, h):
        return "appendage"
    ref = med_by_row(ys.max())
    return "ok" if part.sum() > 0.3 * ref else "small"

def main(place, plate_path, outdir, pairs):
    os.makedirs(os.path.join(outdir, "cut"), exist_ok=True)
    O = np.array(Image.open(plate_path).convert("RGB").resize((W, H)))
    people = []
    for vi, pair in enumerate(pairs):
        vpath, mpath = pair.split(":")
        V = np.array(Image.open(vpath).convert("RGB").resize((W, H), Image.LANCZOS))
        if mpath == "diff":
            # No person mask: align on everything, then people are what differs from the empty room.
            rough = np.abs(V.astype(int) - O.astype(int)).max(axis=2) > 60
            warped, _, _ = align(O, V, ndimage.binary_dilation(ndimage.binary_opening(rough, iterations=2), iterations=6))
            d = np.abs(warped.astype(int) - O.astype(int)).max(axis=2)
            P = ndimage.binary_opening(d > 45, iterations=2)
            P = ndimage.binary_closing(P, iterations=3)
            P = ndimage.binary_fill_holes(P)
        else:
            Mk = np.array(Image.open(mpath).convert("L").resize((W, H), Image.LANCZOS)) > 110
            warped, _, (gy, gx) = align(O, V, ndimage.binary_dilation(Mk, iterations=6))
            yy, xx = np.mgrid[0:H, 0:W]
            Mw = ndimage.map_coordinates(Mk.astype(float), [yy + gy, xx + gx], order=1) > 0.5
            diff = np.abs(warped.astype(int) - O.astype(int)).max(axis=2) > 22
            P = ndimage.binary_opening(Mw & ndimage.binary_dilation(diff, iterations=3), iterations=1)
            P = ndimage.binary_fill_holes(P)
        # Furniture must match the empty room: a person whose seat area (around and below them) differs
        # from the plate is sitting on furniture that isn't there.
        dd = np.abs(warped.astype(int) - O.astype(int)).max(axis=2) > 40
        kept = 0
        for part in split_people(P):
            ys, xs = np.nonzero(part)
            h = ys.max() - ys.min() + 1
            box = np.zeros((H, W), bool)
            box[ys.min():min(H, ys.max() + int(h * 0.35)), max(0, xs.min() - h // 6):min(W, xs.max() + h // 6)] = True
            around = box & ~ndimage.binary_dilation(P, iterations=3)
            furn = around.sum() > 50 and dd[around].mean() > FURN_MAX
            people.append({"v": vi, "mask": part, "img": warped, "furn": furn}); kept += 1
        print(f"version {vi}: {len([p for p in people if p['v'] == vi])} parts")
    # area reference by depth
    def dims(m):
        ys, xs = np.nonzero(m)
        return ys.max(), m.sum(), ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
    # depth medians from head-shaped parts only (chair-gap strips and feet would drag them down)
    headish = [p for p in people if _person_ok(p["mask"], lambda y: 0) == "ok"] or people
    rows = np.array([dims(p["mask"]) for p in headish], float)
    def med_by_row(y, col=1):
        near = rows[np.abs(rows[:, 0] - y) < 60]
        return float(np.median(near[:, col])) if len(near) >= 3 else float(np.median(rows[:, col]))
    def single(m):
        y, _, h, w = dims(m)
        # Two people in one cut-out: much taller or wider than the people around them.
        return h <= 1.45 * med_by_row(y, 2) and w <= 1.6 * med_by_row(y, 3)
    # A person seen from behind in an open chair shows in pieces: head and shoulders above the chair back,
    # a strip of back through the gap, feet under the seat. Pieces that aren't a person join the person above.
    def bbox(m):
        ys, xs = np.nonzero(m)
        return xs.min(), ys.min(), xs.max(), ys.max()
    for p in people:
        p["bb"] = bbox(p["mask"]); p["area"] = int(p["mask"].sum())
    # A smaller part right under a bigger one in the same picture is a piece of it (back seen through the
    # chair gap, feet under the seat), never a person of its own, whatever its shape.
    for f in people:
        fx0, fy0, fx1, fy1 = f["bb"]; fc = (fx0 + fx1) / 2
        best = None
        for p in people:
            if p is f or p["v"] != f["v"]:
                continue
            px0, py0, px1, py1 = p["bb"]; pw, ph = px1 - px0 + 1, py1 - py0 + 1
            if not (px0 - 0.15 * pw <= fc <= px1 + 0.15 * pw): continue
            if fy0 < py0 + 0.4 * ph or fy0 - py1 > 2.0 * ph: continue
            gap = fy0 - py1
            # legs under an open table start just below the person, across the table top, and can be as
            # big as the part above it
            need = 0.8 if 0 <= gap <= 0.35 * ph else 2.0
            if p["area"] < need * f["area"]:
                continue
            if best is None or gap < best[0]:
                best = (gap, p)
        f["parent"] = best[1] if best else None
    for p in people:
        why = []
        p["ok"] = p["parent"] is None and (not p["furn"]) and person_ok(p["mask"], med_by_row, why) and single(p["mask"])
    persons = [p for p in people if p["ok"]]
    attached = 0
    for f in people:
        q = f["parent"]
        while q is not None and q["parent"] is not None:
            q = q["parent"]
        if q is not None and q["ok"]:
            q.setdefault("parts", []).append(f["mask"]); attached += 1
    for p in persons:
        for m in p.pop("parts", []):
            p["mask"] = p["mask"] | m
    people = persons
    print("people kept", len(people), "pieces attached", attached)
    # seats: group by head point across versions
    seats = []
    for p in people:
        ys, xs = np.nonzero(p["mask"])
        t = ys.min()
        hx = np.nonzero(p["mask"][t:t + 4].any(axis=0))[0].mean()
        hw = np.ptp(np.nonzero(p["mask"][t:t + max(3, (ys.max() - t) // 6)].any(axis=0))[0]) + 1
        p.update(head=(float(hx), float(t)), headw=float(hw), bottom=int(ys.max()))
        best = None
        for s in seats:
            d = np.hypot(s["head"][0] - hx, (s["head"][1] - t) * 1.5)
            if d < max(12, 1.2 * s["headw"]) and p["v"] not in s["versions"] and (best is None or d < best[0]):
                best = (d, s)
        if best:
            s = best[1]
            s["people"].append(p); s["versions"].add(p["v"])
            n = len(s["people"])
            s["head"] = ((s["head"][0] * (n - 1) + hx) / n, (s["head"][1] * (n - 1) + t) / n)
        else:
            seats.append({"head": (hx, t), "headw": hw, "people": [p], "versions": {p["v"]}})
    seats.sort(key=lambda s: (round(s["head"][1] / 20), s["head"][0]))
    out = {"place": place, "plate": os.path.basename(plate_path), "width": W, "height": H, "seats": []}
    for si, s in enumerate(seats):
        variants = []
        for p in s["people"]:
            ys, xs = np.nonzero(p["mask"])
            x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            soft = ndimage.gaussian_filter(ndimage.binary_dilation(p["mask"], iterations=1).astype(float), 0.7)
            rgba = np.dstack([p["img"], (soft * 255).astype(np.uint8)])[max(0, y0 - 2):y1 + 2, max(0, x0 - 2):x1 + 2]
            fn = f"{place}__seat{si:03d}__v{p['v']}.png"
            Image.fromarray(rgba).save(os.path.join(outdir, "cut", fn))
            variants.append({"file": fn, "left": int(max(0, x0 - 2)), "top": int(max(0, y0 - 2)), "bottom": p["bottom"]})
        out["seats"].append({"id": f"{place}:seat:{si}", "head": [round(float(s["head"][0]), 1), round(float(s["head"][1]), 1)], "variants": variants})
    json.dump(out, open(os.path.join(outdir, "seats.json"), "w"), indent=1)
    print("seats", len(seats), "variants", sum(len(s["people"]) for s in seats))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
