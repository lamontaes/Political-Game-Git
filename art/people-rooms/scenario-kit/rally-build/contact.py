import sys; sys.path.insert(0, '.')
from kit import Person
from PIL import Image, ImageDraw
import numpy as np
name, out = sys.argv[1], sys.argv[2]
p = Person(name)
cells = []
for i, f in enumerate(p.figures):
    x0, y0, x1, y1 = f['box']
    c = Image.fromarray(p.src[y0:y1, x0:x1]).convert('RGB')
    c.thumbnail((260, 300))
    cell = Image.new('RGB', (270, 330), (255, 255, 255)); cell.paste(c, (5, 25))
    ImageDraw.Draw(cell).text((8, 4), '%d' % i, fill=(200, 0, 0))
    cells.append(cell)
W = Image.new('RGB', (270 * 6, 330 * ((len(cells) + 5) // 6)), (255, 255, 255))
for i, c in enumerate(cells): W.paste(c, ((i % 6) * 270, (i // 6) * 330))
W.save(out, quality=88)
