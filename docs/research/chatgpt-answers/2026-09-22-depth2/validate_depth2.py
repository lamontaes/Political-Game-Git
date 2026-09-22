"""Validate receiving data, not production runtime or factual correctness."""
from pathlib import Path
import json, re, sys
from datetime import date
R=Path(__file__).resolve().parent
results=[]
def read(n): return json.loads((R/n).read_text())
def check(name, condition):
 results.append({'name':name,'passed':bool(condition)})
 if not condition: print('FAIL:',name)
def uniq(rows,key): return len(rows)==len({r[key] for r in rows})
p=read('personality-scale-dispositions.json'); a=p['catalogue_assignments']; scales=p['scales']; sk={s['key']:s for s in scales}
check('all121candidate IDs unique',len(a)==121 and uniq(a,'id'))
check('all102scale keys unique',len(scales)==102 and uniq(scales,'key'))
check('eighteen bipolar and84one-sided',sum(s['kind']=='bipolar' for s in scales)==18 and sum(s['kind']=='one-sided-facet' for s in scales)==84)
check('one explicit composite rather than hidden omission',sum(x['disposition']=='set-aside-as-independent-scale' for x in a)==1)
check('each pole target exists and points back to candidate',all(x['scale'] in sk and sk[x['scale']][x['end']]['catalogue_id']==x['id'] for x in a if x['disposition']=='pole'))
check('every original meaning and boundary retained',all(x['proposed_meaning'] and x['boundary'] and x['source_ids'] for x in a))
check('seven tuning profiles and allreferences resolve',len(p['tuning_profiles'])==7 and all(s['tuning_profile'] in p['tuning_profiles'] for s in scales))
check('one-sided low is unmarked not another catalogue id',all(s['low']['catalogue_id'] is None and s.get('storage_rule') for s in scales if s['kind']=='one-sided-facet'))
f=read('formative-situation-bindings.json'); fr=f['rows']
check('twentyrequested formativekeys unique',len(fr)==20 and uniq(fr,'requested_key'))
check('nineteen exactsourcekeys and oneexplicitlyunlocated',sum(x['source_key'] is not None for x in fr)==19 and [x['requested_key'] for x in fr if x['source_key'] is None]==['household'])
check('no automatic defaultcoretrait target',all(x['legacy_default_target'] is None for x in fr))
check('conditional links name actualoptions',all(set(l['options']).issubset(x['source_options']) for x in fr for l in x['conditional_links']))
legacy={'risk-approach':{'cautious','risk-seeking'},'response-tempo':{'patient','reactive'},'conflict-approach':{'conflict-averse','combative'},'curiosity':{'curious'},'loyalty-tendency':{'loyal'},'ambition':{'ambitious'}}
check('conditional expressions match inspectedlegacy definitions',all(l['target_stable_key'] in legacy and l['expression_key'] in legacy[l['target_stable_key']] for x in fr for l in x['conditional_links']))
c=read('us-federal.policy-pack.candidate.json'); dom={x['key'] for x in c['domains']}; issues={x['key'] for x in c['issues']}
check('federal20domains60issues60subjects',len(dom)==20 and len(issues)==60 and len(c['subjects'])==60)
check('federalnamedrowkeysunique',all(uniq(c[k],'key') for k in ['domains','issues','subjects']))
check('issue-domainlinksresolve',all(x['domain'] in dom for x in c['issues']))
check('knowledgeissueaboutlinksresolve',all(x['scope']=='issue' and x['about'] in issues for x in c['subjects']))
check('newfederalnamespaceandleveldistinct',c['pack']=='us-federal' and all(x['levels']==['federal'] for x in c['issues']))
check('sourceprovenancedeclared',c['provenance']['kind']=='sourced' and bool(c['provenance']['sources']))
check('no inventedpropositionsorfrequencies',not c.get('propositions') and 'weights' not in c)
bs=read('federal-institution-and-level-bindings.json')
check('all60federalbindingspresent',len(bs['issues'])==60)
a=read('relationship-absence-behavior.json');
check('fiveindependentabsencemeanings',set(x['line'] for x in a['lines'])=={'warmth','trust','respect','commitment','tension'})
check('newownerquoteandconsequencesdocumented',a['owner_instruction']['quoted']=='i do want passive decay. not a number. defer to chatgpt' and all(x['behavior'] and x['pace'] and x['return'] for x in a['lines']))
e=read('economic-availability-receiving.json'); er=e['records']
check('sixscopeddateentries',len(er)==6)
check('allsourcedeconomicdatesparse',all((date.fromisoformat(x[k]) is not None) for x in er for k in ['release_date','effective_date'] if x.get(k)))
check('economicreferencesresolve',all(s in e['sources'] for x in er for s in x['sources']))
check('releaserecorddoesnotturnJanuaryintoFebruaryknowledge',date.fromisoformat(er[0]['release_date'])>date(2026,1,5))
check('FMRannouncementprecedesnormalapplication',date.fromisoformat(er[3]['release_date'])<date.fromisoformat(er[3]['effective_date']))
check('HUDILunknowninitialpostingnotinvented',er[4]['release_date'] is None and er[4]['effective_date']=='2025-04-01')
g=read('governor-term-corrections.partial.json')
check('NHVTtwo-yearcorrectionnotnationalfouryears',len(g['rows'])==2 and all(x['term_years']==2 for x in g['rows']))
d=read('request-dispositions.json');check('seventeendispositionsunique',len(d['rows'])==17 and uniq(d['rows'],'request_id'))
report={'kind':'research-data-structure-and-date-order-checks','not_tested':['actualrepositoryloader','productionWorld','browser','nativeclient','newfactualvalidationofeveryrow','realhumanbehavior'],'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'checks':results}
(R/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['passed','failed','kind']}));sys.exit(0 if report['failed']==0 else 1)
