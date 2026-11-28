#!/usr/bin/env python3
"""Economy (item 2, last two opens): the offices open in modules/budgets.ts goes through the offices engine's doors (officesInJurisdiction, officeSeats, servingTermsOnSeat); the credit.ts mortgages edit is left out until People's leaf housing-reads.ts holds allMortgageRows, because modules/housing.ts adds an import cycle edge. Re-runnable: prints applied / already / MISSED per edit; exits 1 without writing on a miss."""
import sys
R="src/core2/modules/"
EDITS={
R+"budgets.ts":[
('import { OFFICES_MODULE_ID } from "./offices";','import {\n  officeSeats,\n  officesInJurisdiction,\n  servingTermsOnSeat,\n} from "./offices";'),
('''  // A world without the offices module has no one to name.
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return null;
  const offices = api.moduleState(OFFICES_MODULE_ID);
''',''),
('''  let office: { id: string; kind: string } | undefined;
  for (const key of keys) {
    if (!key) continue;
    office = (
      offices.table("offices").query("byJurisdiction", [key]) as unknown as {
        id: string;
        kind: string;
      }[]
    ).find((o) => headsExecutive(o.kind));
    if (office) break;
  }
  if (!office) return null;
  for (const seat of offices
    .table("seats")
    .query("byOffice", [office.id]) as unknown as { id: string }[]) {
    const term = (
      offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as {
        personId: string;
      }[]
    )[0];
    if (term?.personId) return term.personId;
  }
  return null;''','''  // A world without the offices module has no one to name: the doors read none.
  let office: { id: string; kind: string } | undefined;
  for (const key of keys) {
    if (!key) continue;
    office = officesInJurisdiction(api, key).find((o) =>
      headsExecutive(o.kind),
    );
    if (office) break;
  }
  if (!office) return null;
  for (const seat of officeSeats(api, office.id)) {
    const term = servingTermsOnSeat(api, seat.id)[0];
    if (term?.personId) return term.personId;
  }
  return null;'''),
],
}
out={};miss=False
for p,es in EDITS.items():
    s=open(p).read()
    for old,new in es:
        if old in s:
            s=s.replace(old,new,1);print("applied",p,old[:40].replace("\n"," "))
        elif new and new in s:
            print("already",p,old[:40].replace("\n"," "))
        elif not new:
            print("already",p,old[:40].replace("\n"," "))
        else:
            print("MISSED",p,old[:60].replace("\n"," "));miss=True
    out[p]=s
if miss: sys.exit(1)
for p,s in out.items(): open(p,"w").write(s)
