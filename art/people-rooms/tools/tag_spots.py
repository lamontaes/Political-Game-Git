"""Give every measured spot the shared tags from its scene's zones.
usage: python3 tag_spots.py SCENE.tags.json SPOTS.json OUT.json
A scene tags file has 'defaults' (camera, facing, seat, ...) and 'zones': boxes [x0, y0, x1, y1]
in the painting's pixels with the tags for any spot whose head falls inside. The first zone that
holds the head wins; a zone with "drop": true removes what it holds (stray legs or hands), and "merge": true joins the pieces inside it into one person. Facing: 0 camera, +-45 three-quarter, +-90 profile, 180 back; minus = screen left."""
import sys, json
tags, spots, out = sys.argv[1:4]
T = json.load(open(tags)); S = json.load(open(spots))
def zone_of(s):
    hx, hy = s['headX'], s['headTop'] + 0.5 * s['headWidth']
    return next((z for z in T['zones'] if z['box'][0] <= hx <= z['box'][2] and z['box'][1] <= hy <= z['box'][3]), None)
S['spots'] = [s for s in S['spots'] if not (zone_of(s) or {}).get('drop')]
# a 'merge' zone joins the pieces of one person that a thin line (a microphone, a rail) split apart:
# the top piece gives the head, the biggest piece gives the front line
for z in [z for z in T['zones'] if z.get('merge')]:
    x0, y0, x1, y1 = z['box']
    inside = [s for s in S['spots'] if x0 <= (s['box'][0] + s['box'][2]) / 2 <= x1 and y0 <= (s['box'][1] + s['box'][3]) / 2 <= y1]
    if len(inside) < 2: continue
    top = min(inside, key=lambda s: s['headTop']); big = max(inside, key=lambda s: s['pixels'])
    m = dict(big); m.update({k: top[k] for k in ('headTop', 'headX', 'headWidth')})
    m['box'] = [min(s['box'][0] for s in inside), min(s['box'][1] for s in inside), max(s['box'][2] for s in inside), max(s['box'][3] for s in inside)]
    m['pixels'] = sum(s['pixels'] for s in inside); m['merged'] = len(inside)
    S['spots'] = [s for s in S['spots'] if s not in inside] + [m]   # a 'drop' zone removes stray pieces (legs under chairs, hands)
for s in S['spots']:
    t = dict(T['defaults']); t['pose'] = s['pose']
    hx, hy = s['headX'], s['headTop'] + 0.5 * s['headWidth']
    for z in T['zones']:
        if z.get('merge') or z.get('drop'): continue
        x0, y0, x1, y1 = z['box']
        if x0 <= hx <= x1 and y0 <= hy <= y1:
            t.update({k: v for k, v in z.items() if k not in ('box', 'name')}); t['zone'] = z['name']; break
    t['size'] = {'headWidth': s['headWidth'], 'height': s['box'][3] - s['box'][1]}
    if s.get('touching'): t['check'] = 'two people touching; split or use one'
    s['tags'] = t
S['scene'] = T['scene']
json.dump(S, open(out, 'w'), indent=1)
from collections import Counter
print(T['scene'], len(S['spots']), 'spots;', dict(Counter((s['tags'].get('zone', '-'), s['tags']['pose'], s['tags']['facing']) for s in S['spots'])))
