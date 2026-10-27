"""Give every measured spot the shared tags from its scene's zones.
usage: python3 tag_spots.py SCENE.tags.json SPOTS.json OUT.json
A scene tags file has 'defaults' (camera, facing, seat, ...) and 'zones': boxes [x0, y0, x1, y1]
in the painting's pixels with the tags for any spot whose head falls inside. The first zone that
holds the head wins. Facing: 0 camera, +-45 three-quarter, +-90 profile, 180 back; minus = screen left."""
import sys, json
tags, spots, out = sys.argv[1:4]
T = json.load(open(tags)); S = json.load(open(spots))
for s in S['spots']:
    t = dict(T['defaults']); t['pose'] = s['pose']
    hx, hy = s['headX'], s['headTop'] + 0.5 * s['headWidth']
    for z in T['zones']:
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
