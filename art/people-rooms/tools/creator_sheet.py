"""The character creator's arrows on one body: each row changes one thing (hair, shirt, jacket, pants, shoes, skin, colors)
while everything else stays, the way clicking an arrow swaps one picture for the next.
usage: python3 creator_sheet.py WARDROBE_POSE_DIR FIGURE OUT.jpg   (FIGURE like f-medium)"""
import sys, os, json
from PIL import Image, ImageDraw
from stack import person

d, fig, out = sys.argv[1:4]
meta = json.load(open(f'{d}/parts.json')); pose = meta['sheet']; fid = f'v2-{pose}-{fig}'; info = meta['figures'][fid]
have = set(info['parts'])
base = {'skin': [198, 140, 105], 'hair': [2, [60, 42, 30]], 'parts': {'pants': [1, [55, 60, 75]], 'shoes': [1, [35, 28, 25]], 'shirt': [1, [225, 228, 232]]}}
SK = [[245, 215, 190], [232, 190, 160], [210, 160, 125], [198, 140, 105], [160, 110, 80], [120, 82, 60], [90, 60, 45], [60, 40, 30]]
COL = [[170, 50, 45], [40, 90, 160], [60, 110, 80], [200, 160, 60], [120, 70, 130], [230, 230, 225], [40, 40, 45], [200, 120, 40]]
HC = [[25, 20, 18], [60, 42, 30], [120, 80, 50], [180, 140, 80], [200, 170, 110], [150, 150, 150], [90, 30, 25], [230, 225, 215]]
def variant(**kw):
    o = json.loads(json.dumps(base))
    for k, v in kw.items():
        if k in ('skin', 'hair'): o[k] = v
        else: o['parts'][k] = v
    return o
rows = [('hair', [variant(hair=[n, HC[n % 8]]) for n in range(1, 13) if f'hair-{n}' in have]),
        ('shirt', [variant(shirt=[n, COL[n % 8]]) for n in range(1, 7) if n == 1 or f'shirt-{n}' in have]),
        ('jacket', [variant(jacket=[n, COL[(n + 3) % 8]]) for n in range(1, 6) if f'jacket-{n}' in have] + ([variant(tie=[1, [140, 30, 40]], jacket=[1, [40, 44, 58]], pants=[1, [40, 44, 58]])] if 'tie-1' in have else [])),
        ('pants', [variant(pants=[n, COL[(n + 1) % 8]]) for n in range(1, 7) if n == 1 or f'pants-{n}' in have]),
        ('shoes', [variant(shoes=[n, COL[(n + 5) % 8]]) for n in range(1, 7) if n == 1 or f'shoes-{n}' in have]),
        ('skin', [variant(skin=s) for s in SK]),
        ('dress', [variant(dress=[1, c], shirt=None, pants=None, shoes=[6 if 'shoes-6' in have else 1, [40, 30, 30]]) for c in COL[:4]] if 'dress-1' in have else [])]
X0, Y0, X1, Y1 = info['box']; cw, ch = X1 - X0, Y1 - Y0
rows = [(n, vs) for n, vs in rows if vs]; ncol = max(len(vs) for _, vs in rows)
sheet = Image.new('RGB', (cw * ncol + 120, ch * len(rows)), (214, 205, 188)); dr = ImageDraw.Draw(sheet)
for r, (name, vs) in enumerate(rows):
    dr.text((10, r * ch + ch // 2), name, fill=(40, 30, 20))
    for c, o in enumerate(vs):
        o['parts'] = {k: v for k, v in o['parts'].items() if v}
        img, _ = person(d, fid, info, o); sheet.paste(img, (120 + c * cw, r * ch), img)
sheet.save(out, quality=90); print(out, sheet.size)
