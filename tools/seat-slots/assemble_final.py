"""Copy each room's chosen seat set into final2/<place>, midday cut-outs only (light copies are remade)."""
import json, os, shutil, sys
R = [("us-senate-floor", "sen-final2"), ("us-house-floor", "s-ush"), ("state-house-chamber", "s-sth"),
     ("state-legislative-chamber-unicameral", "s-uni"), ("state-legislative-chamber-bicameral", "bic-final"),
     ("council-chamber", "cc-final"), ("council-chamber-large", "ccl-final"), ("council-chamber-small", "ccs-final"),
     ("county-commission", "cco-final"), ("county-commission-rural", "ccr-final"), ("public-meeting-room", "pmr-final"),
     ("school-board-room", "sbr-final")]
root = sys.argv[1]
os.makedirs(root, exist_ok=False)
for place, src in R:
    s = f"seats/{src}/out"; d = f"{root}/{place}"
    os.makedirs(f"{d}/cut")
    m = json.load(open(f"{s}/seats.json"))
    for seat in m["seats"]:
        for v in seat["variants"]:
            v.pop("lights", None)
            shutil.copy(f"{s}/cut/{v['file']}", f"{d}/cut/{v['file']}")
    json.dump(m, open(f"{d}/seats.json", "w"), indent=1)
    print(place, len(m["seats"]), sum(len(x["variants"]) for x in m["seats"]))
