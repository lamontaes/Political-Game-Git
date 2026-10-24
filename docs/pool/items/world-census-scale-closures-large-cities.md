---
id: world-census-scale-closures-large-cities
title: "A city far above 40,000 people closes firms at its Census size that it keeps at the sample size (Washington, D.C.: 5 against 0)"
area: world
kind: bug
priority: 2
size: M
status: blocked
claimed-by:
pr: #5803
blocked-on: world-counted-weight-release-grows-employer-staff (the pinned Washington, D.C. Census-size proof fails on that cause, PR #5803 comment 6331948796)
source: added with npm run pool -- add
claimed-at:
---

**What.** The census-scale closures test draws places from 10,000 to 40,000 people because a larger city's year does not fit one test process's memory. Washington, D.C. (census 693,645, scale 69.4), drawn once, closed 5 firms at its Census size against none at the sample size before the payroll-savings and owner-draw fixes of PR #5553, and was not rerun after them. Measure a large city at its Census size after those fixes and fix any remaining reader that does not multiply by the weight.

**Rules.** One model, two tiers: every reader multiplies by the weight the same way. No dice: a firm closes from its books and its owner's choice. Speed: the year must fit the two-minute rule, or the test runs the span the failure needs.

**Done when.** In a played world built with buildBenchWorld at Census scale in Washington, D.C. and one more drawn place above 100,000 (seeds named), closure rows in the jobs engine are within the same town's count at scale one, by job change id, shown by a test in src/core2.

**Files.** src/core2/census-scale-closures-support.ts, src/core2/modules/business.ts

**Notes.** Found working world-census-scale-closures-rise (PR #5553).

Sent back 2026-10-21 from PR #5803 (branch claude/closures-large-cities): Merging current main conflicts in src/core2/modules/business.ts in the owner-draw block around line 1324. This is a money/units conflict: the branch splits a full owner draw through businessScaleOf and multiplies a counted payment by heads, while current main changed the counted-owner path to receive the whole group draw and record the journal amount. Reconcile the large-city share change with current countedPayment semantics and preserve conservation rather than taking one side blindly. Parent #5553 is now merged into main (23:10 UTC); this PR should describe the remaining slice against that main. I aborted the local merge without pushing; no integrated head or local gate pass exists. After resolving with a plain main merge, rerun the changed-file checks and the pinned DC plus drawn large-city proof.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5803 (branch claude/closures-large-cities): The required pinned Washington, D.C. Census-size closure proof still fails on the published merged head; no fixing commit follows the fixer's failure report. Rechecked unchanged head f6c98748e4; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/5803#issuecomment-6331948796; finish on that branch, merge main into it first.
