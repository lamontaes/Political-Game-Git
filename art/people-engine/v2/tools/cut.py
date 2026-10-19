"""Cut the Codex v2 sheets into single pieces and measure them.

Body sheets: 2 rows (women top, men bottom) x 3 builds. Each piece is the
alpha bounding box of its cell plus a small pad. Measured per figure: width,
height, footY (lowest opaque row), facing (left/right for three-quarter views,
from which side the lower body reaches out), and for seated figures seatY (the
hip line on the cushion: the row where the thighs are widest in the lower half).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(__file__))
from labels import SHEETS

SRC = os.path.expanduser("~/Downloads/codex-images")
OUT = os.path.join(os.path.dirname(__file__), "out")
PAD = 6
BUILDS = ["slim", "medium", "heavy"]
SEXES = ["female", "male"]


def alpha_of(im):
    return np.asarray(im)[:, :, 3]


def gaps(profile, parts, lo=0.0, hi=1.0):
    """Split points for `parts` pieces: the emptiest runs of the profile between pieces."""
    n = len(profile)
    cuts = []
    for k in range(1, parts):
        a, b = int(n * (k - 0.5) / parts), int(n * (k + 0.5) / parts)
        seg = profile[a:b]
        m = seg.min()
        idx = np.where(seg <= m + max(1, m * 0.05))[0]
        cuts.append(a + int(idx.mean()))
    return [0] + cuts + [n]


def bbox(mask):
    ys, xs = np.where(mask)
    if not len(ys):
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def clean(a):
    """Keep the main piece plus anything near it (hands, props); drop specks."""
    m = a > 24
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=8))
    if n <= 1:
        return a
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(400, sizes.max() * 0.02)])
    out = a.copy()
    out[~keep] = 0
    return out


def facing_of(a):
    """Three-quarter facing: the side the knees/feet reach toward, relative to the head."""
    h = a.shape[0]
    m = a > 60
    ys, xs = np.where(m)
    head = xs[ys < ys.min() + h * 0.12].mean()
    low = xs[ys > ys.min() + h * 0.55].mean()
    return "right" if low > head else "left"


def seat_of(a):
    m = a > 60
    rows = m.sum(1)
    top = np.where(rows)[0].min()
    bot = np.where(rows)[0].max()
    h = bot - top
    a0, b0 = top + int(h * 0.45), top + int(h * 0.80)
    widths = []
    for y in range(a0, b0):
        xs = np.where(m[y])[0]
        widths.append(xs.max() - xs.min() if len(xs) else 0)
    return int(a0 + int(np.argmax(widths)))


def body_cells(a):
    """Six figures as connected shapes: the six largest blobs, small bits joined to the nearest; rows by height, then left to right."""
    m = a > 24
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=3))
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1]
    main = [int(i) + 1 for i in order[:6]]
    cents = {k: ndimage.center_of_mass(m, lab, k) for k in range(1, n + 1)}
    owner = {}
    for k in range(1, n + 1):
        if k in main:
            owner[k] = k
        elif sizes[k - 1] >= 30:
            cy, cx = cents[k]
            owner[k] = min(main, key=lambda j: (cents[j][0] - cy) ** 2 + (cents[j][1] - cx) ** 2)
    groups = {j: [k for k, o in owner.items() if o == j] for j in main}
    ys = sorted(main, key=lambda j: cents[j][0])
    top, bot = ys[:3], ys[3:]
    out = []
    for r, row in enumerate((top, bot)):
        for c, j in enumerate(sorted(row, key=lambda j: cents[j][1])):
            keep = np.isin(lab, groups[j]) & m
            yy, xx = np.where(keep)
            X0, Y0 = max(0, xx.min() - PAD), max(0, yy.min() - PAD)
            X1, Y1 = min(a.shape[1], xx.max() + 1 + PAD), min(a.shape[0], yy.max() + 1 + PAD)
            out.append((r, c, (X0, Y0, X1, Y1), keep))
    return out


def toes_of(a):
    """Which way a three-quarter figure faces: the side its shoes reach past the ankles."""
    m = a > 60
    rows = np.where(m.sum(1))[0]
    top, bot = rows.min(), rows.max()
    h = bot - top
    def ext(y0, y1):
        xs = np.where(m[y0:y1].any(0))[0]
        return xs.min(), xs.max()
    bl, br = ext(bot - int(h * 0.04), bot + 1)
    al, ar = ext(bot - int(h * 0.12), bot - int(h * 0.08))
    return "right" if (br - ar) > (al - bl) else "left"


def main():
    os.makedirs(OUT, exist_ok=True)
    figures, pieces = [], []
    for sheet, lab in SHEETS.items():
        path = os.path.join(SRC, f"clarify-{sheet}.png")
        im = Image.open(path).convert("RGBA")
        a = alpha_of(im)
        kind = lab[0]
        if kind == "body":
            rows, cols = 2, 3
        else:
            count = lab[3]
            rows = 2 if count in (6, 12) and kind == "hands" else 3
            cols = count // rows
        if kind == "body":
            cells = body_cells(a)
            for r, c, (X0, Y0, X1, Y1), keep in cells:
                piece = im.crop((X0, Y0, X1, Y1))
                pa = np.asarray(piece).copy()
                pa[:, :, 3] = np.where(keep[Y0:Y1, X0:X1], pa[:, :, 3], 0)
                piece = Image.fromarray(pa)
                pal = pa[:, :, 3]
                _, pose, angle, outfit, prop, flag = lab
                sex, build = SEXES[r], BUILDS[c]
                fid = f"v2-{sheet}-{sex[0]}-{build}"
                fname = f"figures/{fid}.png"
                rowsum = (pal > 60).sum(1)
                foot = int(np.where(rowsum)[0].max()) + 1
                rec = {
                    "id": fid, "file": fname, "sheet": f"clarify-{sheet}",
                    "pose": pose, "angle": angle, "outfit": outfit, "prop": prop,
                    "sex": sex, "build": build, "ageBand": "adult",
                    "width": piece.width, "height": piece.height, "footY": foot,
                }
                if angle == "three-quarter":
                    rec["facing"] = toes_of(pal)
                elif angle == "front":
                    rec["facing"] = "viewer"
                else:
                    rec["facing"] = "away"
                if flag and r == 0:
                    rec["flag"] = flag
                    rec["facing"] = "viewer"
                if pose == "sit":
                    rec["seatY"] = seat_of(pal)
                figures.append(rec)
                os.makedirs(os.path.join(OUT, "figures"), exist_ok=True)
                piece.save(os.path.join(OUT, fname))
            # one facing per sheet: the majority of its six
            mine = [f for f in figures if f["sheet"] == f"clarify-{sheet}" and f.get("facing") in ("left", "right")]
            if mine:
                vote = max(("left", "right"), key=lambda v: sum(f["facing"] == v for f in mine))
                for f in mine:
                    f["facing"] = vote
            continue
        rcut = gaps(a.sum(1).astype(float), rows)
        for r in range(rows):
            band = a[rcut[r]:rcut[r + 1]]
            ccut = gaps(band.sum(0).astype(float), cols)
            for c in range(cols):
                cell = band[:, ccut[c]:ccut[c + 1]]
                bb = bbox(cell > 24)
                if bb is None:
                    continue
                x0, y0, x1, y1 = bb
                X0 = max(0, ccut[c] + x0 - PAD); Y0 = max(0, rcut[r] + y0 - PAD)
                X1 = min(a.shape[1], ccut[c] + x1 + PAD); Y1 = min(a.shape[0], rcut[r] + y1 + PAD)
                piece = im.crop((X0, Y0, X1, Y1))
                pa = np.asarray(piece).copy()
                # zero anything that belongs to a neighbouring cell
                pa[:, :, 3] = clean(pa[:, :, 3])
                piece = Image.fromarray(pa)
                pal = pa[:, :, 3]
                if kind == "body":
                    _, pose, angle, outfit, prop, flag = lab
                    sex, build = SEXES[r], BUILDS[c]
                    fid = f"v2-{sheet}-{sex[0]}-{build}"
                    fname = f"figures/{fid}.png"
                    rowsum = (pal > 60).sum(1)
                    foot = int(np.where(rowsum)[0].max()) + 1
                    rec = {
                        "id": fid, "file": fname, "sheet": f"clarify-{sheet}",
                        "pose": pose, "angle": angle, "outfit": outfit, "prop": prop,
                        "sex": sex, "build": build, "ageBand": "adult",
                        "width": piece.width, "height": piece.height, "footY": foot,
                    }
                    if angle == "three-quarter":
                        rec["facing"] = facing_of(pal)
                    elif angle == "front":
                        rec["facing"] = "viewer"
                    else:
                        rec["facing"] = "away"
                    if flag and r == 0:
                        rec["flag"] = flag
                        rec["facing"] = "viewer"
                    if pose == "sit":
                        rec["seatY"] = seat_of(pal)
                    figures.append(rec)
                else:
                    _, what, view, *_ = lab
                    pid = f"v2-{sheet}-{what}-{view}-{r * cols + c + 1:02d}"
                    fname = f"{'hair' if kind == 'hair' else 'hands'}/{pid}.png"
                    pieces.append({"id": pid, "file": fname, "sheet": f"clarify-{sheet}",
                                   "kind": kind, "set": what, "view": view,
                                   "width": piece.width, "height": piece.height})
                os.makedirs(os.path.dirname(os.path.join(OUT, fname)), exist_ok=True)
                piece.save(os.path.join(OUT, fname))
    json.dump({"figures": figures, "pieces": pieces}, open(os.path.join(OUT, "index.json"), "w"), indent=1)
    print(len(figures), "figures,", len(pieces), "hair/hand pieces")


if __name__ == "__main__":
    main()
