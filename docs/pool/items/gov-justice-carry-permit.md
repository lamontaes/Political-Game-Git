---
id: gov-justice-carry-permit
title: "The sheriff issues or refuses a carry permit by the permit law in force"
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

**What.** A person who carries a weapon applies for a permit where the law requires one, and the sheriff's decision reads the permit law in force and the applicant's record: issued, refused with the reason, or not needed where permitless carry is law. A carried weapon without a permit where one is required becomes an incident record. The permit, the refusal and the reason are records the applicant can be told about.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count.

**Done when.** In a one-year run of the played world in a drawn place and seed (named in the PR body), an applicant is issued a permit under one law and refused under another, and a permitless carrier becomes an incident only where a permit is required, shown by permit and incident record ids and the law row read; tested in src/core2/justice-incidents.test.ts.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Closes SG-GOV-REACH-A-carry-permit in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.
