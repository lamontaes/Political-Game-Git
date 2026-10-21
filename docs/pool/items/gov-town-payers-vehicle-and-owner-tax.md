---
id: gov-town-payers-vehicle-and-owner-tax
title: "Owner-run business profit is its owner's income, and vehicle taxes come from household records"
area: gov
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/gov-town-payers-owner-tax
pr: #4798
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T19:02:32.463Z
---

**What.** Two town payers still pay no tax to the treasuries. An owner-run business's profit is its owner's income under the law, but the books never pass it to the owner, so nothing is taxed (stopgap SG-WORLD-business-profit-pass-through). And the town's residents owe vehicle and other taxes that today only an outside group of payers pays, though the household records hold the vehicles. Pass an owner-run business's profit to its owner's income, taxed by the law in force, and compute the vehicle tax from the vehicles on household records, paying each to the treasuries on the due dates in the revenue payers data, with the outside group's installment reduced by the same amount.

**Rules.** An effect is a read: the law in force sets the rate and the business books and household records set the base. No dice. One rule, all 56 places: rates and due dates are data. One model, two tiers: counted households owe the vehicle tax by the same rule as full ones, times their count. The chain is the acceptance: follow one owner's business profit and one household's vehicle to the payment and the treasury line. Replace, never layer: the pass-through stopgap row closes in the same change. Uses noteTownRevenue in budgets-treasury.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56 with the seed named in the PR body, a named owner-run business's profit appears as its owner's taxable income and is taxed, a named household pays vehicle tax on a vehicle in its record by transfer id, the treasury line rises by the payment and the outside group's installment falls by the same, and SG-WORLD-business-profit-pass-through closes; tests in src/core2/town-payers-vehicle-owner-tax.test.ts (new).

**Files.** src/core2/modules/employer-taxes.ts, src/core2/budgets-treasury.ts, src/core2/data/budgets/revenue-payers.json, src/core2/data/stopgaps.json

**Notes.** The rest of gov-town-payers-corporate-vehicle-tax, whose corporate no-double-tax part is built. The state corporate tax waits on laws-state-corporate-income-tax.
