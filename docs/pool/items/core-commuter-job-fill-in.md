---
id: core-commuter-job-fill-in
title: "A filled-in household's jobless worker takes a job with an employer outside town, paid from the place's outside account"
area: core
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/commuter-job
pr:
blocked-on:
after: core-outside-pay-authority
source: "split of core-outside-wage-obligation (L), Oct 20"
claimed-at: 2026-10-20T06:47:54.316Z
---

**What.** When a counted household is filled in, its jobless workers today get a cloned unplaced income flow (`returnUnplacedPay`), which is not a job anyone can see. Replace that with a real commuter job: a worker takes a job at an employer outside town (`startCommuterJob` in `src/core2/modules/residents.ts`), with a regular payday and tax withheld to the treasuries. The neighbor you meet then has an employer, a schedule and a paycheck.

**Rules.** Replace, never layer: the cloned flow and `returnUnplacedPay` are deleted in the same change, and stopgap SG-CORE-filled-unplaced-income is resolved with the reader named. One model, two tiers: the worker follows the same job rule as a full person. No dice: who commutes comes from the place's recorded commute shares and the worker's own record.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place and seed named in the PR body) a filled-in worker who had an unplaced income now holds a job record with an outside employer, and the journal shows each payday and its withholding by entry id. A test in `src/core2/unplaced-fill-in-job.test.ts` covers the fill-in; the counted-weight and opening-capital tests still pass.

**Files.** src/core2/modules/residents.ts, src/core2/data/stopgaps.json, src/core2/unplaced-fill-in-job.test.ts

**Notes.** Split Oct 20 from core-outside-wage-obligation (L). Needs core-outside-pay-authority first. The sent-back reasons on #5076 to avoid: no loosened test tolerance, no unstated timeout increases, nothing new in src/simulation.

Oct 20 (claude/commuter-job): a filled-in worker with an unplaced income now holds `job:commuter:<personId>:<start>` at the place outside account, paid by the payroll calendar with withholding; demotion ends the job and returns the pay and the household unplaced workers to the counted group (`protectedPeople` no longer treats the outside account as a public employer). Stopgap SG-CORE-filled-unplaced-income resolved. Test: `unplaced-fill-in-job.test.ts`.
