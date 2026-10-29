"""Cast people into every spot of a room from the spot's own tags: pose (stand/sit), facing, seat and what covers them
pick a natural pose; the place's dress level picks an outfit whose parts exist on that body; skin, hair and every
garment color vary per person. Writes a SCENE.json for scene_people.py.
usage: python3 autocast.py SPOTS.json ROOM.jpg OUT_SCENE.json [SEED] [MAX_PEOPLE] [MIN_HEADWIDTH]"""
import sys, json, random, os

WD = 'art/wardrobe'
IDX = json.load(open(f'{WD}/index.json'))['poses']
OUT = json.load(open(f'{WD}/outfits.json'))['outfits']
SKIN = [[245, 215, 190], [232, 190, 160], [222, 175, 140], [210, 160, 125], [198, 140, 105], [175, 120, 88], [150, 100, 72], [120, 82, 60], [100, 68, 50], [80, 54, 40]]
HAIR = [[25, 20, 18], [45, 32, 25], [70, 50, 35], [100, 70, 45], [140, 95, 55], [180, 140, 80], [200, 170, 110], [120, 120, 120], [175, 175, 170], [110, 40, 30]]
GARMENT = {'shirt': [[236, 236, 232], [200, 210, 230], [170, 50, 45], [60, 90, 140], [60, 110, 80], [200, 160, 60], [235, 230, 215], [90, 90, 95], [150, 60, 60], [40, 90, 160]],
           'jacket': [[40, 44, 58], [60, 60, 65], [120, 90, 70], [70, 100, 90], [130, 60, 80], [40, 60, 110], [200, 120, 40], [90, 85, 70]],
           'pants': [[40, 44, 58], [55, 70, 105], [190, 170, 130], [80, 80, 95], [90, 85, 70], [35, 40, 60], [150, 140, 110]],
           'shoes': [[30, 24, 22], [90, 55, 35], [230, 230, 225], [60, 45, 40], [200, 60, 60], [110, 75, 45]],
           'tie': [[140, 30, 40], [40, 60, 120], [60, 100, 70], [120, 100, 40]], 'dress': [[40, 60, 110], [130, 40, 50], [60, 100, 80], [30, 30, 35]]}
MUTED = {'jacket': [[40, 44, 58], [60, 60, 65], [30, 30, 35], [85, 70, 60], [70, 75, 85], [50, 60, 80]], 'pants': [[40, 44, 58], [60, 60, 65], [30, 30, 35], [70, 75, 85]],
         'shirt': [[236, 236, 232], [200, 210, 230], [225, 225, 220], [180, 195, 215]], 'shoes': [[30, 24, 22], [60, 40, 30]], 'dress': [[40, 60, 110], [30, 30, 35], [100, 30, 40], [60, 60, 65]]}
DRESS = {'formal': ['suit', 'skirt-suit'], 'business': ['business', 'office', 'dress-blazer', 'suit'],
         'casual': ['tee-jeans', 'polo-khakis', 'sweater-chinos', 'cardigan', 'zip-jacket', 'blazer-jeans', 'office']}

def poses_for(tags, crowd=False):
    """crowd: the room has a speaker, so its unassigned standing spots are an audience (clapping, cheering, a sign)."""
    f = tags.get('facing', 0); pose = tags.get('pose', 'stand'); cov = tags.get('coveredBy', 'none')
    if pose == 'sit':
        if abs(f) >= 150: c = ['nat-b2']
        elif cov in ('desk', 'table', 'counter'): c = ['nat-c2', 'nat-c3', 'nat-c4']
        elif tags.get('seat') in ('bench', 'bleacher', 'pew'): c = ['nat-c5', 'nat-c1', 'nat-c3']
        else: c = ['nat-c1', 'nat-c3', 'nat-c1']
    elif pose == 'lectern': c = ['nat-l1', 'nat-s7', 'nat-s3']
    elif crowd and not tags.get('role'):                          # an audience: most react, a few just watch
        if abs(f) >= 150: c = ['nat-r5', 'nat-r5', 'nat-r5', 'nat-b1', 'nat-t1']
        else: c = ['nat-r1', 'nat-r2', 'nat-r3', 'nat-r1', 'nat-r2', 'nat-s4', 'nat-s1']
    else:
        if abs(f) >= 150: c = ['nat-b1', 'nat-t1']
        elif f == 0: c = ['nat-s1', 'nat-s4', 'nat-s7', 'nat-s1-old']
        else: c = ['nat-s2', 'nat-s3', 'nat-s4', 'nat-s5', 'nat-p1', 'nat-s6']
    return [p for p in c if os.path.exists(f'{WD}/{p}/parts.json')]

