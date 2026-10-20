---
id: elections-stopgap-parameters-uncalibrated-tunable
title: "Stopgaps in parameters (uncalibrated-tunable): 1 open"
area: elections
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/candidacy-calibration-g08lgv
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/candidacy/parameters.json, kind uncalibrated-tunable"
claimed-at: 2026-10-20T02:31:07.929Z
---

**What.** Replace or clear the 1 open uncalibrated-tunable stopgap row(s) in src/core2/data/candidacy/parameters.json: SG-P15-candidacy-weights. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/candidacy/parameters.json

**Notes.** First row: How much each recorded reason weighs in deciding to run for office, and the pull of staying out.

Measured Oct 20 (claude/political-game-pool-3xfqef-7), not closed. Contests now run every cycle, so the check the row waits on can be taken. Method: `buildBenchWorld` two-level, three places drawn by seeds c1 to c3 with `drawPlace(seed, "cand")`, 730 days from the game start, counting on-ballot filings (`elections` module `filings`) for contests whose filing deadline passed in the window. Mean candidates per contest (contests; contests with none):

| place                               | federal     | state        | city        | county       |
| ----------------------------------- | ----------- | ------------ | ----------- | ------------ |
| Tupelo, Arkansas (0570340)          | 1.00 (2; 0) | 1.00 (9; 0)  | 0.75 (4; 1) | 0.50 (14; 7) |
| Reidville, South Carolina (4559425) | 1.50 (2; 0) | 1.60 (10; 0) | 1.25 (4; 1) | 1.38 (13; 1) |
| Warrenville, Illinois (1778929)     | 1.00 (2; 0) | 1.43 (7; 0)  | 4.00 (4; 0) | 1.30 (10; 0) |

Against the cited band (most local seats draw one or two candidates), state and federal seats sit inside it. County and city seats do not hold across places: half of Tupelo's county contests drew no one while Warrenville's four city contests averaged four candidates, so the same weights give a spread of 0.5 to 4.0 between towns. That spread is for the builder to explain (which reasons differ between the towns' adults: engagement, time, age) before the row can close; three places is too few to move a weight, and the incumbent re-run share (the 81 percent the incumbency weight cites) was not measured here. The scratch test is not kept; it is about 30 lines over `moduleState("core2-elections-v1")` filings and contests.

Checked Oct 20 (claude/candidacy-calibration-g08lgv): the weights' check against candidate counts per seat is done in `elections-local-races-too-uncontested`: 97 percent of 30 local contests in three played towns were uncontested against 58 to 75 percent in Ballotpedia's counts, so the weights do not yet calibrate; the row stays open until that item lands.
