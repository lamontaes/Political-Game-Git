import sys, json
from PIL import Image, ImageDraw
out = []
for j in sys.argv[2:]:
    d = json.load(open(j)); im = Image.open(d['plate']).convert('RGB').resize(tuple(d['size']))
    dr = ImageDraw.Draw(im)
    for i, s in enumerate(d['spots']):
        l, t, r, b = s['box']; c = (255, 40, 200) if s['pose'] == 'stand' else (255, 160, 0)
        dr.rectangle([l, t, r, b], outline=c, width=2); dr.text((l + 2, t + 2), str(i), fill=c)
    out.append(im)
W = max(i.width for i in out); H = sum(i.height for i in out)
o = Image.new('RGB', (W, H)); y = 0
for i in out: o.paste(i, (0, y)); y += i.height
o.save(sys.argv[1], quality=85); print(o.size)
