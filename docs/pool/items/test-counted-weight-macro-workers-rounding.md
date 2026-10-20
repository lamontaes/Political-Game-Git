---
id: test-counted-weight-macro-workers-rounding
title: "counted-weight-macro: workers at count scale 3 exceed 1.05 times three times the base in a small town (Huntington Center, Vermont, 178.1 against 166.95)"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/macro-workers-rounding
pr: #5626
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

Cause (Oct 20, claude/macro-workers-rounding): not rounding and not a scaling error. At the opening some of the town's collapsed households are filled in (they become full people). A household filled in stands for itself alone and the rest of the households it stood for go to the other households of its group (`CountedStore.releaseWeight`), so the people counted stay the same. At scale 1 that releases nothing; at scale 3 each filled-in household hands 2 more households to the others. Huntington Center, Vermont (seed 81f3003b…, place 5034675): 44 counted households and 97 counted people at scale 1; at scale 3 weights run from 3.07 to 5.14, the town holds 339 people (3 x 97 = 291, plus 48 handed over), 155.7 households and 178.1 workers (3 x 53 = 159 plus the filled-in households' share). The test compared with a bare scale times the base, which ignores that term. It now adds (scale - 1) times what the filled-in households held, keeps the 1.05 allowance, and pins this seed and place as a second case.
