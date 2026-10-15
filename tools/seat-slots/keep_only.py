"""Keep only the listed variants (s3v1,...) and drop everything else. usage: keep_only.py OUTDIR keep-list"""
import json, os, subprocess, sys
d, keep = sys.argv[1], set(sys.argv[2].split(","))
meta = json.load(open(os.path.join(d, "seats.json")))
drop = []
for s in meta["seats"]:
    sid = "s" + s["id"].split(":")[-1]
    for v in s["variants"]:
        tag = sid + "v" + v["file"].split("__v")[-1].split(".")[0]
        if tag not in keep: drop.append(tag)
print("dropping", len(drop))
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "curate_seats.py"), d, ",".join(drop)], check=True)
