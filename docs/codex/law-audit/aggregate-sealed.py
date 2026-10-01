"""Read completed receipts only; never launch or modify simulation records."""
import collections, datetime, hashlib, json, pathlib, random, re, secrets, sys

ROOT = pathlib.Path(__file__).resolve().parent
RUN = pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT / 'audit-systems-20260930-run'
manifest = json.loads((RUN / 'manifest.json').read_text())
complete = [w for w in manifest['worlds'] if w['status'] == 'COMPLETED']
catalog = json.loads(pathlib.Path('scripts/law-audit/trace-inventory.json').read_text())
groups = {}
def group(source, key):
    return groups.setdefault((source,key), dict(source=source, law=key, rowsObserved=0,
        firedRows=0, applicationJurisdictions=set(), watchedWorlds=set(), personIds=set(),
        paymentIds=set(), unresolvedPersonEvidenceRecords=set(), paymentMinorUnitsUSD=0, missingReasons=collections.Counter()))
for q in sorted({r['questionKey'] for r in catalog}):
    group('enacted',q)
inputs=[]; samples=[]; counts=collections.Counter()
for w in complete:
    path=pathlib.Path(w['output']+'.json'); raw=path.read_bytes(); receipt=json.loads(raw)
    assert receipt['head']==manifest['head'] and receipt['completedMonths']==24
    inputs.append(dict(state=w['state'],placeName=w['placeName'],path=str(path),
        sha256=hashlib.sha256(raw).hexdigest(),counts=receipt['counts']))
    counts.update({k:v for k,v in receipt['counts'].items() if isinstance(v,int)})
    for index,row in enumerate(receipt['rows']):
        key=row.get('question') or ('uncataloged:'+row['jurisdiction']+':'+row['designation']+':'+row['title'])
        g=group(row['source'],key); g['rowsObserved']+=1
        if not row['fired']:
            g['missingReasons'][row['reason']]+=1
            continue
        g['firedRows']+=1;g['watchedWorlds'].add(w['state'])
        for ev_index,e in enumerate(row.get('evidence',[])):
            g['applicationJurisdictions'].add(e.get('jurisdictionId') or row['jurisdictionId'])
            explicit_ids=set(re.findall(r'person_[a-f0-9]{16}',str(e.get('touched',''))))
            structured_ids=e.get('touchedPersonIds',[])
            assert isinstance(structured_ids,list) and all(isinstance(pid,str) and re.fullmatch(r'person_[a-f0-9]{16}',pid) for pid in structured_ids)
            explicit_ids.update(structured_ids)
            g['personIds'].update(w['state']+':'+pid for pid in explicit_ids)
            identity=e.get('personIdentityEvidence',{})
            if str(e.get('touched','')).startswith('No person-level identity on this record') or identity.get('status') in ('unavailable','partial'):
                g['unresolvedPersonEvidenceRecords'].add(w['state']+':'+e['record'])
            after=e.get('after')
            if row['effect']=='program-payment' and isinstance(after,dict) and after.get('currency')=='USD':
                transfer=re.search(r'resource-transfer-outcome_[a-f0-9]{16}',e['record'])
                assert transfer and isinstance(after.get('minorUnits'),int)
                identity=w['state']+':'+transfer.group()
                if identity not in g['paymentIds']:
                    g['paymentIds'].add(identity);g['paymentMinorUnitsUSD']+=after['minorUnits']
            samples.append(dict(world=w['state'],watchedPlace=w['placeName'],source=row['source'],
                law=key,designation=row['designation'],applicationPlace=row['jurisdiction'],effect=row['effect'],
                rowIndex=index,evidenceIndex=ev_index,receipt=str(path),evidence=e))
serialized=[]
for g in groups.values():
    for key in ['applicationJurisdictions','watchedWorlds','personIds','paymentIds','unresolvedPersonEvidenceRecords']:
        g[key]=sorted(g[key])
    g['missingReasons']=dict(g['missingReasons'])
    g['placesFired']=len(g['applicationJurisdictions']);g['peopleTouched']=len(g['personIds'])
    g['unresolvedPersonEvidenceRecordCount']=len(g['unresolvedPersonEvidenceRecords'])
    g['peopleCountMeaning']='Explicit saved person IDs only; zero is not zero affected people; unresolved evidence records are not a person count'
    serialized.append(g)
seedfile=RUN/'independent-example-seed.json'
if not seedfile.exists():
    seedfile.write_text(json.dumps(dict(seed=secrets.token_hex(32),method='OS entropy; independent of world/place selection seeds'),indent=2)+'\n')
seed=json.loads(seedfile.read_text())['seed'];rng=random.Random(int(seed,16))
sampled=[]
for source in ['enacted','starting']:
    candidates=[s for s in samples if s['source']==source]
    sampled.extend(rng.sample(candidates,min(3,len(candidates))))
summary=dict(historicalOnly=bool(manifest.get('historicalOnly',False)),sourceCommittedAt=manifest.get('sourceCommittedAt'),campaignStatus=manifest.get('status','RUNNING'),generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),head=manifest['head'],
    campaignPid=manifest['hostPid'],startedAt=manifest['startedAt'],completeWorlds=len(complete),
    runningWorlds=[w['state'] for w in manifest['worlds'] if w['status']=='RUNNING'],
    pendingWorlds=[w['state'] for w in manifest['worlds'] if w['status']=='NOT RUN'],
    totals=dict(counts),receiptInputs=inputs,perLaw=serialized,randomSampleSeed=seed,
    independentlyRandomExamples=sampled,
    limits=['56 independent worlds, not one shared-country treasury or population',
    'placesFired counts distinct application jurisdiction IDs, not number of watched towns',
    'peopleTouched counts explicit saved person IDs only, scoped to independent world corpus; structured subject IDs preferred when validated by adapter',
    'unresolvedPersonEvidenceRecordCount counts distinct evidence records with missing identity, not missing or affected people',
    'Only actual USD program payments summed; authorities and aggregate estimates excluded',
    'Payment totals are observation-corpus sums across independent worlds, never a single-country dollar total',
    'Zero observed records is not proof of no effect; pending worlds remain unobserved',
    'Starting law effects and enacted law effects remain separate',
    'Raw before/after aggregate outcomes include other causes; link factor is not a person-level delta'])
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
out=RUN/f'partial-{len(complete):02d}-{stamp}.json';out.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(dict(path=str(out),complete=len(complete),totals=dict(counts),
    firedLaws=[{k:g[k] for k in ['source','law','placesFired','peopleTouched','paymentMinorUnitsUSD','firedRows']} for g in serialized if g['firedRows']],
    randomExamples=sampled),indent=2))
