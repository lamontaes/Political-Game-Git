---
id: world-medical-spending-categories
title: "Households pay out-of-pocket medical services and drugs from the BLS Consumer Expenditure health lines"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-coverage-record-monthly-pass
source: added with npm run pool -- add
---

**What.** Living costs carry only drugs and medical supplies today; the Consumer Expenditure health insurance and medical services lines are bound to no household flow. Bind those lines to a monthly out-of-pocket flow for each household, sized from the CE averages by age and income, and let a serious illness in the health record raise a person's bill by the care it needs. Covered people pay a smaller share through the coverage record from the earlier part, and uncovered people pay the full price.

**Rules.** Wire to the world: the flow must move money from a household's cash to a medical seller on the cash journal, in every place. An effect is a read: the flow reads each member's coverage record and health need when it pays. Estimate, never UNKNOWN: every rate starts from the real average with a per-world spread, marked with its source.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed), a household with a member who had a serious illness pays a higher monthly medical amount than a healthy neighbor's household, by journal record id, covered members pay less than uncovered ones, and the books balance.

**Files.** src/core2/reference/living-costs-data.ts, src/core2/modules/health.ts, src/core2/data/health/spending.json

**Notes.** Part 2 of 3 split from missing-engine-health-coverage-and-medical-spending (Oct 20).

Oct 20 finding (claude): the seller kinds already exist in business-books.json (`clinic`, `insurance`), so the missing piece is the data. The two Consumer Expenditure lines (health insurance, medical services) are not in `LIVING_COSTS_CATEGORY_DATA`, whose rows carry the spreadsheet's cell references. The source file (`cu-region-1-year-average-2024.xlsx` at bls.gov) answered HTTP 403 from the cloud container with a plain browser header, so a session with access to it (or the same table from another mirror) must read the rows; invented values would break the rule that every number is sourced.
