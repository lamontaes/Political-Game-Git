---
id: laws-stopgap-group-b-missing-record
title: "Stopgaps in group-b (missing-record): 1 open"
area: laws
kind: stopgap
priority: 2
status: done
claimed-by: claude/laws-group-b-school-staff
pr: #4534
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/law-reach/group-b.ts, kind missing-record"
claimed-at: 2026-10-15T23:51:57.958Z
---

**What.** The stopgap row(s) SG-GOV-REACH-B-public-school-staff in src/core2/law-reach/group-b.ts mark a shortcut that is still live in play. Today where the town has no public school employer, teachers and staff at the town's private school stand in for public school staff, so a teacher-salary floor and a schools budget line reach them. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Wire to the world: the salary floor and budget line must reach the employer that actually employs the teacher, with the place's school district from data. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a teacher-salary floor raises the pay of a named public school employee, or no one where there is no public employer, with the job record id and employer record id, named by record id. The test in src/core2/law-reach-group-b.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: pass a teacher pay floor and see a named teacher's paycheck rise.

**Files.** src/core2/law-reach/group-b.ts, src/core2/data/stopgaps.json, src/core2/law-reach-group-b.test.ts

**Notes.** First row: Where the town has no public school employer, teachers and staff at the town's private school stand in for public school staff: a teacher-salary floor and a schools budget line reach them.
