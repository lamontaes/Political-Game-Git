---
id: core-stance-causes-grow-without-limit
title: "A stance in the player's circle keeps every cause, 2,850 of them after three years in one town, and each new cause copies the list"
area: people
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/stance-causes-bounded
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T20:38:09.285Z
---

**What.** The views engine keeps every cause of a stance for the player's circle (and for everyone when bookkeeping is on), and writes the whole stance row on each new cause, so the cost of one more cause grows with the causes already kept. In Bedford, Wyoming (seed 9a4dd331ace7, place 5606045, a played year from January 20, 2025) one stance held 251 causes after a year, 1,221 after two and 2,850 after three, and the town held 31,452 causes in all. The readers only ask for causes after a date or for one event's id, so old causes are dead weight. A copy of the row (`plainCopy`) took 7.3 s of a 182 s three-year run.

**Rules.** Bookkeeping is a debug switch: reasons are kept for the player and the people they deal with, not without limit. Speed: a town's game year runs in under two minutes and no change makes it more than 20 percent slower. Every number is in the parameter table, TUNABLE with the spread it is checked against.

**Done when.** In a three-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, no stance holds more causes than the parameter allows, shown by stance record id, and the latest cause is always kept; a test in src/core2/views.test.ts covers it and fails without the cap.

**Files.** src/core2/modules/views.ts, src/core2/data/views/views.json, src/core2/views.test.ts

**Notes.** Built with the cap `stanceCausesKept` (24, spread 12 to 48). The 3-year profile of Bedford shows `plainCopy` falling from 7.3 s to under 0.5 s; the year seconds (39, 59, 82) stay within run-to-run noise of before (37, 55, 82), so the slowdown of later years has another cause: see core-later-years-slower-drive-holders-offers.
