---
id: gov-country-tier-models-no-property-tax
title: "The country tier keeps no property tax, so a state's and county's away share of it stays on the monthly twelfth"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-federal-individual-income-tax-from-the-country-tier
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc1-world-outside-town
source: "The Account lead's reading of the plug (docket Q10), Nov 15, 2026"
checked:
claimed-at:
---

**What.** The country tier's state ledger models income, profit and general sales tax only; every treasury's away share of the property tax (the share paid by owners outside the town) is still paid by the monthly twelfth of the Census line, so a property tax law change moves only the town's share. The gap is the same in every place, since no state's tier row holds the tax. Seen: the state, county and city budget screens' property tax line.

**Cause.** Found in code: src/core2/country-model.ts `StateLedger` and `CountryStateMoved` hold income, sales and profit revenue and `otherRevenue` (fees and aid, not modeled); src/core2/budgets-treasury.ts `TOWN_PAID_LINES` lists propertyTax with the away share paid by the plug.

**Fix.** The tier would need each state's homes and businesses valued (the house stock and rents it already counts by cell, with firm assets by sector), the property tax rate in force by state and level read from the law rows as withholding is, and a monthly installment on each government's due dates. Build it in the tier, then read it as the federal income tax line does; delete the property tax part of the plug in the same change.

**Time box.** Design pass first (Fable, medium, 2 hours), then one line per PR.

**Rules.** Replace, never layer: the plug row and marker for the line go in the same change; the chain is the acceptance (one dollar followed from a named group of payers to the treasury and the budget line it paid); one rule, all 56 places; speed: a year within 20% of its base; no new stopgap.

**Done when.** A second session sees in the running game, in a drawn place named in the PR body, a state's property tax rate change moving that state's away property tax revenue the next installment and no other state's, by record id, with the plug row for the line gone.

**Waits on.** gov-federal-individual-income-tax-from-the-country-tier

**Files.** src/core2/country-model.ts, src/core2/country-law.ts, src/core2/budgets-treasury.ts

**Notes.** A gap, not a new stopgap: the line is already registered under SG-GOV-outside-revenue-monthly.
