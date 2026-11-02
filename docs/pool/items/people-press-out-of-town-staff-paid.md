---
id: people-press-out-of-town-staff-paid
title: "A press person who lives outside the town is paid, so their household cost doesn't run them out of money"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-press-staff-households
source: governing lead, Nov 2 (found building people-press-staff-households: unpaid out-of-town press people run out of money)
lead: governing
---

**What.** A local station's news director and a national outlet's staff live outside the town and hold no job, so nothing pays them (SG-PEOPLE-press-national-payroll; the registry row was restored as resolved on Oct 14 though its marker in press-staff.ts still runs). With people-press-staff-households they carry the one-person household officials get and spend it each week, so they run out. In Petersville, Alaska (seed pst-1), three of four station news directors held $0 by May to August of the first year. Pay them as official-pay pays officials who live outside the town (a salaried post paid each month by an outside payer at the role's pay), or through national outlets' books as the stopgap's replacement says.

**Rules.** One model, two tiers: they are paid by the same payroll rule as anyone else with a salaried post. Wire to the world: the pay leaves a payer's account and is taxed as any paycheck is. Estimate, never UNKNOWN: the pay is the press role's pay parameter.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named), every out-of-town press person still at their outlet holds a pay record and is paid each month by journal entry id, none holds $0 because no pay came, and SG-PEOPLE-press-national-payroll is resolved.

**Files.** src/core2/press-staff.ts, src/core2/modules/official-pay.ts, src/core2/press-staff.test.ts, src/core2/data/stopgaps.json

**Notes.** TODO
