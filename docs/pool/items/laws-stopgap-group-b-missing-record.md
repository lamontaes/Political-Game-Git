---
id: laws-stopgap-group-b-missing-record
title: "Stopgaps in group-b (missing-record): 1 open"
area: laws
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/law-reach/group-b.ts, kind missing-record"
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/law-reach/group-b.ts: SG-GOV-REACH-B-public-school-staff. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/law-reach/group-b.ts

**Notes.** First row: Where the town has no public school employer, teachers and staff at the town's private school stand in for public school staff: a teacher-salary floor and a schools budget line reach them.
