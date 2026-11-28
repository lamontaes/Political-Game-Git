#!/usr/bin/env python3
"""Re-runnable: split the `executive` family of tests/guards/families.json into `offices` (the seats) and
`governing` (the officeholder's day), then rewrite .github/CODEOWNERS. Run from the repository root."""
import json,re,subprocess
P='tests/guards/families.json'
d=json.load(open(P))
fam=[f for f in d['families'] if f['id']=='executive']
if not fam:
    print('no executive family: the split is already in families.json; settling entries and the baseline only')
else:
    fam=fam[0]
    GOV_SRC=['src/core2/modules/executive.ts','src/core2/modules/office-day.ts','src/core2/modules/president-acts.ts','src/core2/modules/staff.ts','src/core2/modules/constituent-cases.ts','src/core2/office-day-*.ts','src/core2/office-holdover.ts']
    GOV_TEST=re.compile(r'^src/core2/(staff[-.]|constituent-case|case-referral-read|president-|executive-appoints-known|emergency-declaration|federal-casework|governor-appointment-job-ends|governor-pick-from-the-state|public-post-schedule)')
    SEATS_ENTRIES=['src/core2/appointments.ts','src/core2/officials-identity.ts','src/core2/official-living.ts','src/core2/outside-governments.ts','src/core2/modules/official-pay.ts','src/core2/gov-rules/local-governments.ts']
    GOV_ENTRY=['src/core2/modules/executive.ts','src/core2/modules/office-day.ts','src/core2/modules/president-acts.ts','src/core2/modules/staff.ts','src/core2/modules/constituent-cases.ts','src/core2/office-day-calendar.ts']
    def isgov(g): return g in GOV_SRC or bool(GOV_TEST.match(g))
    gov_paths=[g for g in fam['paths'] if isgov(g)]+['src/core2/office-day-*.ts','src/core2/office-holdover.ts']
    off_paths=[g for g in fam['paths'] if not isgov(g)]
    off_entry=[e for e in fam['entry'] if e not in GOV_ENTRY]+[e for e in SEATS_ENTRIES if e not in fam['entry']]
    offices={'id':'offices','name':'Offices and seats','entry':off_entry,'paths':off_paths}
    governing={'id':'governing','name':"Governing: the officeholder's day",'entry':GOV_ENTRY,'paths':gov_paths}
    i=d['families'].index(fam)
    d['families'][i:i+1]=[offices,governing]
    json.dump(d,open(P,'w'),indent=2,ensure_ascii=False); open(P,'a').write('\n')
    subprocess.run(['npx','prettier','--write',P],check=True,capture_output=True)
    subprocess.run(['node','--import','tsx','scripts/guards/codeowners.ts'],check=True)
    print('offices paths',len(off_paths),'governing paths',len(gov_paths))
def glob_rx(g):
    parts=g.split('**')
    return re.compile('^'+'.*'.join('[^/]*'.join(re.escape(x) for x in p.split('*')) for p in parts)+'$')
def guard():
    out=subprocess.run(['npx','vitest','run','tests/guards/families.test.ts'],capture_output=True,text=True)
    return out.returncode,re.sub(r'\x1b\[[0-9;]*m','',out.stdout+out.stderr)
def save():
    json.dump(d,open(P,'w'),indent=2,ensure_ascii=False); open(P,'a').write('\n')
    subprocess.run(['npx','prettier','--write',P],check=True,capture_output=True)
    subprocess.run(['node','--import','tsx','scripts/guards/codeowners.ts'],check=True)
fams={f['id']:f for f in d['families']}
# 1. A file of one half importing a non-entry file of the other half raised the guard's count: make those files entries
#    of the half that owns them (doors first, so no count ever rises), until the guard is satisfied.
for _ in range(8):
    code,text=guard()
    added=0
    for line in re.findall(r'"([^" ]+) \((offices|governing)\): \d+ imports inside other families, \d+ known: ([^"]*?)\. Import the family',text):
        importer,fam_id,targets=line
        other='governing' if fam_id=='offices' else 'offices'
        for t in [x.strip() for x in targets.split(',')]:
            if any(glob_rx(g).match(t) for g in fams[other]['paths']) and t not in fams[other]['entry'] \
               and not any(glob_rx(e).match(t) for e in fams[other]['entry']):
                fams[other]['entry'].append(t); added+=1; print('entry of',other+':',t,'(read by',importer+')')
    if not added: break
    save()
# 2. Lower the baseline by what the guard now says (only ever lowers; a file at 0 is dropped).
code,text=guard()
BP='tests/guards/families-baseline.json'
b=json.load(open(BP))
lowered=0
for f,old,new in re.findall(r'"([^"]+): lower (\d+) to (\d+)"',text):
    assert b['deepImports'][f]==int(old),(f,old)
    assert int(new)<int(old)
    if int(new)==0: del b['deepImports'][f]
    else: b['deepImports'][f]=int(new)
    lowered+=1
json.dump(b,open(BP,'w'),indent=2,ensure_ascii=False); open(BP,'a').write('\n')
subprocess.run(['npx','prettier','--write',BP],check=True,capture_output=True)
print('lowered',lowered,'baseline entries')
# 3. Fail loudly: the guard must pass now, with no count above its baseline.
code,text=guard()
if code!=0:
    print(text[-3000:]); print('FAILED: the families guard still fails after the split; settle what it names by hand.'); raise SystemExit(1)
print('families guard passes: no count above its baseline')
