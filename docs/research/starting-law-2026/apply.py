# python3 apply.py <research.json>... : merge approved research rows into starting-law-2026.json.
# preempts: true where the state rules the question out for its cities (a preemption statute,
# or a question only the state can answer); false where cities may still act.
import json,sys
P='/home/user/Political-Game-Git/data/research/laws/starting-law-2026.json'
STATE_ONLY={'government-operations.require-photo-id-to-vote','government-operations.automatic-voter-registration','government-operations.legislative-term-limits','government-operations.independent-redistricting'}
d=json.load(open(P))
for f in sys.argv[1:]:
    r=json.load(open(f)); q=r['question']; short=q.split(':')[1]
    old=d['questions'].get(q,{'answers':{}})
    answers={}
    for place,row in r['answers'].items():
        out={'answer':row['answer']}
        if row.get('operativeAt'): out['operativeAt']=row['operativeAt']
        out['preempts']= True if short in STATE_ONLY else (row['answer']=='no')
        if row.get('cite'): out['cite']=row['cite']
        out['source']=row['source']
        if row.get('note'): out['note']=row['note']
        answers[place]=out
    for place,row in old['answers'].items():
        answers.setdefault(place,row)
    unknown=sorted(r['unknown'])
    d['questions'][q]={'source':r['summarySource'],'note':('Unknown, and left out: '+', '.join(unknown)+'.') if unknown else 'Every place is answered.','answers':dict(sorted(answers.items()))}
json.dump(d,open(P,'w'),indent=2,ensure_ascii=False); open(P,'a').write('\n')
