---
id: elections-stopgap-parameters-uncalibrated-tunable
title: "Stopgaps in parameters (uncalibrated-tunable): 1 open"
area: elections
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5436
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/candidacy/parameters.json, kind uncalibrated-tunable"
claimed-at:
after:
lead: elections
standard: 2
model: haiku
effort: low
root: none
size: M
checked: fable 2026-11-10
---

**What.** The candidacy weights (stopgap `SG-P15-candidacy-weights`, the pull of each recorded reason to run and of staying out) give a spread of 0.5 to 4.0 candidates per contest between towns, and nobody has explained it. Measured Oct 20 (`buildBenchWorld` two-level, three places drawn by seeds c1 to c3, 730 days, on-ballot filings per contest whose deadline passed): Tupelo, Arkansas (0570340) county contests 0.50, Reidville, South Carolina (4559425) 1.38, Warrenville, Illinois (1778929) city contests 4.00. Half of Tupelo's county contests drew no one. The Nov 8 ruling (ranges are not targets; candidates run because they want to) means the weights cannot be tuned to a band, so the spread needs a cause before the row can close.

**Cause.** Measured: a probe on main d59e6935d7 played five places drawn with `drawPlace(seed, "cand")` (`buildBenchWorld` two-level, 730 days) and counted on-ballot filings per contest whose deadline passed, plus every kept candidacy decision and its reasons. Mean candidates per contest:

| place (seed)                   | federal | state | city                | county               |
| ------------------------------ | ------- | ----- | ------------------- | -------------------- |
| Tupelo, Arkansas (c1)          | 2.50    | 2.00  | 1.00                | 0.93 (1 of 14 empty) |
| Reidville, South Carolina (c2) | 2.00    | 3.50  | 1.71 (1 of 7 empty) | 0.79 (4 of 14 empty) |
| Warrenville, Illinois (c3)     | 4.00    | 4.57  | 2.00                | 1.20                 |
| Deering, North Dakota (c4)     | 2.00    | 2.18  | 1.00                | 1.00                 |
| St. Georges, Delaware (c5)     | 4.00    | 4.20  | none                | 1.13                 |

The Oct 20 spread of 0.5 to 4.0 on local seats is gone: county seats now run 0.79 to 1.20 and city seats 1.00 to 2.00. Incumbents stood again in 55 of the 66 county and city contests where one was asked (`standAgain`). Across the 23,626 newcomers weighed, the recorded reasons that differ most between places are `wave` (-0.97 in Tupelo and -1.21 in Deering, against +0.27 in Warrenville and +0.29 in St. Georges), `officeOpportunity` (-0.98 and -1.33 against -0.47 and -0.32) and `field` (-0.73 to -2.02, more negative where more people already run). `engagement` (+1.37 to +1.53) and `time` (-0.30 to -0.46) barely differ. In Reidville's four empty county contests 685 adults were asked, and the best of them still stood 1.07 to 1.40 short of running (stay out over run, the kept `scores`). So the spread between towns comes from the year's partisan wave and how many offices are open to a newcomer, both recorded per place, and the weights in `src/core2/data/candidacy/parameters.json` read them as built.

**Fix.** Nothing to change in the weights: the Nov 8 ruling says ranges are not targets, and the remaining spread is explained by recorded reasons. Proposed: the CTO closes the item (`npm run pool -- status elections-stopgap-parameters-uncalibrated-tunable done --by=cto`) and leaves the row `SG-P15-candidacy-weights` in `src/core2/data/stopgaps/p15.json` open as TUNABLE with this table as its check. Empty county ballots, like Reidville's four, are what the empty-ballot items (such as `gov-empty-ballot-stay-out-and-late-vacancy`) hold.

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** No dice: candidates run from their traits, principles, money and the place's conditions, never a fixed percentage. Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE). Real rates check totals and never pick one actor's outcome (owner, Nov 8).

**Done when.** The CTO closes the item. If it is kept, a second session runs the same count in two more places drawn from all 56 (seeds printed) on main and reports each place's candidates per contest by level beside the reasons `wave`, `officeOpportunity` and `field`, as a report, not a pass mark.

**Waits on.** Nothing.

**Files.** src/core2/data/candidacy/parameters.json, src/core2/modules/candidacy.ts, src/core2/data/stopgaps/p15.json

**Notes.** First row: How much each recorded reason weighs in deciding to run for office, and the pull of staying out.

Measured Oct 20 (claude/political-game-pool-3xfqef-7), not closed. Contests now run every cycle, so the check the row waits on can be taken. Method: `buildBenchWorld` two-level, three places drawn by seeds c1 to c3 with `drawPlace(seed, "cand")`, 730 days from the game start, counting on-ballot filings (`elections` module `filings`) for contests whose filing deadline passed in the window. Mean candidates per contest (contests; contests with none):

| place                               | federal     | state        | city        | county       |
| ----------------------------------- | ----------- | ------------ | ----------- | ------------ |
| Tupelo, Arkansas (0570340)          | 1.00 (2; 0) | 1.00 (9; 0)  | 0.75 (4; 1) | 0.50 (14; 7) |
| Reidville, South Carolina (4559425) | 1.50 (2; 0) | 1.60 (10; 0) | 1.25 (4; 1) | 1.38 (13; 1) |
| Warrenville, Illinois (1778929)     | 1.00 (2; 0) | 1.43 (7; 0)  | 4.00 (4; 0) | 1.30 (10; 0) |

Against the cited band (most local seats draw one or two candidates), state and federal seats sit inside it. County and city seats do not hold across places: half of Tupelo's county contests drew no one while Warrenville's four city contests averaged four candidates, so the same weights give a spread of 0.5 to 4.0 between towns. That spread is for the builder to explain (which reasons differ between the towns' adults: engagement, time, age) before the row can close; three places is too few to move a weight, and the incumbent re-run share (the 81 percent the incumbency weight cites) was not measured here. The scratch test is not kept; it is about 30 lines over `moduleState("core2-elections-v1")` filings and contests.

Sent back 2026-10-23 from PR #5436 (branch claude/candidacy-calibration-g08lgv): this measurement-only PR still marks the unfinished calibration umbrella for automatic completion while SG-P15-candidacy-weights stays open; use a bounded reporting item and a Done-when evidence table; finish on that branch, merge main into it first.

**Notes (Fable, Nov 10, model).** The sort marked this for a Fable-level model. Read again by Fable: A calibration read inside the candidacy engine: Opus at high effort.

Nov 11 (cause finder for Fable B): counted candidates and their kept reasons over 730 days in five drawn places on main d59e6935d7. The spread on local seats has narrowed to 0.79 to 1.20 for county seats. What is left follows the recorded `wave`, `officeOpportunity` and `field` reasons, which differ by place. I propose closing the item with no weight change.
