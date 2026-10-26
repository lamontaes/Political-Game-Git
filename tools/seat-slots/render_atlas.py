"""Reference renderer for a packed seat-slot place: the place painting for a light, then one variant per
occupied seat cut from that light's sheet, drawn far to near (lowest bottom last).
usage: render_atlas.py PACK_DIR PLATE.jpg LIGHT SHARE SEED OUT.jpg"""
import json, os, sys
import numpy as np
from PIL import Image
def render(pack, plate, light, share, seed, out):
    meta = json.load(open(os.path.join(pack, "seats.json")))
    sheet = Image.open(os.path.join(pack, meta["sheets"][light])).convert("RGBA")
    canvas = Image.open(plate).convert("RGBA").resize((meta["width"], meta["height"]))
    rng = np.random.default_rng(seed)
    picks = []
    for s in meta["seats"]:
        if rng.random() < share:
            vs = [v for v in s["variants"] if v.get("activity", "plain") == "plain"] or s["variants"]  # plain by default
            picks.append(vs[rng.integers(len(vs))])
    for v in sorted(picks, key=lambda v: v["bottom"]):
        x, y, w, h = v["rect"]
        canvas.alpha_composite(sheet.crop((x, y, x + w, y + h)), tuple(v["at"][light]))
    canvas.convert("RGB").save(out, quality=90)
    return len(picks)
if __name__ == "__main__":
    a = sys.argv
    print(render(a[1], a[2], a[3], float(a[4]), int(a[5]), a[6]))
