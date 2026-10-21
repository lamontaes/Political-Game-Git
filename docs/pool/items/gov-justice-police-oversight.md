---
id: gov-justice-police-oversight
title: "A complaint against an officer goes to the civilian review board when the law in force makes one"
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

**What.** Let a person stopped by police bring a complaint against the officer from their recorded experience of the stop. The board's existence and powers are read from the police-oversight law in force when the complaint is decided; with the law in force the board reviews and may discipline, without it the department reviews itself. The finding and any discipline are records the officer's employer reads.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count.

**Done when.** In a one-year run of the played world in a drawn place and seed (named in the PR body), a complaint from a named person against a named officer is decided by the board or by the department according to the law in force on that date, shown by record id, with the discipline reaching the officer's pay or post and a journal line for the complainant; tested in src/core2/justice-incidents.test.ts.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Closes SG-GOV-REACH-A-police-oversight in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.
