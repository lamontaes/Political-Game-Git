---
id: world-counted-unemployment-unplaced-keyed
title: "Unemployment benefits for an unplaced counted worker land in that worker's household group, not the place's groups by their people"
area: world
kind: wiring
priority: 3
size: S
status: in-pr
claimed-by: claude/unemployment-unplaced
pr: #5271
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:06:49.901Z
---

**What.** An unemployment claim filed by a counted worker with no household member record (an unplaced worker) is paid through `transferCash` to the place's residents account, so `countedPayment` finds no person or household and splits it across the place's groups by their people. Key it to the household that holds the unplaced worker (the household whose `unplacedWorkers` count the worker belongs to) so that household's group account takes the benefit.

**Rules.** One model, two tiers: a counted group receives the same dollars as a full person, times its count, through its own keyed account. Replace, never layer: the place-wide split by people is deleted for this source in the same change.

**Done when.** A claim by an unplaced counted worker pays into that worker's household group account, by record id. A one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) shows no `SG-CORE-counted-unkeyed-money` hit from this source, and the ledger balances.

**Files.** src/core2/jobs-benefits.ts, src/core2/world-transfer.ts, src/core2/counted-money.ts

**Notes.** Built Oct 19: the claimants were not unplaced workers but counted members, plus members filled in since filing whose claim still named the place's account. A claim now pays a full person directly and keys a counted member by person. TODO
**Notes.** A first attempt that passed `personId` through `transferCash` changed nothing, because these claimants are not counted members (`countedMember` is undefined). Measured Oct 19 in Glasgow, Delaware (seed from drawPlace("unkeyed-audit-1")): one played year had 501 unkeyed hits, 12 monthly sweeps of the residents account of about $80,000 each; direct credits into that account over the year: school-voucher $840,505, bank-withdrawal $842,511, assistance-benefit $562,379, returned-to-counts cash $927,326 (dollars), and 489 unemployment-benefit payments.
Sent back 2026-10-20 from PR #5271 (branch claude/counted-unemployment-keyed): Merge conflict with main in docs/pool/items/world-counted-unemployment-unplaced-keyed.md; finish on that branch, merge main into it first.
