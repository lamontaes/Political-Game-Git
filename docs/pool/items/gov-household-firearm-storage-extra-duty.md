---
id: gov-household-firearm-storage-extra-duty
title: "Child access prevention storage duty includes extra adults on the same-seed main reproduction"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
lead: governing
standard: 2
model: haiku
effort: low
root: none
checked: fable 2026-11-10
---

**What.** The household firearms storage-duty rows contained extra adults on a same-seed reproduction: with HOUSEHOLD_FIREARMS_SEED=2724fc27c0417f7c (Atascadero, CA0603064) on clean main 4f4c069a5c, storage-duty rows held 24 people while the effective-date household and ownership records expected 20, with the same four extra person ids (person_76c8e949a5f5bbaa, person_76c8ea49a5f5bd5d, person_f502f74bd53befa1, person_f502f84bd53bf154) before and after PR #4998. The failing test, `src/core2/household-firearms.test.ts`, is not on main (PR #5371 was closed; the branch is claude/firearm-storage-extra-duty), so nothing reproduces on main. The mismatch is a record question: which rule admits four people the effective-date household, alive, age and ownership records do not. Seen: a person's card, where the storage duty reaches only the households the law covers (a wrong reach on main by seed).

**Cause.** Measured: Atascadero, California (place 0603064), seed 2724fc27c0417f7c, a 70-day probe of the played world on main b6ce398c52: it does not reproduce. The code that admitted the four extra adults was the old reach-row storage duty. The branch's own last commit (8b34aabf4b, Oct 20, on `claude/firearm-storage-extra-duty`) says main replaced it and deleted `household-firearms.test.ts`. Today the duty is `firearms` in `src/core2/public-safety.ts` (line 1513). It charges one person per household that has a gun and a child under 18 (the `households` set at line 1527) for one lock, and it marks that person `storage: true` so they are charged once. In that probe, three full households were charged, one adult each: person_3cfaa0287d2b8c44 (45; household ages 45, 47, 11, 26), person_80ad2b96d944a6c6 (41; 41, 41, 5, 0) and person_0070d3e49b05cedd (36; 36, 9, 1). None of the four ids in the What was charged. Two small edges remain in the new code and nobody has seen either one: the payer is the household's first-listed member aged 12 or older (`offendingAgeFrom`, line 306), so a teenager could be charged; and the player's own household is left out of `census.full` (line 312), so the player is never charged.

**Fix.** Nothing to build for the reported fault. Proposed: the CTO drops the item (`npm run pool -- status gov-household-firearm-storage-extra-duty dropped --by=cto`). Under the owner's Nov 10 ruling, the two edges in the Cause are depth no player sees. If the CTO wants them anyway, in `firearms` (`src/core2/public-safety.ts`), charge the oldest adult (18 or older) of each household instead of the first member listed, and leave the player's household as it is, because the player's own purchases are their choices.

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the adult-payer edge.

**Rules.** One rule, all 56 places: fix eligibility from household and law records in every drawn place without a place-specific exception. One model, two tiers: full people and counted households follow the same effective-date age, alive and firearm-ownership rules. Never skip or loosen the exact set assertion to hide the mismatch.

**Done when.** The CTO drops the item. If it is kept for the edge, a second session plays 70 days in a drawn place with a child access prevention law in force (named with its seed) and sees every person with a `storage-duty` row from `public-safety` aged 18 or older, one per household with a gun and a child.

**Waits on.** Nothing.

**Files.** src/core2/public-safety.ts, src/core2/law-wiring-justice.test.ts

**Notes.** Independent same-seed baseline and PR comparison: both fail identically with extra person_76c8e949a5f5bbaa, person_76c8ea49a5f5bd5d, person_f502f74bd53befa1, person_f502f84bd53bf154. Preserve existing claims on release-suite-red-list-core2 and people-household-firearms.

Sent back 2026-10-20 from PR #5371 (branch claude/firearm-storage-extra-duty): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Oct 29 (CTO, second account): PR #5371 closed as stale under the owner's standing approval; back to open. Branch `claude/firearm-storage-extra-duty` is kept; claiming this item takes it over.

**Notes (Fable, Nov 10, read).** Nothing on main can show this fault: the test that found it is only on the branch claude/firearm-storage-extra-duty, whose pull request was closed, and main's storage duty is three lines in src/core2/public-safety.ts with no household record beside it. A finder would have to start from that branch. It is the CTO's call whether to drop this item or block it on the branch's work coming back.

Nov 11 (cause finder for Fable B): checked on main b6ce398c52. The rule that admitted the extra adults was deleted when main replaced the reach-row storage duty (the branch's own Oct 20 merge says so). A probe at the item's seed in Atascadero charged three households one adult each, with none of the four extra ids. I propose dropping the item. The two edges left in the new code are in the Cause in case the CTO wants them.
