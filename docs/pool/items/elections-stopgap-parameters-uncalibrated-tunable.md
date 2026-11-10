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
model: opus
effort: high
root: none
---

**What.** The candidacy weights (stopgap `SG-P15-candidacy-weights`, the pull of each recorded reason to run and of staying out) give a spread of 0.5 to 4.0 candidates per contest between towns, and nobody has explained it. Measured Oct 20 (`buildBenchWorld` two-level, three places drawn by seeds c1 to c3, 730 days, on-ballot filings per contest whose deadline passed): Tupelo, Arkansas (0570340) county contests 0.50, Reidville, South Carolina (4559425) 1.38, Warrenville, Illinois (1778929) city contests 4.00. Half of Tupelo's county contests drew no one. The Nov 8 ruling (ranges are not targets; candidates run because they want to) means the weights cannot be tuned to a band, so the spread needs a cause before the row can close.

**Cause.** Needs cause. Read the item's Oct 20 table (Tupelo AR, Reidville SC, Warrenville IL); the marker `SG-P15-candidacy-weights` is in `src/core2/modules/candidacy.ts` and the row in `src/core2/data/stopgaps/p15.json`, the weights in `src/core2/data/candidacy/parameters.json`. Three places is too few to move a weight, and the incumbent re-run share was not measured.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session, to find which recorded reasons (engagement, time, age, incumbency) differ between the towns' adults and explain the spread, by record id.

**Rules.** No dice: candidates run from their traits, principles, money and the place's conditions, never a fixed percentage. Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE). Real rates check totals and never pick one actor's outcome (owner, Nov 8).

**Done when.** A second session reads the finding: for the three named places and at least two more drawn from all 56 (seeds printed), the item names by record id which reasons make a town's adults decline or file, and the item is rewritten with `Found in code:` or `Measured:` and a real Fix. The measured counts are reported beside the real figure as a report, not a pass or fail.

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
