---
id: laws-reach-group-b-medicaid-fixture-no-town
title: "law-reach-group-b Medicaid fixture finds no town with an employed adult and Medicaid in forty draws"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The test 'law reach, group B: Medicaid expansion and its work requirement' in src/core2/law-reach-group-b.test.ts throws 'no town with an employed adult and medicaid in forty draws' at its build helper (line 239). It fails the same way on clean main with GOLDEN_PATH_SEED=ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab, found by Merger 4 on Oct 27 while checking PR 6339. Forty drawn towns had no employed adult with Medicaid, so either the fixture's need changed with a recent engine merge or the draw is too narrow.

**Rules.** No dice; the draw stays over all 56 places and the test must not be narrowed to a pinned place to pass.

**Done when.** The test passes in a played world built with buildBenchWorld on seed ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab and on two fresh drawn places named with their seeds, and the cause of the empty draw is named by file and line.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Found Oct 27 by Merger 4; red on clean main with the seed above.
