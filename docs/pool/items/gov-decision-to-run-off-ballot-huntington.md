---
id: gov-decision-to-run-off-ballot-huntington
title: "In Huntington, Utah a resident who decided to run never reached the ballot, and a council race went empty (M0-13 red on main)"
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

**What.** M0-13's played-world check fails on clean main 3bb2e63717 in Huntington, Utah (place key 4936950, seed ca75d1e89cfcf56ed5c202205d4d2f7c1eefffc04d87f324dc5ed818233ab4c7, the golden-path draw for environment PR 5915's head). The check 'a named challenger runs' reads: 1 adult other than the incumbent chose to run in the 4 races decided, and none was on the ballot. The check 'every race has someone on the ballot' reads 1 of 4 races empty (Council member, 2025-11-04). The primary-loss case is already counted (5950 on main), so this decision to run did not reach a filing at all, or its filing never reached the ballot.

**Rules.** Never weaken a test: the check keeps failing when a decision to run never reaches a filing. Ask why: name the person's candidacy decision row, their filing record or its absence, and the race, from the records of that played year.

**Done when.** In the played world for Huntington, Utah on that seed, the decision to run is followed by record id to its filing and the ballot (or the reason it stops is named and fixed in candidacy.ts), M0-13 passes on that seed and on two fresh drawn places named in the PR, and no test is weakened.

**Files.** src/core2/modules/candidacy.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Filed Oct 25 by the effects lead: it turned PR 5915's golden-path-year red, and clean main fails identically on the same seed.
