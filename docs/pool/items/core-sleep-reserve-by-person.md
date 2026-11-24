---
id: core-sleep-reserve-by-person
title: "Each person's sleep reserve comes from their own time-use group"
area: core
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
lead: jobs
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-sleep-reserve-by-person
---

**What.** Every person reserves the same 8.7 hours of sleep a day (workSleepReserveHours, the midpoint of employed adults in ATUS 2025 Table 8B, SG-P8-work-time-reserve), whether they work, are retired or have a child at home, and that reserve sets how many free hours src/core2/modules/work.ts and src/core2/free-block.ts give them. ATUS 2025 gives sleep by employment and a child at home (Tables 8B and 8C, 8.56 to 9.37 hours, data/research/core/atus-2025-sleep.json), and the age cohorts are in src/core2/data/time-use-reference.json. Read each person's reserve from their own group at the moment their free hours are computed, so a retiree's day and a working parent's day differ for a recorded reason.

**Cause.** Found in code: src/core2/modules/work.ts line 269 reads `api.parameter(data.sleepReserveParameter)` (workSleepReserveHours, src/core2/data/parameters.json line 1323, 8.7 hours) for every person; row SG-P8-work-time-reserve is open in src/core2/data/stopgaps/p8.json.

**Fix.** Read each person's reserve from their ATUS group at the moment free hours are computed (employment and child at home, data/research/core/atus-2025-sleep.json; age cohorts in src/core2/data/time-use-reference.json), counted groups with the same group figure times their count, and resolve the row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the reserve must change the free hours a person actually spends in a played world, read by the time planner when it decides. One model, two tiers: a counted group reads the same group figure times its count. Estimate, never UNKNOWN: a group the table lacks starts from the real average, marked as an estimate with its source.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place (seed named in the PR) and opens an employed parent and a not-employed adult: they show different discretionary hours, by person id, for a recorded reason. The time-use check (scripts/core2-year/time-use.ts) still prints its leisure line, and SG-P8-work-time-reserve is resolved in src/core2/data/stopgaps/p8.json.

**Waits on.** Nothing.

**Files.** src/core2/modules/work.ts, src/core2/free-block.ts, src/core2/data/parameters.json, src/core2/data/stopgaps/p8.json, data/research/core/atus-2025-sleep.json, scripts/core2-year/time-use.ts

**Notes.** TODO

Released (2026-11-11): Read and scoped, not built: the single reserve is read by guarded reads in work.ts, work-cash.ts, work-attendance.ts and free-block.ts (whose age-group reserve rows are cached per world from it) and by saved-trace and payroll tests that compute hours from it; a per-person reserve needs the readers and those replay tests moved together. Suggested first part: discretionaryHours in work.ts only, with the work-attendance reads left on the shared value and registered as the remaining stopgap. Continue on branch claude/pool-core-sleep-reserve-by-person.
