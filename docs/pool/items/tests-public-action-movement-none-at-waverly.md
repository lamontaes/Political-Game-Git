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

**Cause.** Measured: Waverly, New York (3678806), `GOLDEN_PATH_SEED=141da7ca5e1488be npx vitest run src/core2/modules/public-action-movement.test.ts` on the train at 53e4b29fe8, with a temporary print in `standMovement` (not committed) of each month's decision. The engine is right at Waverly and the test asks for a case this town does not hold. Three crowds turn out. (1) The rent protest is large and willing: 23 people in February 2025, 51 to 58 from March on, and 50 or more of them say yes to founding each month. But a residents' group for rent stabilization already stood: it was formed on February 4, 2025 over bill 2025-2, when residents who held a strong view for the bill's question organized on its side (the residents' groups a bill raises in src/core2/modules/interest-groups.ts), one day before the first month of protest. `standMovement` then takes the crowd into the standing group (37 members in February, 120 by December) and, as its comment says, reports no founding. So no `civic.movement` record is written. (2) The jobs protest never has more than 9 people and none of them has a tie to another worth more than 0.03, so the best case for founding is 0.39 short of the bar in December and further short before. Nobody says yes, which is the rule working: a small crowd of strangers founds nothing. (3) The health crowd is a rally, which has no demand and cannot found a group. The test's first check, "a crowd became a movement", counts only `civic.movement` records, so it fails in any town where a bill formed the group first.

**Fix.** Pin the test, as `pinned-tests` says, to named places where a grievance crowd founds its own group (Preston, Nevada, seed d1074bca253df146 is one; find two more by drawing) and keep every check as it is. Add Waverly at the seed above as a second named case with its own checks: the rent crowd's people are members of the group that already stood, that group's `formedOver` is the bill and not the protest, and no `civic.movement` record names it. No engine change. Whether the town should hear that a crowd joined a standing group is a design call for the lead, not part of this item.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** No dice: the crowd, the grievance and the organizer's ties decide. Never loosen a test to get green.

**Done when.** The test is pinned or fixed and passes at Waverly seed 141da7ca5e1488be or names why that town founds no group; a second session runs it on the train or main, in a drawn place it names with its seed, and sees a crowd become a movement in the interest groups list.

**Waits on.** Nothing.

**Files.** src/core2/modules/public-action.ts, src/core2/modules/interest-groups.ts, src/core2/modules/public-action-movement.test.ts

**Notes.** Nov 14 (claude, views thread): found while gating #9224; red on the clean train at the same seed. Where to look: the organizer's decision in `src/core2/modules/public-action.ts` against the interest-group engine's founding in `src/core2/modules/interest-groups.ts`; if the decision is right for that town, pin the test to places where the case occurs (pinned-tests), and if it is wrong, fix the decision. Nov 15 (Fable B): cause found on the train at 53e4b29fe8; see Cause. The standing group's row on February 5, 2025: formed 2025-02-04, formed over "2025-2", 37 members, speaker person_4d1bea72fb44a9c6.
