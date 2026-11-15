---
name: money-trace
description: >
  How to find where one household's money goes in a played world and why a
  change made it run short: the same household with and without the change,
  its journal lines by kind, the plan against the take-home pay, and a proxy
  on a contract that shows who rewrote its amount. Use when a household is
  short on a bill, a spending or tax change moves arrears, or a contract's
  amount differs from what its builder wrote. Not for proving a feature in a
  played year (played-world-proof) or for timing a year (speed-work).
---

# Money trace

Lessons from tracing newly short property tax bills (resident spending, Nov 15).

1. **Join by household, never by count.** Log each payment with its household
   id, date, bill and paid. A short bill is `paid < bill`; a log line is not one
   (the log holds every payment). Newly short is a household short with the
   change and not short without it, at the same place and seed.
2. **With and without on one machine, committed first.** Toggle the baseline
   by checking out the base copies of the files that changed, and restore them
   from `HEAD`. Commit before you toggle: restoring from `HEAD` throws away an
   uncommitted edit, and both arms then run the same code and agree. Check
   that the arms differ (hash the logs) before reading them.
3. **One household, sixty days, by kind.** `setJournalTrace` in
   `src/core2/journal-state.ts` hands every journal input; sum the postings on
   the household's `cash:<person>:residual` accounts by `sourceRef.kind` and
   the first two id parts. Set the plan (members' `livingCostDailyMinor` times
   365/12), the wage, the mortgage payment and the property tax beside the
   sums: the outgo above the plan is the answer.
4. **Who rewrote a contract.** Patch `Map.prototype.set` before building the
   world, wrap the contract object in a `Proxy`, and log every write to
   `amountMinor` with its stack. It found `restateMortgage`
   (`src/core2/housing-past.ts`) rewriting each full owner's mortgage after
   the core was built, which stale-stamped anything computed at creation.
5. **Order of passes.** The pre-start history passes run after the core is
   built, so anything that reads a restated rent or mortgage must run after
   `housingPast`, not at world creation.
6. **Credit.** The bank's room is one pool spent in household order
   (`householdApplications` in `src/core2/modules/credit.ts`); a loan lost
   with an unchanged approval share means the room ran out first, so compare
   `applications` rows (approvedShare, limitMinor) on the day.
7. **Top-level await does not transform** under `tsx` here: wrap the script
   in an async main.