def usable(outfit, have):
    return all((f'{k}-{n}' in have) or (n == 1 and k in ('shirt', 'pants', 'shoes')) for k, n in outfit['parts'].items())

if __name__ == '__main__':
    spots_p, room_p, out_p = sys.argv[1:4]
    rng = random.Random(f"{os.path.basename(spots_p)}-{sys.argv[4] if len(sys.argv) > 4 else 1}")   # every room casts differently
    maxp = int(sys.argv[5]) if len(sys.argv) > 5 else 99; minhw = float(sys.argv[6]) if len(sys.argv) > 6 else 9
    S = json.load(open(spots_p)); people = []; used = set()
    crowd = any((sp.get('tags') or {}).get('role') == 'speaker' for sp in S['spots'])
    order = sorted(range(len(S['spots'])), key=lambda i: -S['spots'][i]['headWidth'])
    for i in order[:maxp]:
        sp = S['spots'][i]; tags = sp.get('tags', {'pose': sp.get('pose', 'stand'), 'facing': 0})
        if sp['headWidth'] < minhw or sp.get('touching'): continue
        cands = poses_for(tags, crowd)
        if not cands: continue
        for _ in range(12):                                       # no two people in a room share body and hair
            pose = rng.choice(cands); sex = rng.choice('fm'); build = rng.choice(['slim', 'medium', 'medium', 'heavy'])
            if (sex, build, pose) not in used: break
        used.add((sex, build, pose))
        meta = json.load(open(f'{WD}/{pose}/parts.json')); fid = f'v2-{pose}-{sex}-{build}'
        have = set(meta['figures'][fid]['parts'])
        names = DRESS.get(tags.get('dress', 'casual'), DRESS['casual'])
        fits = [o for o in OUT if o['id'] in names and sex in o['sexes'] and usable(o, have)]
        if not fits: fits = [o for o in OUT if o['id'] in DRESS['casual'] and sex in o['sexes'] and usable(o, have)]   # never work clothes by accident
        if not fits: continue                                                  # a pose still being painted has too few pieces for any outfit
        o = rng.choice(fits)
        muted = o['formality'] in ('formal', 'business')                       # suits and blazers at work come in muted colors
        pal = lambda k: (MUTED.get(k) if muted and k in MUTED else GARMENT.get(k, GARMENT['shirt']))
        colors = {k: rng.choice(pal(k)) for k in o['parts']}
        for a, b in [tuple(x) for x in o.get('sameColor', []) and [o['sameColor']]]: colors[b] = colors[a]
        hairs = [n for n in range(1, 13) if f'hair-{n}' in have]
        hc = rng.choice([[120, 120, 120], [175, 175, 170], [215, 215, 210]] if IDX[pose].get('ageBand') == 'older' else HAIR)   # older adults go gray
        people.append({'spot': i, 'pose': pose, 'fig': f'{sex}-{build}', 'outfit': o['id'], 'colors': colors, 'skin': rng.choice(SKIN),
                       'hair': [rng.choice(hairs), hc] if hairs else None})
    json.dump({'spots': spots_p, 'room': room_p, 'wardrobe': WD, 'outfits': f'{WD}/outfits.json', 'people': people}, open(out_p, 'w'), indent=1)
    print(out_p, len(people), 'people')
