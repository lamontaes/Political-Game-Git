---
id: roadmap-m1-09-played-year-check
title: "M1-09's command checks a played year's births, moves and population change against real rates"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** M1-09 reads 'A year's births and moves in a random place stay within that place's real rates; the town's population changes the way real towns do instead of winding down.' Its command, src/core2/moves.test.ts, passes 10 of 10 on main ca0db23749 in the runner's drawn place, Naukati Bay, Alaska (0252845, seed 052879284d40f970a292f8a5eae6a23dcd9a28861d722c0b4843f100d2b0250e). But it plays half a year in a 700-person world holding only the moves and renewal engines, not a year of the world the player gets, and nothing checks the town's population change. The flag stays false until the whole spec is checked.

**Rules.** Research before building: the population-change range is SOURCED from Census population estimates for places of that size in that state (see research-regional-population-change-range), and real rates check the town's totals, never one person's outcome. A slow check is a script under src/core2/tooling/, not a unit test; never edit moves.test.ts.

**Done when.** A script plays one year of buildBenchWorld (two-level, every module) in the runner's drawn place and checks births against the state's rates, departures against the state's county-leaving rates by age, and the town's population change against the sourced range, naming place, key, full seed and record ids, and exiting nonzero on each failed clause; M1-09's command runs it after moves.test.ts; it fails when births are switched off. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/tooling/, docs/roadmap/features.json

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: M1-09 'stay within that place's real rates' conflicts with OD:558 / OD:12 (calibration ranges only); re-word the check.
