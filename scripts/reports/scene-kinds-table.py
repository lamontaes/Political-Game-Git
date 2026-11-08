import json,collections
import os
R=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))+'/'
st=json.load(open(R+'src/director/data/situation-types.json'))['types']
talk=json.load(open(R+'data/english/parts/scene-talk.json'))['parts']
words=json.load(open(R+'data/english/parts/scene-words.json'))['parts']
arcs=json.load(open(R+'src/director/data/purpose-arcs.json'))['purposes']
# A kind the director stages from its own producer, not from a moment's cause: the producer's data
# file names it (polling-place.json, staged on the eve of an election by stagePollingVisits).
staged={}
for f in os.listdir(R+'src/director/data'):
    if f.endswith('.json'):
        try: d=json.load(open(R+'src/director/data/'+f))
        except ValueError: continue
        if isinstance(d,dict) and isinstance(d.get('situationKey'),str): staged[d['situationKey']]=f[:-5]
tp=collections.Counter()
for p in talk:
    seen=set()
    for u in p['uses']:
        if u.get('purpose'): seen.add(u['purpose'])
    for x in seen: tp[x]+=1
lead=collections.Counter()
for p in words:
    for u in p['uses']:
        if u.get('subject')=='lead': lead[u['role']]+=1
def cause(c):
    if c.get('awaitingProducer'): return 'WAITS: '+str(c['awaitingProducer'])
    m=c.get('match') or {}
    return (m.get('label') or '?')+(' via '+c['causeEngine'] if c.get('causeEngine') else '')
rows=[]
for t in st:
    cs=t.get('causes') or []
    trig='; '.join(cause(c) for c in cs) if cs else 'NO CAUSE'
    if t['key'] in staged: trig='director producer: '+staged[t['key']]+'.ts stages it on the eve of the election'
    elif t.get('awaiting'): trig+=' | awaiting '+', '.join(t['awaiting'])
    dead = t['key'] not in staged and ((not cs) or all(c.get('awaitingProducer') for c in cs))
    purpose=t.get('purpose','')
    n=(tp[purpose] if purpose else 0)+lead[t['key']]
    rows.append((t['key'],purpose or '-',trig,', '.join(t.get('setting',[])),t.get('timing',''),', '.join(r['key'] for r in t['roles']),n,'dead' if dead else ''))
dead=[r for r in rows if r[7]]
out=['# Scene kinds, Nov 8, 2026','',f'The game has {len(rows)} kinds of scene. {len(dead)} of them cannot start yet, because nothing in the world writes the record they wait for. The rest start from records the engines already keep. The table says what starts each kind, where it is played, who is in it and how many wordings can say it.','','## What changed for the player tonight','','A town now organizes from how its term reads: strikes and protests where it reads badly, rallies where it reads well, each with scenes for the friends, neighbors and officials in it and a story in the paper.','','Presidents, governors and mayors give addresses of different kinds, chosen by what the world is doing and by their temperament, bad news included.','','A bribe offered to you is now your choice to take, hand back or report, and a relative\'s marriage or split reaches you as news at home.','','## Every kind','','| Kind | Purpose | What starts it | Where | When | Cast | Wordings | |','|---|---|---|---|---|---|---|---|']
for r in rows: out.append('| '+' | '.join(str(x).replace('|','/') for x in r)+' |')
out+=['','## Kinds that cannot start','','The kinds that cannot start are '+', '.join(r[0] for r in dead)+'. '+('A rescue needs an incident with someone present or an acute health episode, and no engine writes either: crime victimization names no one present, health records a diagnosis and a death but no emergency, and the disaster engine fired in none of the drawn years.' if [r[0] for r in dead]==['rescue'] else 'Each waits on a record no engine writes in a played year.'),'','## How this was made','',"The table is generated from the director's list of scene kinds, the purpose arcs and the scene word banks. Wordings counts the bank pieces that can say the kind: the talk pieces of its purpose, which every kind with that purpose shares, plus its own opening narration. Dead in the last column marks a kind with no cause that can start it today."]
open(R+'docs/reports/scene-kinds-2026-11-08.md','w').write('\n'.join(out)+'\n')
print(len(rows), sum(1 for r in rows if r[7]))
