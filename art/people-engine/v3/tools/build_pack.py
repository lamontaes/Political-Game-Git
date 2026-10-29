"""Build people pack v3: every figure as finished images plus one manifest.json the game reads.

Two kinds of figure, both drawn whole with the person's own painted face:
- "kit": everyday clothes as stacked parts (body, shoes, trousers, top, hair, phone), each part
  recolorable through its tone map; colors come from the person's palettes.
- "look": a whole outfit drawn by Firefly (suits, pantsuits, blazers), one PNG, never recolored.
Adding clothes: add folders and rows. A new set: build pack v4 into its own folder and switch the
game's PEOPLE_PACK setting."""
import json, os, shutil, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SC = os.path.join(HERE, '..')
sys.path.insert(0, os.path.join(SC, 'looks'))
sys.path.insert(0, os.path.join(SC, 'build-rally'))
from lift import lift

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'v3')
PEOPLE = ['woman-medium', 'woman-slim', 'woman-heavy', 'man-medium', 'man-slim', 'man-heavy']
AB = {'woman-medium': 'wm', 'woman-slim': 'ws', 'woman-heavy': 'wh', 'man-medium': 'mm', 'man-slim': 'ms', 'man-heavy': 'mh'}

# what each drawn pose is: (kind, seat, facing degrees; minus = turned toward screen-left, 180 = back)
RALLY = {
    'back, clapping, turned right': ('clap', 'none', 135), 'back, clapping, turned left': ('clap', 'none', -135),
    'back, fist raised': ('fist', 'none', 180), 'back, filming, turned right': ('film', 'none', 135),
    'back, filming, turned left': ('film', 'none', -135), 'back, arms folded, turned left': ('fold', 'none', -135),
    'back, hand on hip, turned right': ('hip', 'none', 135), 'back, hand on hip': ('hip', 'none', 180),
    'back, hands in pockets, turned right': ('pockets', 'none', 135), 'back, hands in pockets': ('pockets', 'none', 180),
    'front, clapping, turned right': ('clap', 'none', 45), 'front, clapping, turned right (2)': ('clap', 'none', 45),
    'front, clapping, turned left': ('clap', 'none', -45), 'front, clapping and talking, turned right': ('clap', 'none', 45),
    'front, arms folded, turned right': ('fold', 'none', 45), 'front, speaking': ('speak', 'none', 0)}
P2 = [('write', 'desk-chair', -45), ('talk', 'chair', 45), ('listen', 'chair', -45), ('watch', 'couch', 135), ('lean', 'stool', -90),
      ('walk', 'none', -45), ('walk', 'none', 45), ('wave', 'none', 0), ('phone', 'none', 45), ('lectern', 'none', 0)]
ADDRESS = [('address', 'desk-chair', 0)] * 5
LOOKS = {'man': {'suitnavy': ('navy suit, red tie', 'formal'), 'suitcharcoal': ('charcoal suit, blue tie', 'formal'), 'blazer': ('navy blazer, open collar', 'business')},
         'woman': {'pantsuitnavy': ('navy pantsuit', 'formal'), 'pantsuitblack': ('black pantsuit', 'formal'), 'blazercamel': ('camel blazer', 'business')}}
SKIP = {('woman-medium', 'blazercamel', 0): 'drawn standing, not seated', ('woman-heavy', 'pantsuitblack', 1, 0): 'cut off',
        ('man-heavy', 'address'): 'a desk line is drawn across'}


BAD_SPLITS = {'woman-slim-2': 'the split put body into the trousers part; redo', 'man-medium-2': 'the split put body into the trousers part; redo'}


