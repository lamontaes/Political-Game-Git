"""Renders for the review page from the packed sprite sheets: full, about a third, and the night light."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_atlas import render
from PIL import Image
PLACES = [("us-senate-floor", "U.S. Senate"), ("us-house-floor", "U.S. House"), ("state-house-chamber", "State House"),
          ("state-legislative-chamber-unicameral", "Unicameral legislature"), ("state-legislative-chamber-bicameral", "State legislature (bicameral)"),
          ("council-chamber", "City council"), ("council-chamber-large", "City council, large"), ("council-chamber-small", "City council, small"),
          ("county-commission", "County commission"), ("county-commission-rural", "County commission, rural"),
          ("public-meeting-room", "Public meeting room"), ("school-board-room", "School board")]
stats = []
for p, name in PLACES:
    pack = f"pack3/{p}"
    if not os.path.exists(f"{pack}/seats.json"): continue
    meta = json.load(open(f"{pack}/seats.json"))
    for tag, light, share, seed in [("full", "midday", 1.0, 1), ("third", "midday", 0.33, 7), ("night", "night" if "night" in meta["sheets"] else "midday", 0.6, 3)]:
        out = f"seatpage/img/{p}__{tag}.jpg"
        render(pack, f"backdrops/{p}__{light}.jpg", light, share, seed, out)
        im = Image.open(out); im.resize((1254, 706), Image.LANCZOS).save(out, quality=84)
    stats.append({"place": p, "name": name, "seats": len(meta["seats"]), "variants": sum(len(s["variants"]) for s in meta["seats"]),
                  "lights": list(meta["sheets"])})
json.dump(stats, open("seatpage/stats.json", "w"), indent=1)
print(len(stats))
