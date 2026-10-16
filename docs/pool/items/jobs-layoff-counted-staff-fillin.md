---
id: jobs-layoff-counted-staff-fillin
title: "Staff hire fills in a person who is absent in the layoff counted test"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/jobs-layoff-counted.test.ts` ('ends a counted job that belongs to a person filled in since') fails in Dorset, Vermont: `Absent person` thrown from `updatePerson` inside `fillInPerson` (state.ts, the `returning` branch) called by `hireStaff` in modules/staff.ts. It fails the same on clean main.

**Rules.** Find the person the staff review fills in who has no record in `core.people`, and fix it at the cause (do not catch the error).

**Done when.** The layoff counted test passes in Dorset, Vermont and a randomly drawn place.

**Files.** src/core2/state.ts, src/core2/modules/staff.ts, src/core2/jobs-layoff-counted.test.ts

**Notes.** Found while testing core-memory-remeasure; reproduced with my change stashed.
