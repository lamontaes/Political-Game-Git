---
id: release-arrears-jobless-writeoff-proof
title: "Prove the living-cost write-off on an actually jobless household"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5760
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The arrears audit fix merged with a test that bounds all full-household flows and succeeds when any write-off is positive. It never identifies a household with no active job, so an underpaid working household can satisfy every assertion. The original audit acceptance specifically names jobless households, and that case remains unproved even though its tracking item is now done. Add positive generated-world evidence for that case without dropping the existing all-flow or balanced-journal checks.

**Rules.** Wire to the world: match a positive write-off to the actual household and its job records in the generated world, rather than treating any written-off balance as proof of the jobless case. Keep the full and counted money paths and the existing balance checks intact.

**Done when.** In a drawn one-year buildBenchWorld run, the test identifies a household with no active job when its living-cost write-off occurs, names the household and flow record id, and asserts a positive written-off amount with arrears under the configured bill ceiling. The PR names the place and full seed. Every draw retains the all-flow ceiling and balanced-journal assertions, and bounded redraws fail if no qualifying case occurs.

**Files.** src/core2/living-costs-arrears.test.ts, src/core2/modules/residents.ts

**Notes.** Found during merger review after PR #5524 landed at a26232e02519d6386cf4edef7a3da5e4f7d82ffb. Its head 690a0f7958ff9ffd42ec6188be28d3ac7865af54 is a main merge; the test still returns when total writtenOffMinor is positive without identifying a jobless household. The earlier send-back is preserved in release-audit-09-arrears-write-off Notes. This item repairs the missing proof; it does not claim the engine fix itself is wrong.

Sent back 2026-10-20 from PR #5760 (branch claude/arrears-jobless-proof): The household/flow witness and retained all-flow checks improve the previous test. However, src/core2/living-costs-arrears.test.ts advances 30 days, then treats any writtenOffMinor increase during that interval as jobless if the household has no job at the interval end. A household can have a job when the write-off occurs and lose it before that sample, so this still does not prove joblessness at the write-off date. The eight iterations also play 240 days, while the item explicitly requires a one-year run. Observe the write-off transition at its actual date, match active jobs at that date, retain the global ceiling and balanced-journal checks, and run the full 365-day acceptance. Include those results in the required Done when table; no local gate pass is claimed here.; finish on that branch, merge main into it first.
