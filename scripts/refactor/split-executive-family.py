#!/usr/bin/env python3
"""Re-runnable: split the `executive` family of tests/guards/families.json into `offices` (the seats) and
`governing` (the officeholder's day), then rewrite .github/CODEOWNERS. Run from the repository root."""
import json,re,subprocess
P='tests/guards/families.json'
d=json.load(open(P))
fam=[f for f in d['families'] if f['id']=='executive']
if not fam:
    print('no executive family: already split'); raise SystemExit(0)
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
# Lower the families baseline by what the guard now says (only ever lowers; a file at 0 is dropped).
out=subprocess.run(['npx','vitest','run','tests/guards/families.test.ts'],capture_output=True,text=True)
text=re.sub(r'\x1b\[[0-9;]*m','',out.stdout+out.stderr)
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
