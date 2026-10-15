"""Fold the readers' answers into the starting-law file; estimate what stays unread."""
import json, glob, sys, collections, re
from area_data import load, save
S = __import__('os').path.dirname(__import__('os').path.abspath(__file__)) + '/fill-2026-09-29/'
TERR = {'US-PR', 'US-GU', 'US-VI', 'US-AS', 'US-MP'}
NAMES = {'US-PR': 'Puerto Rico', 'US-GU': 'Guam', 'US-VI': 'the U.S. Virgin Islands', 'US-AS': 'American Samoa', 'US-MP': 'the Northern Mariana Islands', 'US-DC': 'D.C.'}
d = load()
Q = d['questions']
KEEP = ('answer', 'preempts', 'operativeAt', 'cite', 'source', 'note')
unread = collections.defaultdict(dict)
added = 0
for f in sorted(glob.glob(S + 'readers-*.json')):
    for key, block in json.load(open(f)).items():
        q = Q[key]
        for place, row in block.get('answers', {}).items():
            if place in q['answers']:
                # A row whose answer starts after the game begins: the reader
                # read what holds until then.
                existing = q['answers'][place]
                assert existing.get('operativeAt', '2000-01-01') > '2026-01-01', (key, place)
                existing['before'] = {k: row[k] for k in ('answer', 'preempts') if k in row}
                added += 1
                continue
            assert row['answer'] in ('yes', 'no'), (key, place)
            q['answers'][place] = {k: row[k] for k in KEEP if row.get(k) not in (None, '')}
            added += 1
        for place, why in block.get('unread', {}).items():
            unread[key][place] = why

for place in ('US-PR', 'US-GU', 'US-VI', 'US-AS', 'US-MP'):
    unread['us-policy-positions:labor-workforce.paid-family-leave'][place] = None

# Medicaid work requirement (KFF 1115 waiver tracker, published 9/24/2026).
KFF = 'https://www.kff.org/medicaid/issue-brief/medicaid-waiver-tracker-approved-and-pending-section-1115-waivers-by-state/'
mwr = Q['us-policy-positions:health-human-services.medicaid-work-requirement']
early = {'US-NE': '2026-05-01', 'US-MT': '2026-07-01', 'US-IA': '2026-12-01'}
places = sorted(set().union(*(q['answers'].keys() for q in Q.values())) - {'US'})
for place in places:
    if place in mwr['answers']:
        continue
    if place in early:
        mwr['answers'][place] = {'answer': 'yes', 'operativeAt': early[place], 'before': {'answer': 'no'}, 'source': KFF,
            'note': f'Starts the federal work requirement early, on {early[place][5:7].lstrip("0")}/{early[place][8:].lstrip("0")}/2026, by state plan amendment; none was in force on 1/1/2026.'}
    else:
        mwr['answers'][place] = {'answer': 'no', 'source': KFF,
            'note': 'No Medicaid work requirement was in force on 1/1/2026; the federal one starts 1/1/2027.'}
    added += 1
mwr['note'] = 'Every place without a requirement on 1/1/2026 answers no (KFF, 9/24/2026); Nebraska, Montana and Iowa start early.'

# Paid family leave: programs enacted but not started on 1/1/2026.
pfl = Q['us-policy-positions:labor-workforce.paid-family-leave']['answers']
for place in ('US-ME', 'US-MD', 'US-VA'):
    pfl[place]['before'] = {'answer': 'no'}

# Estimates for what stayed unread: the most common answer among similar
# places read for the same question (states for a state, territories for a
# territory; D.C. counts as a state), ESTIMATED FROM AVERAGE.
estimated = 0
for key, missing in unread.items():
    q = Q[key]
    for place, why in missing.items():
        kind = 'territories' if place in TERR else 'states and D.C.'
        read = [p for p in q['answers'] if p != 'US' and 'estimated' not in q['answers'][p]]
        peers = [p for p in read if (p in TERR) == (place in TERR)]
        if not peers:
            kind = 'places'
            peers = read
        count = collections.Counter(q['answers'][p]['answer'] for p in peers)
        answer, n = sorted(count.items(), key=lambda kv: (-kv[1], kv[0]))[0]
        row = {'answer': answer}
        if answer == 'no':
            pre = collections.Counter(q['answers'][p].get('preempts') for p in peers if q['answers'][p]['answer'] == 'no' and q['answers'][p].get('preempts') is not None)
            if pre:
                row['preempts'] = sorted(pre.items(), key=lambda kv: (-kv[1], str(kv[0])))[0][0]
        row['estimated'] = f'ESTIMATED FROM AVERAGE: the most common answer among the {len(peers)} {kind} read for this question ({n} answer {answer}), because this place\'s own law ' + ('could not be read.' if isinstance(why, str) else 'was not read.')
        row['note'] = ('Tried: ' + why) if isinstance(why, str) else 'Not read in the 9/29/2026 pass.'
        q['answers'][place] = row
        estimated += 1

for q in Q.values():
    q['answers'] = dict(sorted(q['answers'].items(), key=lambda kv: (kv[0] != 'US', kv[0])))
    FILLED = 'Places first left out were read on 9/29/2026; any still unread take the most common answer among similar places, marked ESTIMATED FROM AVERAGE.'
    note = q.get('note', '')
    if 'Unknown, and left out' in note or 'left unanswered' in note:
        kept = re.sub(r'\s*Unknown, and left out:[^.]*(\.[A-Z]{2}[^.]*)*\.', '', note).strip()
        kept = '' if 'left unanswered' in kept else kept
        q['note'] = (kept + ' ' + FILLED).strip()
save(d)
print('added', added, 'estimated', estimated)
