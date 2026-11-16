---
id: drives-displaced-ambition-floor-small-town
title: "M1-11 red on main in Playita, Puerto Rico: 1 of 17 displaced workers forms an ambition, under the 6% floor"
area: people
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: haiku
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The accepted spec M1-11 fails on main 90e3abef7 in Playita, Puerto Rico (place key 7263503, seed 8be0e68a6844fe807895aebee61028b0fc511fbe4baf92fc675e9d19d427046b). In src/core2/drives-economy.test.ts, the test 'forms ambitions at the displaced-worker rate, with most people carrying on' saw 0.0588 (1 of 17 displaced workers) against a floor of 0.06. The town is small, so one person moves the share by six points; the band check reads a share of too few people to hold either way. Guards: a laid-off neighbor taking up a cause in talks and the Journal, which the M1-11 test keeps right.

**Cause.** Found in code: the check now meets the item's own rule. src/core2/drives-economy.test.ts (lines 63 to 73) widens each bound by two standard errors at the sample's size (`slack = 2 * sqrt(p(1 - p) / n)`, the rule src/bench/m1-11-check.ts uses), so the floor of 0.06 reads below zero for Playita's 17 displaced workers and 0.023 for Bellview's 161. Both observed shares (0.0588 and 0.0559) pass, and the pooled rate the test cites is 9.9 percent (109 of 1,102 across six drawn towns), inside the band. Measured: `GOLDEN_PATH_PLACE_KEY=7263503 GOLDEN_PATH_SEED=8be0e68a6844fe807895aebee61028b0fc511fbe4baf92fc675e9d19d427046b npx vitest run src/core2/drives-economy.test.ts` passes all 5 tests on main cc75d71d. This morning's re-run passed Bellview and a fresh draw too.

**Fix.** Nothing to build. The CTO drops the item as done by main.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** No dice: the floor must come from the drive's own causes, not a rerun until a seed passes. One rule, all 56 places: a small town must pass by the same rule as a large one, so the check needs a sample size or a spread that a 17-person sample can meet. Ranges are not targets (owner, Nov 8): the real displaced-worker rate is reported, never steered to.

**Done when.** A second session runs the test file `src/core2/drives-economy.test.ts` at Playita, Puerto Rico and Bellview, Florida with the seeds above and in one fresh drawn place (named with its seed), and it passes in each; the item is then dropped.

**Waits on.** Nothing.

**Files.** src/core2/drives-economy.test.ts

**Notes.** Oct 29, 05:00 UTC, words and director session: also red on main 886c21ab72 and on 7abade8252 (before #6736) in Bellview, Florida (place key 1205462, seed 68c7747a284e52a1b25d6cb988de91bd09a04462452082d58f951267965e14de), the golden-path-year draw for #6736: a share of 0.0559, which is 9 of 161 displaced workers. That sample is not small, so a spread sized to the sample alone may not clear it; the rate itself sits just under the floor.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `npx vitest run src/core2/drives-economy.test.ts` with `GOLDEN_PATH_PLACE_KEY=7263503 GOLDEN_PATH_SEED=8be0e68a...046b` (Playita, Puerto Rico): green. With `GOLDEN_PATH_PLACE_KEY=1205462 GOLDEN_PATH_SEED=68c7747a...14de` (Bellview, Florida): green. Fresh draw `GOLDEN_PATH_SEED=ff34b605c07f7a0b`: green. The test prints no place on a pass. Proposed for the CTO: drop as fixed on main.

Nov 11 (cause finder for Fable B): read the test's bounds and reran Playita on main; it passes. The check already widens by the sample's own spread, as this item's rules asked, so I propose dropping it as done by main.

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): its own Fix section says "Nothing to build. The CTO drops the item as done by main." and its Cause says the fault does not reproduce on main. The reproduce-again advice in that Fix stays the way back: file a new item from the place and seed if it returns.
