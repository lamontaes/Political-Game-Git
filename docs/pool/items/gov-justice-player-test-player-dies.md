---
id: gov-justice-player-test-player-dies
title: "justice-player.test.ts throws when the player dies in its three-year run, and loses its seed"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** One run of src/core2/justice-player.test.ts failed at load with 'Controlled person is no longer alive; unresolved intentions remain unposted.' from src/core2/player-v1.ts:217: the player character died during the test's run of up to three played years, and the bench player's next advance threw. The test draws its seed at random and prints it only in test names and its JUSTICE_PRINT file, so a failure at load loses the seed and the run cannot be repeated. Two runs with fixed seeds (p1aa11bb22cc33dd, p2ee44ff55aa66bb) passed the same day on the branch that made pleas wait for the hearing.

**Rules.** Ask why: a failing played-world test must name its place and seed so the cause can be read by record, and a player's death is an ordinary outcome of the health engine that the test should meet the way play does (the death handoff from play-m5-03), not crash on. Never weaken a test: the fix keeps every assertion.

**Done when.** src/core2/justice-player.test.ts names its seed and place in any failure, including one at load, and a played world where the player dies in the run either continues as play does after a death or ends the run at the death and still checks the case so far; the test passes on 3 seeds the builder did not choose, named in the PR body with each place.

**Files.** src/core2/justice-player.test.ts, src/bench/player.ts, src/core2/player-v1.ts

**Notes.** Found Oct 23 by claude/sleepy-carson-f8omzd (pool item justice-bail-moves-the-cash). Whether that change raised the chance of the death was not established: a defendant held before the hearing now has their own choices off for the state's time to disposition; deaths come from the health engine's hazard (src/core2/modules/health.ts:769).
