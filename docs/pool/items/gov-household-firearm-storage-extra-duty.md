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
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
---

**What.** The household firearms storage-duty rows contained extra adults on a same-seed reproduction: with HOUSEHOLD_FIREARMS_SEED=2724fc27c0417f7c (Atascadero, CA0603064) on clean main 4f4c069a5c, storage-duty rows held 24 people while the effective-date household and ownership records expected 20, with the same four extra person ids (person_76c8e949a5f5bbaa, person_76c8ea49a5f5bd5d, person_f502f74bd53befa1, person_f502f84bd53bf154) before and after PR #4998. The failing test, `src/core2/household-firearms.test.ts`, is not on main (PR #5371 was closed; the branch is claude/firearm-storage-extra-duty), so nothing reproduces on main. The mismatch is a record question: which rule admits four people the effective-date household, alive, age and ownership records do not.

**Cause.** Needs cause. Searched `src/core2` for `household-firearms.test.ts` (absent) and storage-duty code (only `src/core2/law-wiring-justice.test.ts` and `src/core2/public-safety.ts`); the repro seed is HOUSEHOLD_FIREARMS_SEED=2724fc27c0417f7c, Atascadero, California; the four extra ids were recorded on the branch only.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one sonnet session, to restore the test from the branch onto current main, run it at the seed, and name which rule admits the four extra people.

**Rules.** One rule, all 56 places: fix eligibility from household and law records in every drawn place without a place-specific exception. One model, two tiers: full people and counted households follow the same effective-date age, alive and firearm-ownership rules. Never skip or loosen the exact set assertion to hide the mismatch.

**Done when.** A second session restores the focused test from claude/firearm-storage-extra-duty, runs it at HOUSEHOLD_FIREARMS_SEED=2724fc27c0417f7c in Atascadero and on a fresh drawn world, and either sees it pass with the storage-duty targets justified by effective-date household, alive, age and ownership records, or rewrites this item with the rule that admits the extra people as a `Found in code:` cause.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/modules/laws.ts, src/core2/public-safety.ts

**Notes.** Independent same-seed baseline and PR comparison: both fail identically with extra person_76c8e949a5f5bbaa, person_76c8ea49a5f5bd5d, person_f502f74bd53befa1, person_f502f84bd53bf154. Preserve existing claims on release-suite-red-list-core2 and people-household-firearms.

Sent back 2026-10-20 from PR #5371 (branch claude/firearm-storage-extra-duty): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Oct 29 (CTO, second account): PR #5371 closed as stale under the owner's standing approval; back to open. Branch `claude/firearm-storage-extra-duty` is kept; claiming this item takes it over.

**Notes (Fable, Nov 10, read).** Nothing on main can show this fault: the test that found it is only on the branch claude/firearm-storage-extra-duty, whose pull request was closed, and main's storage duty is three lines in src/core2/public-safety.ts with no household record beside it. A finder would have to start from that branch. It is the CTO's call whether to drop this item or block it on the branch's work coming back.
