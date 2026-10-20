---
id: gov-redistricting-census-seats-read
title: "A state's House seats change after a census, read by the offices engine and the political map"
area: gov
kind: wiring
priority: 3
size: M
status: blocked
claimed-by: claude/pool-redistrict
pr:
blocked-on:
after: gov-redistricting-census-count, gov-redistricting-plan-builder
blocked-on: gov-redistricting-census-count
after: gov-redistricting-census-count
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:35:29.967Z
---

**What.** After a census year the House seats `censusSeats(year)` (src/core2/census.ts) gives a state become the number of U.S. House seats the offices engine and the political map use for it: a state that grew has an added district to fill at the next election and a state that shrank loses one. The player in a state that gains a seat sees a new district and an open seat; one that loses a seat sees two members drawn into one district.

**Rules.** An effect is a read, not a record: the offices engine reads the seats at the moment it schedules the next election. No dice. One rule, all 56 places (the territories have delegates and no apportioned seats). Wire to the world.

**Done when.** In a controlled census step in a drawn state (buildBenchWorld advanced past a census year, name and seed in the PR body), the state's House seat count in the offices engine matches `censusSeats`, with the seat record ids, and a test in src/core2 says so.

**Files.** src/core2/census.ts, src/core2/modules/offices.ts, src/districts/members-per-district.ts

**Notes.** Reader for gov-redistricting-census-count; filed Oct 19 (claude/peaceful-ritchie-03780x).

Checked Oct 20 (claude/peaceful-ritchie-03780x) before building: the offices engine gets its U.S. House offices at the opening, one per district of the 2026 lines (src/core2/modules/officials.ts, offices.ts, world-races.ts; the lines come from src/districts), and nothing creates or retires a district after the opening. A changed seat count with no new map has nothing to attach to: a state that gains a seat needs a district drawn for it, and one that loses a seat needs two districts merged. So reading `censusSeats` for real waits on gov-redistricting-plan-builder (the maps) and on offices that can be added and retired during play. The read itself, a number the political map shows against the state, is small once those exist.
