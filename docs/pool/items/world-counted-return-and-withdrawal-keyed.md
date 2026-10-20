---
id: world-counted-return-and-withdrawal-keyed
title: "Cash returned to the counts and counted bank withdrawals land in the household's own group account"
area: world
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** Check that cash a household brings back to the counts and a counted bank withdrawal land in the household's own group account, and fix any path that does not. The reading of the code on main is that both already do: `countedFundOf` in `modules/residents.ts` returns the household's group fund, and `counted-demotion.ts` (reason `residents.returned-to-counts.cash`, both the demotion and the late-pay sweep) transfers into it, while `credit-deposits.ts` sets a counted household's customer account to `fundOf(api, rt, h.group)` before `withdrawSavings` runs. The fund accounts are owned by the place's residents account owner, so the Oct 19 tally that counted direct credits "into that account" may have included group funds. First, tally unkeyed money by reason key in a played year; then fix whatever source still reaches `sweepResidual` (counted-money.ts) unkeyed and pay it into the household's group fund through `countedPayment` with the household.

**Rules.** One model, two tiers: a counted group receives the same dollars as a full person, times its count, through its own keyed account. Replace, never layer: for any source still swept by people, the place-wide split is deleted in the same change. Wire to the world: each transfer is a journal record to a named group fund, and the ledger balances. Look before you ask: the registered stopgap SG-CORE-counted-unkeyed-money names the other sources (law payouts, school voucher, assistance, unemployment), which are separate work, so this item covers only returned cash and withdrawals.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) a filled-in household returned to the counts adds its cash to its own group fund by transfer record id, a counted withdrawal reaches the withdrawing group's fund by record id, the tally of unkeyed hits shows none with reason key residents.returned-to-counts.cash or bank-withdrawal, and the ledger balances. Proved by src/core2/counted-money.test.ts.

**Files.** src/core2/modules/counted-demotion.ts, src/core2/credit-deposits.ts, src/core2/counted-money.ts, src/core2/accounts.ts, src/core2/counted-money.test.ts

**Notes.** The largest direct source of unkeyed money after the law payouts. Measured Oct 19 in Glasgow, Delaware (seed from drawPlace("unkeyed-audit-1")): one played year had 501 unkeyed hits, 12 monthly sweeps of the residents account of about $80,000 each; direct credits into that account over the year: school-voucher $840,505, bank-withdrawal $842,511, assistance-benefit $562,379, returned-to-counts cash $927,326 (dollars), and 489 unemployment-benefit payments.

Oct 20 (pool feeder): spec written; likely already built: counted-demotion.ts lines 266-285 and 379-392 pay into countedFundOf, and credit-deposits.ts builds a counted target with fundOf(rt, h.group). The spec is measure-first so the builder either locks it with a test or finds the path that still leaks. The lead may close it as already built if the tally by reason key comes back empty.
