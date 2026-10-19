"""Tag variants with an activity (e.g. reading): the game uses them only when the simulation's act calls for it.
usage: tag_seats.py OUTDIR ACTIVITY s0v1,s2v3,..."""
import json, os, sys
d, act, tags = sys.argv[1], sys.argv[2], set(sys.argv[3].split(","))
meta = json.load(open(os.path.join(d, "seats.json")))
n = 0
for s in meta["seats"]:
    sid = "s" + s["id"].split(":")[-1]
    for v in s["variants"]:
        if sid + "v" + v["file"].split("__v")[-1].split(".")[0] in tags:
            v["activity"] = act; n += 1
json.dump(meta, open(os.path.join(d, "seats.json"), "w"), indent=1)
print("tagged", n)
