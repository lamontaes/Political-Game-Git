---
id: laws-reach-group-b-medicaid-fixture-no-town
title: "law-reach-group-b Medicaid fixture finds no town with an employed adult and Medicaid in forty draws"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc2-done-from-records
---

**What.** The test 'law reach, group B: Medicaid expansion and its work requirement' in src/core2/law-reach-group-b.test.ts throws 'no town with an employed adult and medicaid in forty draws' at its build helper (line 239). It fails the same way on clean main with GOLDEN_PATH_SEED=ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab, found by Merger 4 on Oct 27 while checking PR 6339. Forty drawn towns had no employed adult with Medicaid, so either the fixture's need changed with a recent engine merge or the draw is too narrow.

**Cause.** Measured: `GOLDEN_PATH_SEED=ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab` throws (seed given) "no town with an employed adult and medicaid in forty draws" from the build helper in src/core2/law-reach-group-b.test.ts (line 243).

**Fix.** Read why forty drawn towns hold no employed Medicaid adult (the coverage record or the opening changed), fix at that, and never pin a place.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice; the draw stays over all 56 places and the test must not be narrowed to a pinned place to pass.

**Done when.** A second session, not the fixer, runs src/core2/law-reach-group-b.test.ts on seed ce6921c4ecf8223891aef22043adad38db2ca4866c2a8df959c7d4dc5e98baab and on two fresh drawn places (each named with its seed), built with buildBenchWorld, and sees it pass without a pinned place; the PR names the cause of the empty draw by file and line.

**Waits on.** Nothing.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Found Oct 27 by Merger 4; red on clean main with the seed above.
