"""One row per pose sheet: the five used angles side by side, labeled, for checking facing by eye.
python3 check_lib.py out.jpg pose [pose...]   (poses = file names in mqlib/ without .png)"""
import sys
from PIL import Image, ImageDraw
import template as T

ROW_H = 360
out, poses = sys.argv[1], sys.argv[2:]
rows = []
for p in poses:
    c = T.library(p)
    cells = []
    for a in T.STRIP:
        if a not in c:
            cells.append(Image.new('RGB', (150, ROW_H), (255, 200, 200)))
            continue
        im = c[a]; k = (ROW_H - 30) / im.height
        im = im.resize((int(im.width * k), ROW_H - 30), Image.LANCZOS)
        cell = Image.new('RGB', (max(im.width, 150) + 16, ROW_H), 'white')
        cell.paste(im, (8, 30), im)
        ImageDraw.Draw(cell).text((8, 6), a, fill='black')
        cells.append(cell)
    row = Image.new('RGB', (sum(x.width for x in cells) + 120, ROW_H), 'white')
    ImageDraw.Draw(row).text((6, ROW_H // 2), p, fill='black')
    x = 120
    for cell in cells:
        row.paste(cell, (x, 0)); x += cell.width
    rows.append(row)
W = max(r.width for r in rows)
sheet = Image.new('RGB', (W, ROW_H * len(rows)), 'white')
for i, r in enumerate(rows):
    sheet.paste(r, (0, i * ROW_H))
sheet.save(out, quality=88)
