---
id: world-counted-law-payouts-keyed
title: "Assistance benefits and school vouchers reach the counted households that qualify, not the place's groups by their people"
area: world
kind: wiring
priority: 3
size: M
status: in-pr
claimed-by: claude/counted-payouts-keyed
pr: #5288
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:38:05.684Z
---

**What.** The assistance benefit and the school voucher are each one obligation to the town's residents account (`reconcileObligations` in law-reach/group-b-money.ts), so the money is later swept to groups by their people instead of to the households that qualified. Pay one part per qualifying counted household or group, keyed in the flow's `amountByContract`, so only the qualifying groups receive it.

**Rules.** One model, two tiers: a counted group receives the same dollars as a full person, times its count, through its own keyed account. Replace, never layer: the place-wide split by people is deleted for this source in the same change.

**Done when.** A voucher and an assistance benefit land in the qualifying households' group accounts, by record id, and a non-qualifying group receives none. A one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) shows no `SG-CORE-counted-unkeyed-money` hit from this source, and the ledger balances.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/counted-money.ts

**Notes.** Refines SG-GOV-REACH-B-voucher-payment and the assistance-benefit rows. Measured Oct 19 in Glasgow, Delaware (seed from drawPlace("unkeyed-audit-1")): one played year had 501 unkeyed hits, 12 monthly sweeps of the residents account of about $80,000 each; direct credits into that account over the year: school-voucher $840,505, bank-withdrawal $842,511, assistance-benefit $562,379, returned-to-counts cash $927,326 (dollars), and 489 unemployment-benefit payments.
