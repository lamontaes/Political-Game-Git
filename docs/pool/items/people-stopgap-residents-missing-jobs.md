---
id: people-stopgap-residents-missing-jobs
title: "Stopgaps in residents (missing-jobs): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: duplicate of world-lodes-commutes and people-unplaced-outside-employer (pool feeder Oct 20); CTO to drop
milestone:
source: "src/core2/data/stopgaps.json, src/core2/residents.ts, kind missing-jobs"
---

**What.** Replace or clear the 1 open missing-jobs stopgap row(s) in src/core2/residents.ts: SG-CORE-unplaced-workers-income. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/residents.ts

**Notes.** First row: Counted residents the opening couldn't place in a town firm (the employment target from ACS/CPS less recorded jobs) earn the place's ACS median earnings (the town's median recorded wage where the place's sample is too th
