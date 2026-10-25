---
id: world-jobs-counted-retiree-income
title: "A counted retiree draws a benefit from their own earnings record"
area: world
kind: stopgap
priority: 2
size: M
status: done
claimed-by:
pr: #5224
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A counted worker who retires used to draw a place-average stand-in instead of a benefit from their own earnings record. Retirement income for the wider population should be read from each record's own covered work, age and traits, the same way a full person's claim is. The notes below show this is already on main through claimRetirementNow, so the item waits only on a merger to confirm and close it.

**Rules.** One model, two tiers: a counted retiree's award follows the same claim rule as a full person's, read from their own record, times the household's count.

**Done when.** In a buildBenchWorld played year in a drawn place (seed named), a counted worker who retires through the jobs engine's retirement path receives a positive award of their own, credited to the residents flow, shown by record id, and retirement-claims.test.ts passes without an early return.

**Files.** src/core2/modules/retirement-claims.ts, src/core2/modules/jobs.ts, src/core2/retirement-claims.test.ts

**Notes.** Sent back 2026-10-20 from PR #5250 (branch claude/pool-retiree-income): Merging main conflicts in code in src/core2/modules/jobs.ts, src/core2/modules/retirement-claims.ts, src/core2/retirement-claims.test.ts; finish on that branch, merge main into it first. TODO

Oct 20 (claude/retiree-note): nothing left to build. Merging main into the PR #5250 branch conflicts in `jobs.ts`, `retirement-claims.ts`, `retirement-claims.test.ts` and `stopgaps.json` only because main already holds the same change: `claimRetirementNow` (modules/retirement-claims.ts), called from `reviewCountedRetirements` in jobs.ts, with its test and the stopgap row resolved (from the earlier PR #5239). The CTO can mark this done and close PR #5250.

Sent back 2026-10-20 from PR #5250 (branch claude/pool-retiree-income): The body explicitly says the new retirement-claims.test.ts case returns early in a place with no qualifying retired person. That permits the retirement-award regression to pass without an assertion. Draw with bounded retries that throw on exhaustion, assert a positive counted retirement award and its credited residents flow through the ordinary jobs retirement path, and keep a named place/seed/record proof before resolving the stopgap.; finish on that branch, merge main into it first.

Oct 21 (claude, fixing PR #5224 branch claude/political-game-pool-yucp92-c): merged main, which already holds the same change (claimRetirementNow, stopgap resolved); took main for jobs.ts, retirement-claims.ts, residents.test.ts, stopgaps.json and kept this PR's only unique piece, src/core2/jobs-counted-retire-claim.test.ts (no residents:retirement:added flow).
Oct 21 (claude): already done on main by another change. `claimRetirementNow` (`src/core2/modules/retirement-claims.ts`) gives a counted worker who retires their own award from their record; the place-average stand-in is gone and its stopgap row is resolved; `retirement-claims.test.ts` has the no-early-return case (a counted person of 70 or more, fails by name if none). PR #5250 now carries no diff after merging main and should be closed as superseded. A merger can mark this item done after checking those three. Claim released.

Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-counted-retiree-income.

Sent back 2026-10-23 from PR #5224 (branch claude/political-game-pool-yucp92-c): jobs-counted-retire-claim.test.ts:67-81 can pass with every payment assertion skipped because claim.counted is never required; require a positive counted claim and prove its payment, then add the Done-when evidence table; finish on that branch, merge main into it first.
