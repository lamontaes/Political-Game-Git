---
id: gov-enacted-budget-lines-miss-adopted-spending
title: "Enacted budget bills with line changes leave the adopted spending as it was the year before (golden path M0-13)"
area: gov
kind: bug
priority: 2
size: M
lead: governing
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The played-world spec (tests/golden-path/played-world.node-test.ts, M0-13) fails on main: 14 of 17 budget bills enacted with line changes left the adopted spending as it was the year before (2025-1, 2025-8, 2025-14). The town council passes its budget with changed lines, but the departments keep spending last year\'s amounts, so a budget the player votes on changes nothing. Replayed by the merge desk on main at 757242caa6 in Jacksonville Beach, Florida (place key 1235050, seed 81e6830a0f00dd43872485bd195cf41da5deea3fa5e8a6cab5771e3f77bf8a61), the draw golden-path-year made on #7455's head; it fails the same way on #7455's head, so it is not that PR's.

**Rules.** Never loosen the check: an enacted budget's lines must reach the adopted budget that departments spend from. The chain is the acceptance: follow one changed line from the enacted bill to the adopted budget and the payment it changes. One rule, all 56 places: the fix holds in every drawn place.

**Done when.** In a played world, `GOLDEN_PATH_SEED=81e6830a0f00dd43872485bd195cf41da5deea3fa5e8a6cab5771e3f77bf8a61 GOLDEN_PATH_PLACE_KEY=1235050 node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` passes the test "a passed budget changes spending" on main, and it passes on two fresh drawn places, naming the budget bill's record id and the department line it changed.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/legislature.ts (councilBudget), tests/golden-path/played-world.node-test.ts

**Notes.** Diagnosed Nov 8 (Laws and effects): the 14 of 17 bills named were mid-year budget-line amendments from local bodies (#7542), not annual budget bills; they reach spending by amending the adopted budget (adoptedBy 'amended by <number>', the government's enacted record carries the line change). The check expected an adopted row named for the bill. Fixed on laws/budget-lines-reach-spending (check follows an amendment to the budget it changed; amendments size to the body's median member so a line stops flipping). Verified at Jacksonville Beach FL 1235050 seed 81e6830a: all 24 budgets changed spending.
