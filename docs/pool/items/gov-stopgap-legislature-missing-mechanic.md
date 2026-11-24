---
id: gov-stopgap-legislature-missing-mechanic
title: "Stopgaps in legislature (missing-mechanic): 3 open"
area: gov
kind: stopgap
priority: 3
status: done
claimed-by:
pr: #4581
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/legislature.ts, kind missing-mechanic"
claimed-at:
---

**What.** Replace or clear the 3 open missing-mechanic stopgap row(s) in src/core2/modules/legislature.ts: SG-GOV-official-attendance, SG-GOV-official-floor-tactics, SG-STATE-line-item-veto-engine. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/legislature.ts

**Notes.** First row: A member with no person record (a seat held by no one filled in) is present at every vote; every other member decides from their own day.

Sent back 2026-10-16 from PR #4581 (branch claude/legislature-seat-holders): src/core2/legislature.test.ts 'golden path steps 6 to 9 ... an ordinance raising the minimum wage passes or fails on members reasons and, if enacted, raises named workers' fails 3 of 3 runs on this branch merged with current main, while the same file passes 15 of 15 on clean main (two runs). The change to modules/legislature.ts (dead members absent) is the likely cause; reproduce, fix the root cause, rerun the file in several drawn places; finish on that branch, merge main into it first.
