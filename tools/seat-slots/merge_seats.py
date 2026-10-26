"""Add the seats of another build into a base build: a seat whose head lands on a base seat joins it, the rest
become new seats. Files are copied and renamed; light copies are dropped (run seat_lights.py again after).
usage: merge_seats.py BASE_OUT ADD_OUT DEST_OUT [MAX_PER_SEAT]"""
import json, os, shutil, sys
import numpy as np
base, add, dest = sys.argv[1:4]
cap = int(sys.argv[4]) if len(sys.argv) > 4 else 99
A = json.load(open(os.path.join(base, "seats.json"))); B = json.load(open(os.path.join(add, "seats.json")))
def headw(out, s):
    from PIL import Image
    v = s["variants"][0]; im = Image.open(os.path.join(out, "cut", v["file"]))
    return im.width * 0.45
seats = [{"head": list(s["head"]), "hw": headw(base, s), "vars": [(base, v) for v in s["variants"]]} for s in A["seats"]]
for s in B["seats"]:
    hw = headw(add, s)
    best = None
    for t in seats:
        d = np.hypot(t["head"][0] - s["head"][0], (t["head"][1] - s["head"][1]) * 1.5)
        if d < max(12, 0.6 * min(hw, t["hw"])) and (best is None or d < best[0]):
            best = (d, t)
    if best:
        best[1]["vars"] += [(add, v) for v in s["variants"]]
    else:
        seats.append({"head": list(s["head"]), "hw": hw, "vars": [(add, v) for v in s["variants"]]})
seats.sort(key=lambda s: (round(s["head"][1] / 20), s["head"][0]))
if os.path.exists(dest): shutil.rmtree(dest)
os.makedirs(os.path.join(dest, "cut"))
place = A["place"]; out = {k: A[k] for k in ("place", "plate", "width", "height")}; out["seats"] = []
for si, s in enumerate(seats):
    vs = []
    s["vars"].sort(key=lambda sv: sv[1].get("activity", "plain") != "plain")  # plain first, so the cap keeps them
    for k, (src, v) in enumerate(s["vars"][:cap]):
        fn = f"{place}__seat{si:03d}__v{k}.png"
        shutil.copy(os.path.join(src, "cut", v["file"]), os.path.join(dest, "cut", fn))
        vs.append({"file": fn, "left": v["left"], "top": v["top"], "bottom": v["bottom"], **({"activity": v["activity"]} if "activity" in v else {})})
    out["seats"].append({"id": f"{place}:seat:{si}", "head": [round(s["head"][0], 1), round(s["head"][1], 1)], "variants": vs})
json.dump(out, open(os.path.join(dest, "seats.json"), "w"), indent=1)
print("seats", len(seats), "variants", sum(len(s["variants"]) for s in out["seats"]))
