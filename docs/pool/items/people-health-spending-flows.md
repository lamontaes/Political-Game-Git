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

Scouted Oct 20 (claude): the CE rows are in the repo (`cu-region-1-year-average-2024.xlsx` and `cu-size-2024.xlsx`, rows 461 to 469: health insurance $4,055 and medical services $1,252 a year per consumer unit, with regional and household-size columns; `cu-income-before-taxes-2024.xlsx` has the same rows by income class). Adding them to `LIVING_COSTS_CATEGORY_DATA` and `REPRESENTATIVE_LIVING_COSTS` (living-costs-data.ts) and as categories in `opening-finance.json` (unbound like drugs, so the money goes to the outside market) raises the retained-category sum from $17,674 to about $22,980, 30 percent more living cost per adult. That moves every household's cash and the macro price calibration, so the builder measures the opening budgets before and after, recalibrates what drifts, and keeps the totals of the other categories unchanged. Premiums for a person covered by an employer or Medicaid are mostly not paid by them, so the flow must take the coverage (next item) into account rather than charge the average to everyone.