def face_side(rgba, top, stature):
    """Which way the face points: +1 toward screen-right, -1 toward screen-left, 0 unsure.
    The face (skin) sits toward the side the head is turned; the hair toward the other."""
    from colors import to_lab
    a = np.asarray(rgba)
    band = a[top:top + int(0.12 * stature)]
    op = band[..., 3] > 200
    lab = to_lab(band[..., :3])
    skin = op & (lab[..., 1] > 8) & (lab[..., 2] > 10) & (lab[..., 0] > 30)
    if skin.sum() < 0.15 * op.sum() or op.sum() == 0:
        return 0
    ys, xs = np.nonzero(op); sy, sx = np.nonzero(skin)
    w = xs.max() - xs.min() + 1
    dx = (sx.mean() - xs.mean()) / w
    return 1 if dx > 0.035 else -1 if dx < -0.035 else 0


def fix_facing(facing, rgba, m):
    if facing in (0, 180) or abs(facing) == 135:
        return facing
    side = face_side(rgba, m['head']['top'], m['stature'])
    if not side and m['stature'] < 0.85 * m['size'][1] + 1e9:
        # seated: the knees and feet point the way the body is turned
        dxf = m['feet']['x'] - m['head']['x']
        if abs(dxf) > 0.12 * m['head']['width'] * 3:
            side = 1 if dxf > 0 else -1
    return abs(facing) * side if side else facing


