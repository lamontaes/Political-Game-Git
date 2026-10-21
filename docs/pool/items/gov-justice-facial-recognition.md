---
id: gov-justice-facial-recognition
title: "An investigation uses or is barred from facial recognition by the warrant rule in force"
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

**What.** When police identify a suspect from an incident, the identification step reads the facial-recognition warrant law in force: with a warrant rule the department needs a warrant record before using it and otherwise falls back to witness identification; without a rule it may use it freely. The identification route is recorded on the case. The warrant, where one is needed, is a record the court can read.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count.

**Done when.** In a one-year run of the played world in a drawn place and seed (named in the PR body), a case is identified by facial recognition under one law and by witness under another with the same incident, shown by case record id and the law row read; tested in src/core2/justice-incidents.test.ts.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Closes SG-GOV-REACH-A-facial-recognition in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.
