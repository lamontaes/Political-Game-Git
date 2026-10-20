---
id: people-health-spending-flows
title: "Households pay health premiums and medical services by income class, and the money reaches the sellers"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Bind the CE health insurance and medical services means by income class (cu-income-before-taxes-2024.xlsx) to monthly household flows, full and counted, paid to the insurance and clinic firms the opening economy already holds (business-books kinds `insurance` and `clinic`). The flows are the household's own bills, read by its cash and by the sellers' books. Coverage that lowers them comes in the next item.

**Rules.** An effect is a read: the flow is read by the cash journal and the seller's revenue. One model, two tiers: a counted household pays its group's rate times its weight. Sliding scales and causes: the amount follows income class by interpolation, never a threshold. Numbers live in the parameter table with their CE rows cited.

**Done when.** In a one-year run of the played world in a drawn place, a named household's health bills appear on the journal by record id and equal the CE mean for its income class within the standard error, a counted group's equal that rate times its weight, and the clinic's revenue rises by the sum.

**Files.** src/core2/reference/living-costs-data.ts, src/core2/opening-finance.ts, src/core2/data/parameters.json

**Notes.** TODO
