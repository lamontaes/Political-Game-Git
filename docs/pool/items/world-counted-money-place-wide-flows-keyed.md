---
id: world-counted-money-place-wide-flows-keyed
title: "Money paid to or taken from the counted residents of a place reaches the household it belongs to, not every group by head count"
area: world
kind: wiring
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: stand-in triage Nov 10; stopgap SG-CORE-counted-unkeyed-money
---

**What.** When a business pays an owner's draw to its counted owners, when a place-wide price change or pooled property tax bill lands on counted households, and when money left in a place's residents account is swept out, the cost or the payment is shared across the place's counted groups by their number of people. It should land on the household that actually owns the business, owes the tax or buys the good. Finish the job by making each remaining caller name the counted person or household it belongs to, so the right group pays or is paid. When the last caller names its household, the shared-by-head-count branch and its stand-in are deleted. Seen: in a household's money on its page after a place-wide payment or charge.

**Cause.** Found in code: `countedPayment` in src/core2/counted-money.ts (the branch with no household calls `api.stopgap(UNKEYED_STOPGAP)` and `placeWeights`, line 894) and `sweepResidual` (line 974); callers that still pass only a place are in src/core2/modules/place-prices.ts (around lines 847 to 879), src/core2/modules/business.ts (the `others` draw near line 1524) and src/core2/housing-property-tax.ts (around line 272).

**Fix.** For each caller of `countedPayment` that passes no `personId` or `householdId`, find the household record the money belongs to (owner household, tax-owing household, buying household) and pass it. Where the money really belongs to a whole pooled set (the owners of a business who are counted), split it by the owners' households, not by place head count. Make `sweepResidual` return leftover cash to the household group that paid it in. Run in monthly steps with the existing counted-group indexes; no scan of every household per day. Delete the unkeyed branch, `UNKEYED_STOPGAP` and its row once no caller reaches it.

**Time box.** 5 hours for one sonnet session.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. Wire to the world: prove it in a generated world. An effect is a read: the group fund that moves is the one the record names. Replace, never layer: the head-count branch is deleted.

**Done when.** In a one-year run of buildBenchWorld in a place drawn from all 56 (name the place and seed, not chosen by the builder), every `countedPayment` journal entry for an owner draw, a property tax bill and a price change names the counted household or owner it belongs to, the stand-in `SG-CORE-counted-unkeyed-money` is hit zero times in that year, and the register row is resolved; a second session sees the same in a different place and seed on main and checks that one household's group fund moved by exactly its own draw or bill.

**Waits on.** Nothing.

**Files.** src/core2/counted-money.ts, src/core2/modules/place-prices.ts, src/core2/modules/business.ts, src/core2/housing-property-tax.ts, src/core2/data/stopgaps/core.json
