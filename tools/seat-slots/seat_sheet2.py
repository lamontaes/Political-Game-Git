"""Bigger review sheet: each variant over gray, scaled up so two-person cuts and slivers show. seat_sheet2.py DIR [page]"""
import json, sys
from PIL import Image, ImageDraw
D = sys.argv[1]; meta = json.load(open(D + "/out/seats.json"))
cells = [(s["id"].split(":")[-1], v) for s in meta["seats"] for v in s["variants"]]
cw, ch, cols, per = 150, 200, 11, 66
page = int(sys.argv[2]) if len(sys.argv) > 2 else 0
cells = cells[page * per:(page + 1) * per]
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cw * cols, ch * rows), (40, 40, 48)); d = ImageDraw.Draw(sheet)
for i, (sid, v) in enumerate(cells):
    im = Image.open(D + "/out/cut/" + v["file"]).convert("RGBA")
    s = min((cw - 6) / im.width, (ch - 18) / im.height, 3.0)
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
    x, y = (i % cols) * cw, (i // cols) * ch
    bg = Image.new("RGBA", im.size, (170, 175, 185, 255)); bg.alpha_composite(im)
    sheet.paste(bg.convert("RGB"), (x + 3, y + 15)); d.text((x + 3, y + 1), f"s{sid}v{v['file'].split('__v')[-1].split('.')[0]}", fill=(255, 255, 0))
sheet.save(f"{D}/sheet2-{page}.jpg", quality=88); print(sheet.size, len(cells))
