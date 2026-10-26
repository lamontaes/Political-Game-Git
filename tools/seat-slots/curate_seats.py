"""Drop hand-rejected variants (seat, version) from seats.json and remove seats left empty."""
import json, os, sys
d = sys.argv[1]
drop = {tuple(x.split("v")) for x in sys.argv[2].split(",")}  # "s3v1" -> ("s3", "1")
meta = json.load(open(os.path.join(d, "seats.json")))
kept = []
for s in meta["seats"]:
    sid = "s" + s["id"].split(":")[-1]
    vs = [v for v in s["variants"] if (sid, v["file"].split("__v")[-1].split(".")[0]) not in drop]
    for v in s["variants"]:
        if v not in vs:
            os.remove(os.path.join(d, "cut", v["file"]))
    if vs:
        s["variants"] = vs
        kept.append(s)
meta["seats"] = kept
json.dump(meta, open(os.path.join(d, "seats.json"), "w"), indent=1)
print("seats", len(kept), "variants", sum(len(s["variants"]) for s in kept))
