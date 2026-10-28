"""Correct spot tags the zone tagger got wrong, in place. Run fix_heads.py afterwards.
- A standing spot tagged open floor whose mannequin is under half as tall as the open standing spots with their heads at
  the same height (at eye level every adult head lines up, so a short one is cut off) is hidden by something in front of it: it takes the cover of covered spots at the same height in the picture (a
  stage, a counter), and a head width no wider than its shoulders allow.
- In a room with a speaker, people hidden by the stage stand on its far side and face it, toward the camera.
- One speaker per stage: another "speaker" whose head is under 0.6 of the main speaker's is someone in the crowd.
Each change is printed and the old value kept under tags.fixed.
usage: python3 fix_spots.py SPOTS.json..."""
import sys, json, collections

for path in sys.argv[1:]:
    S = json.load(open(path)); sp = S['spots']; changed = 0
    tag = lambda s: s.setdefault('tags', {})
    speakers = [s for s in sp if tag(s).get('role') == 'speaker']
    main = max(speakers, key=lambda s: s['headWidth']) if speakers else None
    for i, s in enumerate(sp):
        t = tag(s); old = dict(t); x0, y0, x1, y1 = s['box']
        if main is not None and t.get('role') == 'speaker' and s is not main and s['headWidth'] < 0.6 * main['headWidth']:
            t['role'] = None; t['pose'] = 'stand'; t['coveredBy'] = 'stage'; s['pose'] = 'stand'
        peers = [o['box'][3] - o['box'][1] for o in sp if o is not s and abs(o['headTop'] - s['headTop']) <= 15
                 and tag(o).get('pose', o.get('pose')) == 'stand' and tag(o).get('coveredBy') in (None, 'none')]
        short = (y1 - y0) < 0.5 * sorted(peers)[len(peers) // 2] if len(peers) >= 2 else (y1 - y0) < 2.6 * (x1 - x0)
        if t.get('pose', s.get('pose')) == 'stand' and t.get('coveredBy') in (None, 'none') and short:
            near = collections.Counter(tag(o).get('coveredBy') for o in sp if o is not s and abs(o['headTop'] - s['headTop']) <= 15
                                       and tag(o).get('coveredBy') not in (None, 'none', 'lectern'))
            t['coveredBy'] = near.most_common(1)[0][0] if near else ('stage' if any(tag(o).get('coveredBy') == 'stage' for o in sp) else 'object')
            s['headWidth'] = min(s['headWidth'], round((x1 - x0) / 2.3, 1))     # shoulders are about 2.3 heads wide
        if main is not None and t.get('coveredBy') == 'stage' and t.get('role') != 'speaker' and t.get('facing') != 0:
            t['facing'] = 0                                                     # the far side of the stage faces the stage
        if t != old:
            t['fixed'] = {k: old.get(k) for k in set(old) | set(t) if old.get(k) != t.get(k) and k != 'fixed'}
            changed += 1; print(path.split('/')[-1], i, t['fixed'], '->', {k: t.get(k) for k in t['fixed']})
    if changed: json.dump(S, open(path, 'w'), indent=1)
