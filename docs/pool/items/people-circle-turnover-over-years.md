---
id: people-circle-turnover-over-years
title: "M0-07: nothing checks that a circle's turnover over years matches a sourced study"
area: people
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-circle-turnover
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T06:43:16.673Z
---

**What.** Roadmap M0-07's test text ends 'over years, circle turnover matches a sourced study'. Its command (src/core2/m0-meeting-people.test.ts) passes on main b09ba675cd in Bridgeville, Pennsylvania, but its four tests cover 91 days only: new acquaintances, a tie growing closer, saved reasons and visits inside the GSS and ATUS ranges. No test plays years or compares how many of a person's ties are replaced with a study. Research the turnover rate, then add the multi-year check against it.

**Rules.** Research before building: the turnover rate is SOURCED from a fetched study with its citation, and it checks the total, never one tie's fate (No dice). Wire to the world: the check plays a world built with buildBenchWorld in a drawn place.

**Done when.** A test plays at least three years of a world built with buildBenchWorld in a place drawn from all 56 (place and seed named) and checks the share of the player's circle replaced against the sourced study's range; it runs from the M0-07 command, passes in two drawn places and fails when ties never end.

**Files.** src/core2/m0-meeting-people.test.ts, src/core2/data/parameters.json

**Notes.** Found by the M0-M2 lead, Oct 24. Blocks roadmap M0-07's flag.
