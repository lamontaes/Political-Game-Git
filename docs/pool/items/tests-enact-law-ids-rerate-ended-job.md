---
id: tests-enact-law-ids-rerate-ended-job
title: "enact-law-ids test crashes: the wage floor re-rates a job that has ended"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/floor-ended-job
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T00:10:10.554Z
---

**What.** src/core2/enact-law-ids.test.ts fails on clean main with GOLDEN_PATH_SEED a1, b2 and c3 (each measured on main b17446f596 and again with this session's branch): 'Error: The job has ended.' thrown by rerateJob, from raiseOne in src/core2/wage-floor.ts:159, called by raiseToFloor (wage-floor.ts:34) when a minimum-wage law takes effect through runModuleCalendar. The floor walks a job list that includes a job ended earlier the same day or before, then asks the core to re-rate it.

**Rules.** Fix at the root: the floor reads only jobs still open on the day it takes effect, by the same rule for full and counted jobs. Never skip or narrow the test.

**Done when.** src/core2/enact-law-ids.test.ts passes on GOLDEN_PATH_SEED a1, b2 and c3 and two fresh seeds named in the PR; the PR names by file and line where the ended job entered the floor's list, and a test fails if an ended job is handed to rerateJob. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/wage-floor.ts, src/core2/enact-law-ids.test.ts

**Notes.** Found Oct 25 while gating laws-same-day-authority-tiebreak; red on main too.
