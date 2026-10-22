---
id: core-commuter-job-fill-in
title: "A filled-in household's jobless worker takes a job with an employer outside town, paid from the place's outside account"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/commuter-job
pr: #5613
blocked-on:
after: core-outside-pay-authority
source: "split of core-outside-wage-obligation (L), Oct 20"
claimed-at: 2026-10-22T01:11:30.793Z
---

**What.** When a counted household is filled in, its jobless workers today get a cloned unplaced income flow (`returnUnplacedPay`), which is not a job anyone can see. Replace that with a real commuter job: a worker takes a job at an employer outside town (`startCommuterJob` in `src/core2/modules/residents.ts`), with a regular payday and tax withheld to the treasuries. The neighbor you meet then has an employer, a schedule and a paycheck.

**Rules.** Replace, never layer: the cloned flow and `returnUnplacedPay` are deleted in the same change, and stopgap SG-CORE-filled-unplaced-income is resolved with the reader named. One model, two tiers: the worker follows the same job rule as a full person. No dice: who commutes comes from the place's recorded commute shares and the worker's own record.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place and seed named in the PR body) a filled-in worker who had an unplaced income now holds a job record with an outside employer, and the journal shows each payday and its withholding by entry id. A test in `src/core2/unplaced-fill-in-job.test.ts` covers the fill-in; the counted-weight and opening-capital tests still pass.

**Files.** src/core2/modules/residents.ts, src/core2/data/stopgaps.json, src/core2/unplaced-fill-in-job.test.ts

**Notes.** Split Oct 20 from core-outside-wage-obligation (L). Needs core-outside-pay-authority first. The sent-back reasons on #5076 to avoid: no loosened test tolerance, no unstated timeout increases, nothing new in src/simulation.

Sent back 2026-10-21 from PR #5613 (branch claude/commuter-job): `docs/pool/items/core-commuter-job-fill-in.md:21` requires a one-year buildBenchWorld run with its drawn place and full seed named in the PR body, and payday and withholding journal entry IDs. The body only describes the test contract; it names neither a successful drawn run nor those entry IDs. `src/core2/unplaced-fill-in-job.test.ts:80` checks that a payroll receipt ID exists but does not print the required journal chain. Supply the named positive played-world trace (including the withholding entries, or the recorded no-tax reason under the place law) and the counted-weight/opening-capital results before requesting merge.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5613 (branch claude/commuter-job): The first living-cost adult can already hold a local job, so startCommuterJob returns false without trying a jobless household member; reproduced in Willow Creek household_1404606eeae44302 after fill-in, with no commuter job and the pooled pay unchanged. Select an eligible jobless worker and cover the mixed household.; finish on that branch, merge main into it first.
