---
id: world-player-household-pays-no-living-cost-fraser
title: "In Fraser, Colorado the player's household posts no living-cost payment in a played year"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-yucp92-az
pr: #5681
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T12:39:19.337Z
---

**What.** In a played year at Fraser, Colorado (place key 0828305, seed d8c9a58ec15036cb5a0575d72278e307d5387c37154aa2080b5127be9aa64139) the player's household has pay and contracts but no 'accounts.transfer living' outflow at all. src/core2/player-money-year.test.ts fails there with 'expected 0 to be greater than 0' on the living-cost line. Other drawn places pass, so the household's living plan is skipped under some condition of this town's household or payer; the cause is not yet traced.

**Rules.** Wire to the world: a living cost is paid from the cash household members hold. No dice: the household's cash and bills decide. One rule, all 56 places: the fix names no place.

**Done when.** Running GOLDEN_PATH_SEED=d8c9a58ec15036cb5a0575d72278e307d5387c37154aa2080b5127be9aa64139 GOLDEN_PATH_PLACE_KEY=0828305 npx vitest run src/core2/player-money-year.test.ts passes in buildBenchWorld at Fraser, with the household's living outflow shown by journal record id, and the test also passes in three other random places.

**Files.** src/core2/modules/residents.ts, src/core2/cost-of-living.ts, src/core2/player-money-year.test.ts

**Notes.** Found Oct 20 by sweeping src/core2 tests on clean main. Related but different: world-households-unpaid-living-costs-payday (#4937, arrears for full households) and world-living-costs-pay-from-household-members (done, #4939). Check whether #4937 already fixes this before building.

Oct 20: Owner ruled on #5473 that background households may split from an 18-year-old when cheap to simulate and as common as in real life, but the player's own family does not leave the player before 1.0, so the hold in moves.ts stays and SG-P15-moves-player-home-stays can be marked resolved.

Sent back 2026-10-20 from PR #5473 (branch claude/player-living-cost-fraser): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.
