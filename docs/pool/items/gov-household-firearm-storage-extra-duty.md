---
id: gov-household-firearm-storage-extra-duty
title: "Child access prevention storage duty includes extra adults on the same-seed main reproduction"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/firearm-storage-extra-duty
pr: #5371
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:21:11.557Z
---

**What.** The focused household-firearms test still fails on exact clean main 4f4c069a5c4c04d5a322934429475b018d2b679c with HOUSEHOLD_FIREARMS_SEED=2724fc27c0417f7c (Atascadero, CA0603064): storage-duty rows contain 24 people while the effective-date household and ownership records expect 20. PR #4998 preserves the exact set assertion and corrects only the age reference date; the same four extra person IDs occur before and after that PR. Diagnose the record mismatch at its cause.

**Rules.** One rule, all 56 places: fix eligibility from household and law records in every drawn place without a place-specific exception. One model, two tiers: full people and counted households follow the same effective-date age, alive and firearm-ownership rules. Never skip or loosen the exact set assertion to hide the mismatch.

**Done when.** The focused household-firearms test passes with the reported seed and a fresh drawn world, with the storage-duty targets justified by effective-date household, alive, age and ownership records; changed-file checks pass.

**Files.** src/core2/household-firearms.test.ts, src/core2/law-reach/group-a-records.ts, src/core2/modules/laws.ts

**Notes.** Independent same-seed baseline and PR comparison: both fail identically with extra person_76c8e949a5f5bbaa, person_76c8ea49a5f5bd5d, person_f502f74bd53befa1, person_f502f84bd53bf154. Preserve existing claims on release-suite-red-list-core2 and people-household-firearms.

Sent back 2026-10-20 from PR #5371 (branch claude/firearm-storage-extra-duty): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.
