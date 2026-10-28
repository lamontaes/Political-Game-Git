---
id: tests-counted-demotion-retained-cash
title: "Counted demotion retains cash where its existing money assertion expects zero"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/counted-demotion-retained-cash
pr: #5897
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T16:08:17.924Z
---

**What.** The existing counted-demotion regression fails on clean main at src/core2/counted-demotion.test.ts:84. In the randomly drawn Pylesville, Maryland world, root GOLDEN_PATH_SEED=51e5845efd36aaf2da3e67158b592735, a demoted person retains 145850 cents where the test expects zero after 300 days. This reproduces identically on PR #5852 and clean main 91134560af385ac1ffad83559d833c86a10223c2; determine the cash and payroll record chain before deciding whether settlement or the assertion is wrong.

**Rules.** Wire to the world: reconcile the retained cash against its actual payroll, account and transfer records. One model, two tiers: returning a household preserves its own cash and represented group funds without duplication or loss. No dice: repair the recorded payment path or demonstrate the correct assertion from records, never skip the test or loosen its money tolerance.

**Done when.** The exact seeded existing test passes after the root cause is explained by person, household, payable and journal record ids. A drawn-place case also passes without changing the seed to avoid the failure. The three counted-demotion tests, including the moved-household regression, pass and money totals remain balanced; the PR evidence names the actual record chain and distinguishes settlement from assertion corrections.

**Files.** src/core2/counted-demotion.test.ts, src/core2/modules/counted-demotion.ts, src/core2/counted-groups.ts

**Notes.** Found by Merger 0 while gating PR #5852 on 2026-10-23. The new moved-household case passed in 32.55 seconds; the existing in-town money case failed identically on clean main in 37.02 seconds. Logs retained in /tmp/merger0-5852/ for this cloud session.

Sent back 2026-10-24 from PR #5897 (branch claude/counted-demotion-retained-cash): current main conflicts in production code src/core2/modules/counted-demotion.ts, preventing a main-integrated gate; finish on that branch, merge main into it first.
