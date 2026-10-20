---
id: test-counted-weight-macro-workers-rounding
title: "counted-weight-macro: workers at count scale 3 exceed 1.05 times three times the base in a small town (Huntington Center, Vermont, 178.1 against 166.95)"
area: core
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/macro-workers-rounding
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:21:18.443Z
---

**What.** On seed 81f3003b4329071a3e587bb803de9acf3816104a8fcfb0e6ca02e3ba1d4276ff, place 5034675, the workers sum at SCALE 3 is 3.2 times the base. Find whether rounding of per-household worker counts or a real scaling error causes it, and fix the source.

**Rules.** No loosened tolerance; find the cause (ask why) and fix the engine or the test's expectation with the cause named.

**Done when.** The test passes on that seed and on 20 repeated drawn seeds.

**Files.** src/core2/counted-weight-macro.test.ts, src/core2/modules/residents.ts

**Notes.** TODO

Oct 20 (claude/macro-workers-rounding): reproduced on seed 81f3003b4329071a3e587bb803de9acf3816104a8fcfb0e6ca02e3ba1d4276ff, place 5034675 (countScale 3 via buildBenchWorld twoLevel). residentCounts at scale 1: people 744, households 539, workers 53; at scale 3: people 986.0, households 650.7, workers 178.1; identical after the 2-day advance, so it is the opening, not drift. People grow only 1.33 times and households 1.21 times at "scale 3", so the counted set is not the same records with three times the weight (weights are uniform per place in `weightOf`, so the opening collapses a different set of households); workers then grow 3.36 times. Next: compare which household records `collapseToTwoLevels` keeps versus collapses at scale 1 and 3 (src/core2/residents.ts line 262 on; `keep` and `weights`), and decide whether the test should compare like for like or the collapse should hold the counted set fixed. Nothing changed in the repo.

Oct 20 (claude/macro-workers-rounding): cause found, no engine defect. Weights are applied only to the town place (44 of 539 records on that seed; the rest sit in other places at weight 1). Twelve staff hires at the opening fill in households; at scale 3 each leaves one real household and two stay counted, at scale 1 it leaves none, so counted workers are 3 x 53 + 2 x the jobs in filled-in households = 177, not 3 x 53. Test bound now adds the filled-in households (people, households, workers) to the base before scaling; `COUNTED_WEIGHT_SEED` reproduces a draw. Passes on the failing seed and on two random draws.
