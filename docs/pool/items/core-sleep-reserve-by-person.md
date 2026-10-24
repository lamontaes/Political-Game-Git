---
id: core-sleep-reserve-by-person
title: "Each person's sleep reserve comes from their own time-use group"
area: core
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Every person reserves the same 8.7 hours of sleep a day (workSleepReserveHours, the midpoint of employed adults in ATUS 2025 Table 8B, SG-P8-work-time-reserve), whether they work, are retired or have a child at home, and that reserve sets how many free hours src/core2/modules/work.ts and src/core2/free-block.ts give them. ATUS 2025 gives sleep by employment and a child at home (Tables 8B and 8C, 8.56 to 9.37 hours, data/research/core/atus-2025-sleep.json), and the age cohorts are in src/core2/data/time-use-reference.json. Read each person's reserve from their own group at the moment their free hours are computed, so a retiree's day and a working parent's day differ for a recorded reason.

**Rules.** Wire to the world: the reserve must change the free hours a person actually spends in a played world, read by the time planner when it decides. One model, two tiers: a counted group reads the same group figure times its count.

**Done when.** In a one-year buildBenchWorld run of a drawn place (seed named in the PR), an employed parent and a not-employed adult show different discretionary hours by person id, the time-use check (scripts/core2-year/time-use.ts) still prints its leisure line, and SG-P8-work-time-reserve is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/modules/work.ts, src/core2/free-block.ts, src/core2/data/parameters.json, data/research/core/atus-2025-sleep.json

**Notes.** TODO
