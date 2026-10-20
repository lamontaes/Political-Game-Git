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
---

**What.** The focused household-firearms test still fails on exact clean main 4f4c069a5c4c04d5a322934429475b018d2b679c with HOUSEHOLD_FIREARMS_SEED=2724fc27c0417f7c (Atascadero, CA0603064): storage-duty rows contain 24 people while the effective-date household and ownership records expect 20. PR #4998 preserves the exact set assertion and corrects only the age reference date; the same four extra person IDs occur before and after that PR. Diagnose the record mismatch at its cause.

**Rules.** One rule in all places, generated world with every module installed, one model in both population tiers. Do not weaken the exact set assertion, retry until green, or special-case a place. Preserve the resolved firearm ownership feature and stopgap history.

**Done when.** The focused household-firearms test passes with the reported seed and a fresh drawn world, with the storage-duty targets justified by effective-date household, alive, age and ownership records; changed-file checks pass.

**Files.** src/core2/household-firearms.test.ts, src/core2/law-reach/group-a-records.ts, src/core2/modules/laws.ts

**Notes.** Independent same-seed baseline and PR comparison: both fail identically with extra person_76c8e949a5f5bbaa, person_76c8ea49a5f5bd5d, person_f502f74bd53befa1, person_f502f84bd53bf154. Preserve existing claims on release-suite-red-list-core2 and people-household-firearms.
