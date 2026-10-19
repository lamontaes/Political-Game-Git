---
id: laws-cannabis-sales-tax
title: "Legal cannabis sales go through the sales receipt so the sales tax in force collects on them"
area: laws
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/cannabis-sales-tax-s5
pr: #4851
blocked-on:
after: laws-family-cannabis
source: added with npm run pool -- add
claimed-at: 2026-10-17T01:02:30.420Z
---

**What.** Legal cannabis retail sales do not go through the sales receipt, so the sales tax in force never collects on them and a state that taxes cannabis loses the revenue in the budget. The cannabis law family must route each legal sale through the same purchase receipt every other retail sale uses, so the tax rate in force applies. A player would notice the tax line on cannabis in the budget and a higher shelf price in places that tax it.

**Rules.** Wire to the world: a legal sale must move a dollar through the receipt in every place whose law legalizes it, not one example state. An effect is a read, not a record: the sales tax engine reads the receipt at the moment it collects. One model, two tiers: counted buyers pay with the same rule as full people. One rule, all 56 places: legality and rates come from each place's law data.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56 where cannabis is legal, seed named) a cannabis sale receipt record id carries the sales tax in force and the treasury ledger record id receives it. The test in src/core2/purchase-tax.test.ts or src/core2/law-reach-group-b.test.ts covers it. The owner plays it: pass the legalization law and read the tax revenue line in the budget.

**Files.** src/core2/modules/purchase-tax.ts, src/core2/law-reach/group-b.ts, src/core2/data/laws/

**Notes.** TODO
