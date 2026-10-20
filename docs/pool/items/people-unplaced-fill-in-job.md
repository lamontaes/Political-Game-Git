---
id: people-unplaced-fill-in-job
title: "A filled-in commuter gets the real job instead of a copy of the place's unplaced-pay flow"
area: people
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
after:
blocked-on:
source: "split from people-stopgap-residents-faked-mechanic (claude, Oct 19); SG-CORE-filled-unplaced-income and SG-CORE-unplaced-workers-income"
---

**What.** Fill-in gives a counted household's unplaced share to its worker as a flow of their own, untaxed. Once an outside employer exists, create the worker's job, commitment and calendar at fill-in instead, and have a household returning to the counts hand the job back as its share of the place's unplaced workers. The player would notice a clicked stranger's pay stub has tax taken out.

**Rules.** One model, two tiers: a counted commuter and a filled-in one are the same worker under the same pay and withholding rule, times their count. Replace, never layer: the place-level unplaced-wages flow and its fill-in copy are deleted once the job exists. Estimate, never UNKNOWN: pay is the place's median earnings marked ESTIMATED with its source. Speed: placement happens at the opening or the fill-in, with no daily scan.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a filled-in worker's year shows a job id, withholding and no flow named residents:unplaced-wages for them, and a household returned to the counts restores its share (src/core2/counted-weight-unplaced.test.ts). SG-CORE-filled-unplaced-income closes in stopgaps.json.

**Files.** src/core2/modules/residents.ts, src/core2/state.ts, src/core2/counted-weight-unplaced.test.ts, src/core2/data/stopgaps.json

**Notes.** Read from the code on Oct 19: the unplaced pay is one flow per place (`residents:unplaced-wages:<place>`, built in src/core2/residents.ts near line 750); a counted household holds only a fractional `unplacedWorkers` (src/core2/modules/residents.ts `packOpening`); `releaseResidentHousehold` clones the flow for a filled-in household and `returnUnplacedPay` merges it back. A job needs an employer: the place's outside-market account (src/core2/opening-outside-market.ts, kind outside-market, no opening cash) is the natural one, but whether work payroll may pay from an outsideFlow account is not yet shown.

**Built Oct 19 (claude/peaceful-ritchie-03780x).** `releaseResidentHousehold` (src/core2/modules/residents.ts) now starts a job for the household's jobless worker at the place's outside account (`startCommuterJob`: the share of the place's unplaced pay as the payday's pay, the schedule and payday of a private worker on the books, the account's pay authority naming the commitment). The cloned flow, the stopgap marker and `returnUnplacedPay` are deleted; a person employed at the outside account is protected from demotion by the existing rule for employers that are not businesses, so a met commuter stays a full person. SG-CORE-filled-unplaced-income is resolved. Proof: src/core2/unplaced-fill-in-job.test.ts (job at the account, the share taken from the place's flow, no flow of their own, withholding records after 45 days, the account still at zero). Left: the opening's own counted unplaced workers are still the one place-level flow (people-unplaced-outside-employer), and a commuter's pay does not follow the place's pay level the way the flow did (it was `payIndexed`).
