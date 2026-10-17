---
id: tests-counted-weight-fitted-red
title: "counted-weight.test.ts expects exact scale weights; weights are now fitted to the census"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/counted-weight-fitted
pr: #4803
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T18:38:25.475Z
---

**What.** `src/core2/counted-weight.test.ts` fails on clean main in two tests: it expects a town opened at a count scale of three to hold exactly three times the counted people, and every group's monthly mover count to be exactly three times, to six digits. Main now fits each counted household's weight to the census, so the weights run from three to about 3.02 and the totals differ by a fraction of a percent (a group's pull by a few percent). The first test's later checks (the modeled count after filling a household in) also read exact weights. Rewrite the expectations to read the weights actually on the households, or to a stated tolerance, and keep the check that scale one is unchanged.

**Rules.** One model, two tiers: the test must still prove a counted group is read with the same rule as a full person, times its count. Replace, never layer: change the existing assertions, do not add a second copy beside them. One rule, all 56 places: the test keeps drawing its place from all 56 and naming the place and seed.

**Done when.** `npx vitest run src/core2/counted-weight.test.ts` passes in at least four runs, each in a place drawn from all 56 with a seed the builder did not choose (name two in the PR body), and the assertions that check scale one are unchanged and still exact.

**Files.** src/core2/counted-weight.test.ts

**Notes.** Found Oct 16 while building world-census-weight-hiring; the failures reproduce on clean main (for example: expected 1559 to be close to 1533; expected 1.1777 to be close to 1.1775). The headcount test in the same family was already rewritten for fitted weights (PR #4603).

Investigated Oct 16 (nothing pushed): the red is wider than the fitted weights. (1) Fitted totals differ from the exact multiple by up to about 9 percent in some towns, not a fraction of a percent, so a 5 percent tolerance fails in some places; the right check is the sum of the households' own weights. (2) The last assertion of the first test (`townFacts(...).modeled` against named residents plus counted people) fails at scale one, in the base world: modeled came to 2836 against 2810, and 55 against 54, so townFacts counts some resident that `plainPeople` does not (or the reverse); find which before touching the tolerances. (3) The movers test needs a longer timeout than vitest's 30 seconds when it builds two towns. Fix (2) first; it is a real count disagreement, not a tolerance.
