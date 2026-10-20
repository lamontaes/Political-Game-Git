---
id: world-jobs-counted-retiree-income
title: "A counted retiree draws a benefit from their own earnings record"
area: world
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/counted-retiree-income
pr: #5455
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:09:18.979Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Sent back 2026-10-20 from PR #5250 (branch claude/pool-retiree-income): Merging main conflicts in code in src/core2/modules/jobs.ts, src/core2/modules/retirement-claims.ts, src/core2/retirement-claims.test.ts; finish on that branch, merge main into it first. TODO

Oct 20 (claude/retiree-note): nothing left to build. Merging main into the PR #5250 branch conflicts in `jobs.ts`, `retirement-claims.ts`, `retirement-claims.test.ts` and `stopgaps.json` only because main already holds the same change: `claimRetirementNow` (modules/retirement-claims.ts), called from `reviewCountedRetirements` in jobs.ts, with its test and the stopgap row resolved (from the earlier PR #5239). The CTO can mark this done and close PR #5250.
