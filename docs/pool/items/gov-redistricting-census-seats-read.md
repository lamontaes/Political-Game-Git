---
id: gov-redistricting-census-seats-read
title: "A state's House seats change after a census, read by the offices engine and the political map"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-redistricting-census-count
source: added with npm run pool -- add
---

**What.** After a census year the House seats `censusSeats(year)` (src/core2/census.ts) gives a state become the number of U.S. House seats the offices engine and the political map use for it: a state that grew has an added district to fill at the next election and a state that shrank loses one. The player in a state that gains a seat sees a new district and an open seat; one that loses a seat sees two members drawn into one district.

**Rules.** An effect is a read, not a record: the offices engine reads the seats at the moment it schedules the next election. No dice. One rule, all 56 places (the territories have delegates and no apportioned seats). Wire to the world.

**Done when.** In a controlled census step in a drawn state (buildBenchWorld advanced past a census year, name and seed in the PR body), the state's House seat count in the offices engine matches `censusSeats`, with the seat record ids, and a test in src/core2 says so.

**Files.** src/core2/census.ts, src/core2/modules/offices.ts, src/districts/members-per-district.ts

**Notes.** Reader for gov-redistricting-census-count; filed Oct 19 (claude/peaceful-ritchie-03780x).
