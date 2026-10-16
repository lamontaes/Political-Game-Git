---
id: tests-counted-weight-fitted-red
title: "counted-weight.test.ts expects exact scale weights; weights are now fitted to the census"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/tests-counted-weight-fitted
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T18:23:27.823Z
---

**What.** `src/core2/counted-weight.test.ts` fails on clean main in two tests: it expects a town opened at a count scale of three to hold exactly three times the counted people, and every group's monthly mover count to be exactly three times, to six digits. Main now fits each counted household's weight to the census, so the weights run from three to about 3.02 and the totals differ by a fraction of a percent (a group's pull by a few percent). The first test's later checks (the modeled count after filling a household in) also read exact weights. Rewrite the expectations to read the weights actually on the households, or to a stated tolerance, and keep the check that scale one is unchanged.

**Rules.** One model, two tiers: the test must still prove a counted group is read with the same rule as a full person, times its count. Replace, never layer: change the existing assertions, do not add a second copy beside them. One rule, all 56 places: the test keeps drawing its place from all 56 and naming the place and seed.

**Done when.** `npx vitest run src/core2/counted-weight.test.ts` passes in at least four runs, each in a place drawn from all 56 with a seed the builder did not choose (name two in the PR body), and the assertions that check scale one are unchanged and still exact.

**Files.** src/core2/counted-weight.test.ts

**Notes.** Found Oct 16 while building world-census-weight-hiring; the failures reproduce on clean main (for example: expected 1559 to be close to 1533; expected 1.1777 to be close to 1.1775). The headcount test in the same family was already rewritten for fitted weights (PR #4603).
