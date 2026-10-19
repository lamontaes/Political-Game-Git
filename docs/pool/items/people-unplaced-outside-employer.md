---
id: people-unplaced-outside-employer
title: "Commuting workers have an employer on the books: the place's outside account employs them, with pay and withholding"
area: people
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: "split from people-stopgap-residents-faked-mechanic (claude, Oct 19); SG-CORE-filled-unplaced-income and SG-CORE-unplaced-workers-income"
---

**What.** The opening shares a place's workers who commute or work in industries the town does not model as a fractional count per household, paid from one untaxed flow. Show first that a recorded job at the place's outside-market account can be paid through the ordinary work payroll with withholding (a worker, a work commitment, a payroll calendar and a payday), and name what the account needs to pay from. The player would notice that a stranger who commutes has a boss and a pay stub.

**Rules.** One model, two tiers: a counted commuter and a filled-in one are the same worker under the same pay and withholding rule, times their count. Replace, never layer: the place-level unplaced-wages flow and its fill-in copy are deleted once the job exists. Estimate, never UNKNOWN: pay is the place's median earnings marked ESTIMATED with its source. Speed: placement happens at the opening or the fill-in, with no daily scan.

**Done when.** In a test beside src/core2/modules/residents.ts tests, in a drawn place (buildBenchWorld, seed named in the PR body), one filled-in commuter has a job at the place's outside account, a work commitment on a payroll calendar, and a paid payday with withholding shown by job, commitment and journal ids.

**Files.** src/core2/opening-outside-market.ts, src/core2/work-pay-period.ts, src/core2/modules/residents.ts, src/core2/state.ts

**Notes.** Read from the code on Oct 19: the unplaced pay is one flow per place (`residents:unplaced-wages:<place>`, built in src/core2/residents.ts near line 750); a counted household holds only a fractional `unplacedWorkers` (src/core2/modules/residents.ts `packOpening`); `releaseResidentHousehold` clones the flow for a filled-in household and `returnUnplacedPay` merges it back. A job needs an employer: the place's outside-market account (src/core2/opening-outside-market.ts, kind outside-market, no opening cash) is the natural one, but whether work payroll may pay from an outsideFlow account is not yet shown.
