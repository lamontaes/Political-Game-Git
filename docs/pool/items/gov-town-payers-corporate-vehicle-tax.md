---
id: gov-town-payers-corporate-vehicle-tax
title: "The town's businesses and residents pay corporate and vehicle taxes to the federal and state treasuries"
area: gov
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4693
blocked-on:
source: "gov-outside-revenue-taxes, PR #4489"
claimed-at:
---

**What.** The town's businesses owe corporate income tax on the profit they book, and the town's residents owe vehicle and other taxes, to the federal, state, county and city treasuries. Today only named outside payer groups pay these lines, so a town business's profit is not taxed and the town's share of the national line is paid by outsiders. Have the business books compute each business's tax from its profit under the law in force, and the vehicle tax from the vehicles on household records, and pay them to the treasuries on the due dates in the revenue payers data. Reduce the outside groups' installments by the town's share so no dollar is taxed twice.

**Rules.** An effect is a read: the law in force sets the rate and the business books and household records set the base. No dice. One rule, all 56 places: rates and due dates are data. The chain is the acceptance: follow one business's profit to its tax payment and to the treasury line.

**Done when.** In a drawn place, a one-year run of the played world (buildBenchWorld) shows a named business paying corporate income tax on its recorded profit on a due date, the treasury line rising by that payment and the outside group's installment falling by the same, and a test in a random place proving the line total is unchanged.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/business.ts, src/core2/data/budgets/revenue-payers.json

**Notes.** Corrected after reading employer-taxes.ts (Oct 15): a business owned by another organization already pays the federal corporate rate on each quarter's operating profit to the federal treasury (payProfitTaxes, registered stopgaps SG-WORLD-business-profit-pass-through for owner-run businesses and SG-WORLD-business-premises-property-tax). So the remaining work is narrower: (1) the state corporate tax the same businesses owe, (2) the owner-run businesses' profit as the owner's income, (3) vehicle and other taxes from household records, and (4) subtracting what the town's own taxpayers paid from the outside groups' installments so no dollar is taxed twice (small, since the town is a tiny share of a national line, but the subtraction should be exact).

 Written when gov-outside-revenue-taxes (PR #4489) named the outside payers. The in-town lines already paid by town flows (individual income, payroll, general sales, property) are done and stay as they are.

On 2026-10-16 a session started part (1) and found the law data has no state corporate-income-tax rows for any place (only the federal 21% row), so it released the claim; the data is the new item `laws-state-corporate-income-tax`. Parts (2) to (4) do not depend on it and can be built first.

Sent back 2026-10-16 from PR #4693 (branch claude/gov-town-payers-corporate-vehicle-tax): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
