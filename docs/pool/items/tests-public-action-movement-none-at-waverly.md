---
id: tests-public-action-movement-none-at-waverly
title: "The movement test is red at Waverly, New York: eleven months of rent and health protests found no group"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: views
model: opus
effort: medium
source: views thread, Nov 14 (seen while gating #9224)
---

**What.** `src/core2/modules/public-action-movement.test.ts` is red at Waverly, New York, with the seed below. Protests over jobs, rent and health ran for 4 to 11 months, and nobody founded a residents' group. The test expects at least one to. Either the decision to found a group misses a crowd that should carry it, or the test's staged change is too weak for a town like Waverly and should pick the case it needs, as the pinned-tests skill says. The player would see protests that never become a movement. Seen: the town's protests and the interest groups list.

**Cause.** Needs cause. Measured: `GOLDEN_PATH_SEED=141da7ca5e1488be npx vitest run src/core2/modules/public-action-movement.test.ts` prints "Waverly, New York (3678806), seed 141da7ca5e1488be:0: protest/jobs 6 months, protest/rent 11 months, rally/health 11 months, protest/jobs 4 months; movements none" and fails "a crowd became a movement: expected 0 to be greater than 0". It fails the same way on the train at 628ff74d without the views-from-life cut 2 change. It passed at Preston, Nevada, seed d1074bca253df146.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** No dice: the crowd, the grievance and the organizer's ties decide. Never loosen a test to get green.

**Done when.** The test is pinned or fixed and passes at Waverly seed 141da7ca5e1488be or names why that town founds no group; a second session runs it on the train or main, in a drawn place it names with its seed, and sees a crowd become a movement in the interest groups list.

**Waits on.** Nothing.

**Files.** src/core2/modules/public-action.ts, src/core2/modules/interest-groups.ts, src/core2/modules/public-action-movement.test.ts

**Notes.** Nov 14 (claude, views thread): found while gating #9224; red on the clean train at the same seed. Where to look: the organizer's decision in `src/core2/modules/public-action.ts` against the interest-group engine's founding in `src/core2/modules/interest-groups.ts`; if the decision is right for that town, pin the test to places where the case occurs (pinned-tests), and if it is wrong, fix the decision.
