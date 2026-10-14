"""Pack a finished seat-slot build into sprite sheets for the game: one sheet per light (midday plus the light
copies), every sheet with the same layout, 128 colors. seats.json gets each variant's rectangle in the sheet and
where it goes on the place painting in each light.
usage: pack_atlas.py OUT_DIR DEST_DIR"""
import json, os, shutil, sys
from PIL import Image
src, dest = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(src, "seats.json")))
lights = sorted({l for s in meta["seats"] for v in s["variants"] for l in v.get("lights", {})})
items = []
for s in meta["seats"]:
    for v in s["variants"]:
        im = Image.open(os.path.join(src, "cut", v["file"]))
        items.append((s, v, im.width, im.height))
# shelf packing, tallest first, sheet width 2048
SW, pad = 2048, 2
order = sorted(range(len(items)), key=lambda i: -items[i][3])
x = y = shelf = 0
rects = {}
for i in order:
    w, h = items[i][2], items[i][3]
    if x + w + pad > SW:
        x, y, shelf = 0, y + shelf + pad, 0
    rects[i] = (x, y, w, h)
    x += w + pad; shelf = max(shelf, h)
SH = y + shelf
os.makedirs(dest, exist_ok=True)
if not items:
    raise ValueError("Cannot pack a room with no accepted people")
if any(len(s['variants']) < 3 for s in meta['seats']):
    raise ValueError("Every chair needs at least three accepted people before packing")
place = meta["place"]
out = {"place": place, "plate": meta["plate"], "width": meta["width"], "height": meta["height"],
       "sheets": {"midday": f"{place}__seats__midday.png", **{l: f"{place}__seats__{l}.png" for l in lights}}, "seats": []}
for light in ["midday"] + lights:
    sheet = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    for i, (s, v, w, h) in enumerate(items):
        fn = v["file"] if light == "midday" else v["lights"][light]["file"]
        sheet.paste(Image.open(os.path.join(src, "cut", fn)).convert("RGBA"), rects[i][:2])
    q = sheet.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save(os.path.join(dest, out["sheets"][light]), optimize=True)
k = 0
for s in meta["seats"]:
    vs = []
    for v in s["variants"]:
        i = next(j for j, it in enumerate(items) if it[1] is v)
        rx, ry, w, h = rects[i]
        at = {"midday": [v["left"], v["top"]], **{l: [v["lights"][l]["left"], v["lights"][l]["top"]] for l in lights}}
        vs.append({"rect": [rx, ry, w, h], "at": at, "bottom": v["bottom"], "activity": v.get("activity", "plain"),
                   "chair": s["chair"], "head": v.get("head", s["head"])})
    out["seats"].append({"id": s["id"], "chair": s["chair"], "head": s["head"], "variants": vs})
json.dump(out, open(os.path.join(dest, "seats.json"), "w"), separators=(",", ":"))
tot = sum(os.path.getsize(os.path.join(dest, f)) for f in os.listdir(dest))
print(place, "sheet", SW, "x", SH, "lights", ["midday"] + lights, "variants", len(items), "MB", round(tot / 1e6, 2))
