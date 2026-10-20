---
id: world-public-employer-staff-never-paid
title: "Staff of the opening's State Offices employer (and a few other public employers) are never paid: the employer holds no cash and no pay link"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4984
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4984 (branch claude/public-staff-never-paid): Morning check: this public-department pay fix changes both Core population admission (src/core2/population.ts and the new opening-department-pay.ts) and Government treasury/budget behavior (src/core2/budgets-treasury.ts and modules/budgets.ts), without recorded owning-area agreement. Record the Core and Government agreements on this PR, or split those changes into the owning areas’ PRs. Preserve the sourced government identities, payroll-reserve invariant and department-pay regression.; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4984 (branch claude/public-staff-never-paid): Merging current main (58b0c0ede0) conflicts in docs/pool/items/world-public-employer-staff-never-paid.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
