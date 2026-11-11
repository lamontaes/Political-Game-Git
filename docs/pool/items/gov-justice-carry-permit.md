---
id: gov-justice-carry-permit
title: "The sheriff issues or refuses a carry permit by the permit law in force"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer
source: split from gov-justice-incident-records (M, really L) by the claiming session, Oct 19
claimed-at:
lead: governing
standard: 2
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A person who carries a weapon applies for a permit where the law requires one, and the sheriff's decision reads the permit law in force and the applicant's record: issued, refused with the reason, or not needed where permitless carry is law. A carried weapon without a permit where one is required becomes an incident record. The permit, the refusal and the reason are records the applicant can be told about. This waits on the incident producer, which is itself blocked.

**Cause.** Found in code: stopgap `SG-GOV-REACH-A-carry-permit` (row in `src/core2/data/stopgaps/gov.json`); the law reader is `src/core2/justice-law.ts` (`justiceParameter`) and the engine `src/core2/modules/justice.ts`, which hears no weapon cases.

**Fix.** Add a permit decision the sheriff makes from the permit law in force and the applicant's record, recorded with its reason, and make a permitless carry an incident only where a permit is required.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count. Closes SG-GOV-REACH-A-carry-permit only when the engine reads the law, never by deleting the row. Check the decision register and OWNER-DECISIONS before adding any player-facing step.

**Done when.** A second session plays a one-year world in a drawn place and seed (named in the PR body) and sees an applicant issued a permit under one law and refused under another, and a permitless carrier become an incident only where a permit is required, shown by permit and incident record ids and the law row read; `src/core2/justice-incidents.test.ts` covers it.

**Waits on.** gov-justice-incident-producer.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps/gov.json, src/core2/justice-incidents.test.ts (new)

**Notes.** Closes SG-GOV-REACH-A-carry-permit in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.

Deferred Oct 25: nothing on screen reads it yet.
