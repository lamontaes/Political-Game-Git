---
id: gov-justice-juvenile-age
title: "A young defendant's case is routed to juvenile or adult court by the juvenile age in force"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer
source: split from gov-justice-incident-records (M, really L) by the claiming session, Oct 19
claimed-at:
---

**What.** When a fight or other incident makes someone under the age of majority a defendant, the court routing reads the juvenile age of the law in force on the incident date and sends the case to juvenile or adult court. Juvenile cases take the juvenile sentencing range and seal the record; adult cases take the adult range. The routing, the age read and the ruling are recorded.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count.

**Done when.** In a one-year run of the played world in a drawn place and seed (named in the PR body), two defendants of the same age are routed differently when the juvenile age differs between two laws in force, shown by case record id and the law row read, and the defendant's sentence follows the court; tested in src/core2/justice-incidents.test.ts.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Closes SG-GOV-REACH-A-juvenile-age in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.
