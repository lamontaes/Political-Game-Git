"""Render a place from seat slots: the empty plate plus a variant in each occupied seat, far to near."""
import json, os, sys
import numpy as np
from PIL import Image

def render(outdir, plate_path, share, seed, out):
    meta = json.load(open(os.path.join(outdir, "seats.json")))
    rng = np.random.default_rng(seed)
    canvas = Image.open(plate_path).convert("RGBA").resize((meta["width"], meta["height"]))
    picks = []
    for s in meta["seats"]:
        if rng.random() < share:
            vs = [v for v in s["variants"] if v.get("activity", "plain") == "plain"] or s["variants"]
            picks.append(vs[rng.integers(len(vs))])
    for v in sorted(picks, key=lambda v: v["bottom"]):
        im = Image.open(os.path.join(outdir, "cut", v["file"]))
        canvas.alpha_composite(im, (v["left"], v["top"]))
    canvas.convert("RGB").save(out, quality=90)
    return len(picks)

if __name__ == "__main__":
    print(render(sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]))
