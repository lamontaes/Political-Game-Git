"""Every pose dressed: for each pose, a woman and a man in an everyday outfit with hair, side by side, labeled.
usage: python3 allposes.py OUT.jpg"""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
from stack import person
WD = 'art/wardrobe'; IDX = json.load(open(f'{WD}/index.json'))['poses']
order = ['nat-s1','nat-s2','nat-s3','nat-s4','nat-s5','nat-s6','nat-s7','nat-l1','nat-p1','nat-r1','nat-r2','nat-r3','nat-c1','nat-c2','nat-c3','nat-c4','nat-c5','nat-p2','nat-t1','nat-b1','nat-b2','nat-r5','nat-s1-old']
LOOK = {'f': {'skin': [150, 100, 72], 'hair': [10, [30, 22, 18]], 'parts': {'shirt': [4, [60, 100, 80]], 'pants': [2, [55, 70, 105]], 'shoes': [2, [230, 230, 225]]}},
        'm': {'skin': [222, 175, 140], 'hair': [2, [120, 80, 50]], 'parts': {'shirt': [1, [200, 210, 230]], 'jacket': [2, [85, 70, 60]], 'pants': [3, [190, 170, 130]], 'shoes': [4, [60, 40, 30]]}}}
cells = []
for pose in order:
    if not os.path.exists(f'{WD}/{pose}/parts.json'): continue
    meta = json.load(open(f'{WD}/{pose}/parts.json'))
    if any(len(meta['figures'][f'v2-{pose}-{s}-medium']['parts']) < 25 for s in 'fm'): continue   # a pose still being painted isn't shown yet
    for sex in 'fm':
        fid = f'v2-{pose}-{sex}-medium'; info = meta['figures'][fid]; have = set(info['parts'])
        o = json.loads(json.dumps(LOOK[sex])); o['parts'] = {k: v for k, v in o['parts'].items() if v[0] == 1 and k in ('shirt','pants','shoes') or f'{k}-{v[0]}' in have}
        hairs = sorted(int(p[5:]) for p in have if p.startswith('hair-'))
        if hairs and f"hair-{o['hair'][0]}" not in have: o['hair'][0] = min(hairs, key=lambda n: abs(n - o['hair'][0]))   # nearest style painted for this pose
        if not hairs: o['hair'] = None
        if o['hair'] and IDX[pose].get('ageBand') == 'older': o['hair'][1] = [200, 200, 195]          # older adults go gray
        img, _ = person(f'{WD}/{pose}', fid, info, o); cells.append((pose, sex, img))
cw = max(c[2].width for c in cells); ch = max(c[2].height for c in cells) + 30; cols = 6
S = Image.new('RGB', (cw * cols, ch * ((len(cells) + cols - 1) // cols)), (214, 205, 188)); d = ImageDraw.Draw(S)
try: f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf', 20)
except Exception: f = ImageFont.load_default()
for i, (pose, sex, img) in enumerate(cells):
    x, y = (i % cols) * cw, (i // cols) * ch
    S.paste(img, (x + (cw - img.width) // 2, y + 30), img); d.text((x + 8, y + 4), f"{pose.replace('nat-','')} {sex}  facing {IDX[pose]['facing'][sex]}", fill=(40, 34, 28), font=f)
S.save(sys.argv[1], quality=86); print(S.size)
