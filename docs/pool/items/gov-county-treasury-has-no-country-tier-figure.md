---
id: gov-county-treasury-has-no-country-tier-figure
title: "A county's away revenue has no country tier figure, because the tier keeps a state's state and local governments together"
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

**What.** A county's and a city's share of income, sales and property tax paid by people elsewhere is still the monthly twelfth of the Census line, because the country tier holds one ledger for each state's state and local governments together and no county or city rows. The gap is the same in every place with a county or city treasury. Seen: the county and city budget screens' revenue lines.

**Cause.** Found in code: src/core2/country-model.ts `StateLedger` (one ledger per state) and src/core2/modules/outside-budgets.ts (other states' lines are the state government's share of the tier's ledger, fixed at the first month).

**Fix.** The tier would need a split of each state's cells and sectors by county (the people and jobs by county the world's research already holds) or a fixed local share per state read from the published finances, so a local tax change reads the state's tier figure times the county's share. Choose the smaller of the two in a design pass, then build it as the state lines are built.

**Time box.** Design pass first (Fable, medium, 2 hours), then one line per PR.

**Rules.** Replace, never layer: the plug row and marker for the line go in the same change; the chain is the acceptance (one dollar followed from a named group of payers to the treasury and the budget line it paid); one rule, all 56 places; speed: a year within 20% of its base; no new stopgap.

**Done when.** A second session sees in the running game, in a drawn place named in the PR body, a county income, sales or property tax change moving that county's away revenue the next month and no other county's, by record id, with the plug row for the line gone.

**Waits on.** gov-federal-individual-income-tax-from-the-country-tier

**Files.** src/core2/country-model.ts, src/core2/modules/outside-budgets.ts, src/core2/budgets-treasury.ts

**Notes.** A gap, not a new stopgap: the lines are already registered under SG-GOV-outside-revenue-monthly.
