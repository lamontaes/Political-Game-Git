---
id: tests-counted-births-weight-replay-draw
title: "Record and replay the birth-weight test draw before playing its world"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6072
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/core2/counted-births-weight.test.ts:73 draws fresh crypto bytes inside each attempt and ignores the usual seed bindings. During local review of PR #6072 at f8b7d1ff41951522df88bae7cc2adccdac5daa66 its worker was OOM-killed after 84.70 seconds, before returning a test result or printing its input draw. The unrecorded input cannot be replayed on exact main, so this failure remains unclassified and no baseline equivalence is claimed.

**Rules.** One rule, all 56 places: preserve an independent root and every original cohort rather than selecting a passing place. No vacuous tests: retain the full simulation, six-attempt bound, bookkeeping and positive expected and booked birth and death assertions while making failed input reproducible.

**Done when.** The original full birth-weight test accepts a replayable independent root or recorded draw sequence and prints each place and seed before building or playing. The same recorded input can be rerun on main and the PR, without replacing a failed draw, reducing the cohort, disabling bookkeeping or weakening its positive assertions. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/counted-births-weight.test.ts

**Notes.** TODO
