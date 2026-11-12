---
id: gov-justice-police-oversight
title: "A complaint against an officer goes to the civilian review board when the law in force makes one"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer
standard: 2
lead: governing
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: split from gov-justice-incident-records (M, really L) by the claiming session, Oct 19
claimed-at:
checked: fable 2026-11-10
---

**What.** Let a person stopped by police bring a complaint against the officer from their recorded experience of the stop. The board's existence and powers are read from the police-oversight law in force when the complaint is decided; with the law in force the board reviews and may discipline, without it the department reviews itself. The finding and any discipline are records the officer's employer reads.

**Cause.** Found in code: src/core2/public-safety.ts function oversight (line 1772) pays the civilian board a cost per resident and writes lawApplied rows, but no complaint, finding or discipline exists; the marker SG-GOV-REACH-A-police-oversight in src/core2/data/stopgaps/gov.json is still open.

**Fix.** Let a person stopped by police file a complaint from the incident record. Decide it at the moment it is decided by reading the police-oversight law in force: with the law, the board reviews and may discipline; without it, the department reviews itself. Write the finding and any discipline as records the officer's employer reads, and resolve the stopgap row.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count.

**Done when.** A second session, in a played world in a drawn place and seed (named in the PR body), finds a complaint from a named person against a named officer decided by the board or by the department according to the law in force on that date, by record id, with the discipline reaching the officer's pay or post and a journal line for the complainant; the item's test in src/core2/public-safety.test.ts passes.

**Waits on.** gov-justice-incident-producer (open: stops and fights as incident records).

**Files.** src/core2/public-safety.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps/gov.json

**Notes.** Closes SG-GOV-REACH-A-police-oversight in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.

Deferred Oct 25: nothing on screen reads it yet.
