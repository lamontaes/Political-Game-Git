---
id: jobs-layoff-counted-staff-fillin
title: "Staff hire fills in a person who is absent in the layoff counted test"
area: world
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #4767
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `src/core2/jobs-layoff-counted.test.ts` ('ends a counted job that belongs to a person filled in since') fails in Dorset, Vermont: `Absent person` thrown from `updatePerson` inside `fillInPerson` (state.ts, the `returning` branch) called by `hireStaff` in modules/staff.ts. It fails the same on clean main.

**Rules.** Find the person the staff review fills in who has no record in `core.people`, and fix it at the cause (do not catch the error).

**Done when.** The layoff counted test passes in Dorset, Vermont and a randomly drawn place.

**Files.** src/core2/state.ts, src/core2/modules/staff.ts, src/core2/jobs-layoff-counted.test.ts

**Notes.** Found while testing core-memory-remeasure; reproduced with my change stashed.

Sent back 2026-10-16 from PR #4767 (branch claude/layoff-staff-fillin): jobs-layoff-counted.test.ts replaces the regression for a counted job held by a filled-in person with assertions over arbitrary ended counted jobs. The PR body confirms the original mixed-tier layoff scenario is no longer reached, so that coverage is weakened. Preserve a fixture or generated route that fills the counted worker in before the layoff, and assert that specific job ends and stops paying; keep the returning-household fix separately. The morning check forbids weakened tests; finish on that branch, merge main into it first.
