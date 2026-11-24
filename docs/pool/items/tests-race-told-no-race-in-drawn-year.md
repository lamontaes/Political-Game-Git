---
id: tests-race-told-no-race-in-drawn-year
title: "The race-told scene test draws eight places and none tells a race in its year (red on main at CI's seed)"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: Story session, Nov 10, PR #8149's unit check; red on clean main at seed 409bddfc193b4c846dc319e3c885512097206472
claimed-at:
---

**What.** `src/director/race-told-scene.test.ts` (removed) fails on clean main (535e8a6001) at `GOLDEN_PATH_SEED=409bddfc193b4c846dc319e3c885512097206472`: "no drawn place had a race told in the year". Of the eight drawn places, four had no race to enter that year (South Windham, Connecticut; Washington, District of Columbia; Westfield, Iowa; Quinebaug, Connecticut) and four had no race told (Faleniu, American Samoa; Frederiksted, U.S. Virgin Islands; Ripley, West Virginia; Plymouth, New Hampshire). The test passes at seed 11. Either the test's year misses the places' election calendars, or the scene's producer does not fire where a count happened; which one is not yet known.

**Rules.** One rule, all 56 places: the test draws from all 56 and must find a told race in any of them that holds a count that year. Wire to the world: the scene is cast from the election engine's own count record, never a staged one.

**Done when.** For each of the eight places above, the run names why no race was told (no count that year from the place's election calendar, or a count with no one tied to a candidate), the test widens its draw or its year to places whose records hold a count, and it passes at seed 409bddfc… and at seed 11.

**Files.** `src/director/race-told-scene.test.ts` (removed), src/director (the race-told producer)

**Notes.** Nov 10, 15:25 UTC (Story): red again on CI at seed 13185266f8e7978e6bec3346aacf921bab78efe0, same message (Little Rock, South Carolina, no race to enter that year; Old Agency, Montana, no race told in the year; and the rest of its draw), so it fails on more than one seed; seed 11 passes.
