---
id: world-counted-return-and-withdrawal-keyed
title: "Cash returned to the counts and counted bank withdrawals land in the household's own group account"
area: world
kind: wiring
priority: 3
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
source: added with npm run pool -- add
---

**What.** Cash a household brings back to the counts (counted-demotion.ts, reason residents.returned-to-counts.cash) and a counted bank withdrawal (accounts.ts, bank-withdrawal) are paid into the place's residents account and swept to groups by their people. Pay them into the household's own group account.

**Rules.** One model, two tiers: a counted group receives the same dollars as a full person, times its count, through its own keyed account. Replace, never layer: the place-wide split by people is deleted for this source in the same change.

**Done when.** A filled-in household returned to the counts adds its cash to its own group's account, by record id, and a withdrawal reaches the withdrawing group. A one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) shows no `SG-CORE-counted-unkeyed-money` hit from this source, and the ledger balances.

**Files.** src/core2/modules/counted-demotion.ts, src/core2/accounts.ts, src/core2/counted-money.ts

**Notes.** The largest direct source of unkeyed money after the law payouts. Measured Oct 19 in Glasgow, Delaware (seed from drawPlace("unkeyed-audit-1")): one played year had 501 unkeyed hits, 12 monthly sweeps of the residents account of about $80,000 each; direct credits into that account over the year: school-voucher $840,505, bank-withdrawal $842,511, assistance-benefit $562,379, returned-to-counts cash $927,326 (dollars), and 489 unemployment-benefit payments.
