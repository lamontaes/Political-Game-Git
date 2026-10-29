"""Correct head widths that the mannequin measure got wrong, in place, in spot files.
Only spots sized by head width are checked: seated ones and ones behind a stage, desk or counter (open standing spots
are sized by their full height). Two overlapping mannequins measure as one wide blob; a row of people behind a stage
at the same height in the picture stands at about the same distance, so their heads are about the same size. A head
more than 1.7 times the median of its own kind of spot within 15 px of its head top takes that median; the measured
value stays in headWidthMeasured. Merges only ever measure too wide, so only oversized heads change, in two passes so one
blob doesn't raise the median used for its neighbors.
usage: python3 fix_heads.py SPOTS.json...   (prints each change)"""
import sys, json, statistics

def head_sized(s):
    t = s.get('tags') or {}
    return t.get('pose', s.get('pose')) == 'sit' or t.get('coveredBy') not in (None, 'none')

for path in sys.argv[1:]:
    S = json.load(open(path)); sp = S['spots']
    measured = [s.get('headWidthMeasured', s['headWidth']) for s in sp]
    width = list(measured)
    for _ in range(2):
        for i, s in enumerate(sp):
            if not head_sized(s): continue
            kind = (s.get('tags') or {}).get('coveredBy')
            nb = [width[j] for j, o in enumerate(sp) if j != i and head_sized(o) and (o.get('tags') or {}).get('coveredBy') == kind
                  and abs(o['headTop'] - s['headTop']) <= 15]
            if len(nb) >= 3 and width[i] > 1.7 * statistics.median(nb): width[i] = round(statistics.median(nb), 1)
    changed = 0
    for i, s in enumerate(sp):
        s.pop('headWidthMeasured', None); s['headWidth'] = measured[i]
        if width[i] != measured[i]:
            s['headWidthMeasured'] = measured[i]; s['headWidth'] = width[i]; changed += 1
            print(path.split('/')[-1], i, (s.get('tags') or {}).get('coveredBy'), measured[i], '->', width[i])
    if changed: json.dump(S, open(path, 'w'), indent=1)