def metrics(rgba):
    a = np.asarray(rgba)[..., 3] > 128
    rows = np.nonzero(a.any(1))[0]
    w = a.sum(1)
    top = int(next(r for r in rows if w[r] > 0.18 * w.max()))
    feet = int(rows.max())
    hrow = int(top + 0.05 * (feet - top))
    xs = np.nonzero(a[hrow])[0]
    runs = np.split(xs, np.nonzero(np.diff(xs) > 2)[0] + 1) if len(xs) else [np.array([rgba.width // 2])]
    txs = np.nonzero(a[top:top + 6].any(0))[0]
    cx = float(txs.mean()) if len(txs) else rgba.width / 2
    run = min(runs, key=lambda r: abs(r.mean() - cx))
    fxs = np.nonzero(a[max(0, feet - 4):feet + 1].any(0))[0]
    return dict(size=[rgba.width, rgba.height], head={'top': top, 'x': round(float(run.mean()), 1), 'width': int(run.max() - run.min())},
                feet={'x': round(float(fxs.mean()), 1) if len(fxs) else rgba.width / 2, 'y': feet}, stature=feet - top)


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    man = {'pack': 'v3', 'about': __doc__.strip(), 'stack': ['body', 'shoes', 'trousers', 'top', 'hair', 'phone'],
           'recolor': 'tools/engine.py recolor_lab: CIE L* offsets from the part tone map; see README', 'people': [], 'figures': [], 'skipped': []}
    kit_root = os.path.join(SC, 'build-rally', 'kit')
    for p in PEOPLE:
        sex = p.split('-')[0]
        meta1 = json.load(open(os.path.join(kit_root, p, 'meta.json')))
        man['people'].append({'id': p, 'sex': sex, 'build': p.split('-')[1], 'palettes': meta1.get('palettes', {}),
                              'tones': meta1['tones'], 'skin': meta1['poses'][0]['refs']['skin'][1], 'hair': meta1['poses'][0]['refs']['hair']})
        # everyday clothes, parts (rally poses, then the second sheet)
        for src, labels in ((p, None), (p + '-2', P2)):
            mdir = os.path.join(kit_root, src)
            if not os.path.isdir(mdir):
                continue
            if src in BAD_SPLITS:
                man['skipped'].append({'kit': src, 'why': BAD_SPLITS[src]}); continue
            meta = json.load(open(os.path.join(mdir, 'meta.json')))
            for q in meta['poses']:
                k = q['k']
                kind, seat, facing = RALLY.get(q['pose'], ('stand', 'none', 0)) if labels is None else labels[k]
                fid = f"{p}/kit/{'r' if labels is None else 's'}{k:02d}"
                dst = os.path.join(OUT, 'people', fid)
                os.makedirs(dst)
                parts = {}
                for f in sorted(os.listdir(os.path.join(mdir, str(k)))):
                    shutil.copy(os.path.join(mdir, str(k), f), dst)
                    if f.endswith('.png') and not f.endswith('_tone.png'):
                        n = f[:-4]
                        parts[n] = {'file': f'people/{fid}/{f}', 'tone': f'people/{fid}/{n}_tone.png' if os.path.exists(os.path.join(dst, n + '_tone.png')) else None}
                body = Image.open(os.path.join(dst, 'body.png'))
                stack = Image.new('RGBA', body.size)
                for n in man['stack']:
                    fp = os.path.join(dst, n + '.png')
                    if os.path.exists(fp):
                        stack.alpha_composite(Image.open(fp).convert('RGBA'))
                m = metrics(stack)
                facing = fix_facing(facing, stack, m)
                man['figures'].append({'id': fid, 'person': p, 'kind': 'kit', 'pose': kind, 'seat': seat, 'facing': facing,
                                       'dress': 'casual', 'outfit': 'everyday', 'parts': parts, 'label': q['pose'], **m})
        # whole formal looks
        for look, (desc, dress) in LOOKS[sex].items():
            for row in (0, 1):
                sheet = os.path.join(SC, 'formal', f'{AB[p]}-{look}-p2r{row}.png')
                if (p, look, row) in SKIP or not os.path.exists(sheet):
                    man['skipped'].append({'sheet': os.path.basename(sheet), 'why': SKIP.get((p, look, row), 'missing')})
                    continue
                for k, f in enumerate(lift(sheet)):
                    if (p, look, row, k) in SKIP:
                        man['skipped'].append({'sheet': os.path.basename(sheet), 'figure': k, 'why': SKIP[(p, look, row, k)]}); continue
                    kind, seat, facing = P2[row * 5 + k]
                    fid = f'{p}/look/{look}/{"s" if True else ""}{row * 5 + k:02d}'
                    os.makedirs(os.path.join(OUT, 'people', os.path.dirname(fid)), exist_ok=True)
                    f['img'].save(os.path.join(OUT, 'people', fid + '.png'))
                    mm_ = metrics(f['img'])
                    man['figures'].append({'id': fid, 'person': p, 'kind': 'look', 'pose': kind, 'seat': seat, 'facing': fix_facing(facing, f['img'], mm_), 'dress': dress,
                                           'outfit': look, 'outfitLabel': desc, 'file': f'people/{fid}.png', **mm_})
        sheet = os.path.join(SC, 'formal', f'{AB[p]}-address.png')
        if (p, 'address') in SKIP:
            man['skipped'].append({'sheet': os.path.basename(sheet), 'why': SKIP[(p, 'address')]})
        elif os.path.exists(sheet):
            look = 'suitnavy' if sex == 'man' else 'pantsuitnavy'
            for k, f in enumerate(lift(sheet)):
                fid = f'{p}/look/address/a{k:02d}'
                os.makedirs(os.path.join(OUT, 'people', os.path.dirname(fid)), exist_ok=True)
                f['img'].save(os.path.join(OUT, 'people', fid + '.png'))
                man['figures'].append({'id': fid, 'person': p, 'kind': 'look', 'pose': 'address', 'seat': 'desk-chair', 'facing': 0, 'dress': 'formal',
                                       'outfit': look, 'file': f'people/{fid}.png', 'handsRestOnDesk': True, **metrics(f['img'])})
    tools = os.path.join(OUT, 'tools'); os.makedirs(tools)
    for f in ['engine.py', 'colors.py', 'export_kit.py', 'kit_check.py', 'master.py', 'kit.py']:
        shutil.copy(os.path.join(SC, 'build-rally', f), tools)
    shutil.copy(os.path.join(SC, 'looks', 'lift.py'), tools)
    shutil.copy(os.path.join(SC, 'intro', 'mannequins.py'), tools)
    shutil.copy(os.path.abspath(__file__), tools)
    json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    kinds = {}
    for f in man['figures']:
        kinds[(f['kind'], f['dress'])] = kinds.get((f['kind'], f['dress']), 0) + 1
    print(len(man['figures']), 'figures', kinds, 'skipped', len(man['skipped']))


if __name__ == '__main__':
    main()
