from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
import json,random
root=Path('/workspace/scratch/656ae98f7a9b/repo/test-results/law-audit/all56-current-main')
selection=json.loads(Path('/workspace/scratch/656ae98f7a9b/repo/test-results/law-audit/all56-selection.json').read_text())
manifest=json.loads((root/'manifest.json').read_text()) if (root/'manifest.json').exists() else {'head':None,'startedAt':None,'worlds':[dict(p,status='NOT RUN',output=str(root/p['state'])) for p in selection]}
complete=[]; law_totals={}; examples=[]; status=[]
for world in manifest['worlds']:
    output=Path(world['output'])
    if not output.is_absolute():output=Path('/workspace/scratch/656ae98f7a9b/repo')/output
    checkpoint_path=Path(str(output)+'.checkpoint.json')
    checkpoint=json.loads(checkpoint_path.read_text())['checkpoint'] if checkpoint_path.exists() else None
    status.append(dict(state=world.get('state'),place=world.get('place'),placeName=world.get('placeName'),status=world['status'],checkpoint=checkpoint))
    receipt_path=Path(str(output)+'.json')
    if world['status']!='COMPLETED' or not receipt_path.exists():continue
    receipt=json.loads(receipt_path.read_text())
    if receipt['completedMonths']!=24 or receipt['problem'] or receipt['head']!=manifest['head'] or receipt['dirty']:
        raise RuntimeError('Noncomparable completed receipt '+str(receipt_path))
    complete.append(world['state'])
    for row in receipt['rows']:
        key=(row.get('source','enacted'),row['question'] or row['measureId'])
        item=law_totals.setdefault(key,dict(source=key[0],question=key[1],law_ids=set(),worlds=set(),stamped=set(),adapter=set(),unproven=0,about_zero=0))
        item['law_ids'].add((receipt['seed'],row['measureId']));item['worlds'].add(world['state'])
        if not row['fired']:
            if row['reason']=='researched-about-zero':item['about_zero']+=1
            else:item['unproven']+=1
        for evidence in row['evidence']:
            identity=(receipt['seed'],evidence['record'],evidence.get('appliedAt'))
            if row['effect'].startswith('stamped:'):item['stamped'].add(identity)
            else:item['adapter'].add(identity)
            examples.append(dict(state=world['state'],town=receipt['placeName'],source=key[0],question=key[1],effect=row['effect'],lawKey=row['measureId'],**evidence))
rows=[]
for (source,question),item in sorted(law_totals.items()):
    rows.append(dict(source=source,question=question,observedLawInstances=len(item['law_ids']),completedStartingJurisdictions=len(item['worlds']),producerStampedRecords=len(item['stamped']),adapterRecords=len(item['adapter']),unprovenAdapterRows=item['unproven'],researchedAboutZeroRows=item['about_zero']))
rng=random.Random('team2-sealed-receipt-examples-20260930')
chosen=rng.sample(examples,min(3,len(examples)))
summary=dict(generatedAt=datetime.now(timezone.utc).isoformat(),head=manifest['head'],startedAt=manifest['startedAt'],selected=56,completed=len(complete),completedStates=complete,statuses=status,countrywideAuditObservationTotalsByLaw=rows,representativeRecords=chosen,
    exampleSeed='team2-sealed-receipt-examples-20260930',limitations=['Totals count observations across independent watched worlds, not a synthetic single-country population or dollar total.','Named money fields stay on exact saved records; balance levels and cost components are not added into fabricated marginal law costs.','Only complete clean-head 24-month receipts enter per-law totals. Pending states have no effect totals.','Raw zero observations and rejected/unobserved stamps are never absent physical effects.','Representative selection reads sealed JSON receipts only and never alters worlds.'])
root.mkdir(parents=True,exist_ok=True)
(root/'progress-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
md=['# Countrywide law observations remain bounded by completed runs','',f"The campaign has completed {len(complete)} of 56 starting jurisdictions. Each completed run supplies 24 calendar months. Pending runs supply no effect totals. Full raw evidence remains separate from this short report.",'','## MERGED','', 'Collector merge and runtime source are reported in the exact receipt. No execution is inferred from publication.','','## WHAT EMERGED','']
if not complete:md+=['No current-main world has completed. Countrywide law totals and representative effect records remain unproven.']
else:
    md+=['Observed totals below count saved records across completed watched worlds. They do not combine the worlds into one country.','','| Source | Law question | Law instances | Starting jurisdictions | Producer stamped records | Adapter records | Unproven adapter rows |','| --- | --- | ---: | ---: | ---: | ---: | ---: |']
    md += [f"| {r['source']} | {r['question']} | {r['observedLawInstances']} | {r['completedStartingJurisdictions']} | {r['producerStampedRecords']} | {r['adapterRecords']} | {r['unprovenAdapterRows']} |" for r in rows]
md+=['','## Wider effects and missing links','','Saved authority, payment, service adapters and producer-stamped mechanisms remain distinct. Missing attribution cannot establish an absent physical effect. Starting-law observations are separate.','','## Why-chain','','Actual saved record → canonical law/source/application date → preserved payload → observed mechanism. The proof terminates at that mechanism. Countrywide physical money totals require comparable component records and are not invented from balance levels.','','## Next action','','Continue the authorized campaign. Publish each completed state and preserve current checkpoints for the rest.','','## VITAL STATISTICS','',f"Selected jurisdictions: 56. Completed: {len(complete)}. Unincorporated starting places selected: 18. Example-selection seed is independent of all world seeds.",'','## Method and limits','',f"Exact runtime head: {manifest['head'] or 'NOT STARTED'}. Actual start: {manifest['startedAt'] or 'NOT STARTED'}. Three child simulations are prepared. No helper, merge, full-suite or speed acceptance is claimed."]
if chosen:
    md+=['','Representative recorded examples:']
    for e in chosen:md+=['',f"{e['town']} ({e['state']}): {e['effect']}; {e['touched']}. Exact record {e['record']}. Saved value: {json.dumps(e['after'])}."]
(root/'progress-summary.md').write_text('\n'.join(md)+'\n')
print(json.dumps({'selected':56,'completed':len(complete),'perLawRows':len(rows),'representativeRecords':len(chosen),'head':manifest['head']}))
