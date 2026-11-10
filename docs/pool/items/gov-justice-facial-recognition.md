---
id: gov-justice-facial-recognition
title: "An investigation uses or is barred from facial recognition by the warrant rule in force"
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
---

**What.** When police identify a suspect from an incident, the identification step should read the facial-recognition warrant law in force: with a warrant rule the department needs a warrant record before using it and otherwise falls back to witness identification; without a rule it may use it freely. The identification route is recorded on the case. The warrant, where one is needed, is a record the court can read. This waits on the incident producer.

**Cause.** Found in code: stopgap `SG-GOV-REACH-A-facial-recognition` (row in `src/core2/data/stopgaps/gov.json`); the law reader is `src/core2/justice-law.ts` (`justiceParameter`) and the engine `src/core2/modules/justice.ts`, which has no identification step.

**Fix.** Make the identification step read the facial-recognition warrant law: with a warrant rule the department needs a warrant record first and otherwise falls back to witness identification, and the route is recorded on the case.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count. Closes SG-GOV-REACH-A-facial-recognition only when the engine reads the law, never by deleting the row. Check the decision register and OWNER-DECISIONS before adding any player-facing step.

**Done when.** A second session plays a one-year world in a drawn place and seed (named in the PR body) and sees a case identified by facial recognition under one law and by witness under another with the same incident, shown by case record id and the law row read; `src/core2/justice-incidents.test.ts` covers it.

**Waits on.** gov-justice-incident-producer.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps/gov.json, src/core2/justice-incidents.test.ts (new)

**Notes.** Closes SG-GOV-REACH-A-facial-recognition in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.

Deferred Oct 25: nothing on screen reads it yet.
