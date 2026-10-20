---
id: world-test-retirement-claims-guam-red
title: "retirement-claims.test fails on main in Sinajana, Guam: the first claimant's award does not start"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/retirement-guam-g08lgv
pr: #5299
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:27:26.273Z
---

**What.** The test "starts each claimant's monthly award, and every dollar balances" in src/core2/retirement-claims.test.ts fails at line 92 in Sinajana, Guam with seed 6a90f37e0d49d267cb388d1216908e30: an assertion that a boolean is true gets false. It fails the same way on main without the counted-retiree change, so it is red on main for that seed. Find which claim does not start and fix the cause, not the test.

**Rules.** One rule, all 56 places: the check draws a place and names the seed, and nothing is tuned to one seed. No dice: a claim follows the person's age, savings and traits, never a chance.

**Done when.** With GOLDEN_PATH_SEED=6a90f37e0d49d267cb388d1216908e30 and a second random seed in a drawn place, the test in src/core2/retirement-claims.test.ts passes, and the PR body names the claimant by record id and says why their award did not start.

**Files.** src/core2/modules/retirement-claims.ts, src/core2/retirement-claims.test.ts

**Notes.** Found while building world-jobs-counted-retiree-income (Oct 19).

Sent back 2026-10-20 from PR #5299 (branch claude/political-game-pool-3xfqef-3): Merge main f11fbba3498d into claude/political-game-pool-3xfqef-3 conflicts in: src/core2/retirement-claims.test.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.
