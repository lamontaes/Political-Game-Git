---
id: gov-town-payers-corporate-vehicle-tax
title: "The town's businesses and residents pay corporate and vehicle taxes to the federal and state treasuries"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "gov-outside-revenue-taxes, PR #4489"
---

**What.** The town's businesses owe corporate income tax on the profit they book, and the town's residents owe vehicle and other taxes, to the federal, state, county and city treasuries. Today only named outside payer groups pay these lines, so a town business's profit is not taxed and the town's share of the national line is paid by outsiders. Have the business books compute each business's tax from its profit under the law in force, and the vehicle tax from the vehicles on household records, and pay them to the treasuries on the due dates in the revenue payers data. Reduce the outside groups' installments by the town's share so no dollar is taxed twice.

**Rules.** An effect is a read: the law in force sets the rate and the business books and household records set the base. No dice. One rule, all 56 places: rates and due dates are data. The chain is the acceptance: follow one business's profit to its tax payment and to the treasury line.

**Done when.** In a drawn place, a one-year run of the played world (buildBenchWorld) shows a named business paying corporate income tax on its recorded profit on a due date, the treasury line rising by that payment and the outside group's installment falling by the same, and a test in a random place proving the line total is unchanged.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/business.ts, src/core2/data/budgets/revenue-payers.json

**Notes.** Written when gov-outside-revenue-taxes (PR #4489) named the outside payers. The in-town lines already paid by town flows (individual income, payroll, general sales, property) are done and stay as they are.
