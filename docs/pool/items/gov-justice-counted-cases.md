---
id: gov-justice-counted-cases
title: "Counted adults get cases, convictions and sentences by group in the justice engine"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
after: gov-justice-counted-incidents, gov-justice-counted-dispositions, gov-justice-counted-fill-in
source: added with npm run pool -- add
claimed-at: 
---

**What.** Roll-up of the counted tier of the justice engine, split Oct 20 into three parts: gov-justice-counted-incidents (counted groups carry incident counts by the same cause rule as full people), gov-justice-counted-dispositions (charges, pleas, convictions and sentences by group through the same decision rule, feeding the jail and prison counts) and gov-justice-counted-fill-in (a counted adult filled in matches the group's case and custody counts). Nothing is built under this item itself; it is done when its three parts are done.

**Rules.** One model, two tiers: a counted group meets the same justice rule as a full person, times its count. No dice: counts come from causes and the law in force, never a rate draw per person. Replace, never layer: the parts reuse the full-person justice functions and add no second court engine.

**Done when.** All three parts are done: in a one-year run of the played world (buildBenchWorld) in a drawn place with a seed the builder did not choose, counted groups show incident, case and sentence counts by group record id, a filled-in counted adult matches them, and src/core2/justice-counted.test.ts passes; the CTO sets this item done when the last part is.

**Files.** docs/pool/items/gov-justice-counted-incidents.md, docs/pool/items/gov-justice-counted-dispositions.md, docs/pool/items/gov-justice-counted-fill-in.md

**Notes.** Oct 20 (pool feeder): spec written; it was an empty shell for L work, now split into three bounded parts that all wait on gov-justice-incident-producer (the justice engine hears only officials' bribery cases today, so there is no full-person rule to multiply yet).
