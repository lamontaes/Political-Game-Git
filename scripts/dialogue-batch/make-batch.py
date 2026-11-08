import json,collections,hashlib,sys
R=''
d=json.load(open(R+'data/english/parts/scene-talk.json'))['parts']
led=json.load(open(R+'data/english/part-grades.json'))['parts']
slots=collections.defaultdict(list)
for p in d:
    u=p['uses'][0]
    if p['key'] in led: continue
    if p.get('author','').startswith(('Claude Sonnet 5.5 (night: story)','Story')) and not p.get('requiresFacts') and not u.get('requiresFacts'):
        slots[(u.get('purpose'),u.get('key'),u.get('step'),u.get('move'))].append(p)
PICK=[
 (('bribe-offer','favor-asked','reply','refuse'),'A member of the council has just been offered an envelope by a man who wants a contract. This is what the member says to turn it down.'),
 (('bribe-pressed','threat','state','threaten'),'The man whose envelope you handed back comes to find you a week later. This is the first thing he says.'),
 (('press-comment','routine','reply','deflect'),'A reporter asks you, on the courthouse steps, about a vote you have not decided how to explain. You duck the question.'),
 (('lobby-remembers','threat','state','warn'),'You voted against a group that wanted your yes. Its lobbyist catches you in the hall afterward.'),
 (('donor-ask','favor-asked','follow','confront'),'A donor asked you for a favor and you said no. He answers.'),
 (('family-win','honor','follow','press'),'You won. At home, someone who lives with you answers your good news with one more thing.'),
 (('rally-word','honor','state','request'),'After a rally, a volunteer comes up to you and asks you for something.'),
 (('bribe-pressed.begging','threat','state','plea'),'Someone who once offered you money comes back, short of cash, to ask a different favor.'),
]
out=[]
n=0
keys=[]
for slot,context in PICK:
    ps=sorted(slots.get(slot,[]),key=lambda p:hashlib.sha1(p['key'].encode()).hexdigest())[:3]
    if len(ps)<3: print('SHORT',slot,len(ps),file=sys.stderr); continue
    out.append((context,ps))
lines=["# A small batch to grade, Nov 8, 2026","",f"{n} lines from tonight's new scenes, three to a moment, each moment described. Say good, fix (with what to change) or bad for any of them, as you did in the earlier batches. Your grade on a line now reaches every line like it in the whole game: the same move, in the same voice and register, wherever it plays. You do not have to grade them all; a few is enough.","","Each line says what it is, so you can grade by voice. A line with {name} or {office} in braces gets the real name or office in play.",""]
for i,(context,ps) in enumerate(out,1):
    lines.append(f"## {i}. {context}")
    lines.append("")
    for j,p in enumerate(ps,1):
        n+=1
        lines.append(f"{i}.{j}  {p['text']}")
        keys.append((f"{i}.{j}",p['key']))
    lines.append("")
lines+=["## Keys","","The piece each number grades, for the person recording the grades.",""]
lines+=[f"- {a}: `{k}`" for a,k in keys]
open(sys.argv[1],'w').write('\n'.join(lines)+'\n')
print(n,'lines')
