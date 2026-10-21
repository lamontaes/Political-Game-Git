---
id: world-medical-spending-categories
title: "Households pay out-of-pocket medical services and drugs from the BLS Consumer Expenditure health lines"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/medical-spending
pr:
blocked-on:
after: people-coverage-record-monthly-pass
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:13:28.076Z
---

**What.** Living costs carry only drugs and medical supplies today; the Consumer Expenditure health insurance and medical services lines are bound to no household flow. Bind those lines to a monthly out-of-pocket flow for each household, sized from the CE averages by age and income, and let a serious illness in the health record raise a person's bill by the care it needs. Covered people pay a smaller share through the coverage record from the earlier part, and uncovered people pay the full price.

**Rules.** Wire to the world: the flow must move money from a household's cash to a medical seller on the cash journal, in every place. An effect is a read: the flow reads each member's coverage record and health need when it pays. Estimate, never UNKNOWN: every rate starts from the real average with a per-world spread, marked with its source.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed), a household with a member who had a serious illness pays a higher monthly medical amount than a healthy neighbor's household, by journal record id, covered members pay less than uncovered ones, and the books balance.

**Files.** src/core2/reference/living-costs-data.ts, src/core2/modules/health.ts, src/core2/data/health/spending.json

**Notes.** Part 2 of 3 split from missing-engine-health-coverage-and-medical-spending (Oct 20).

Released Oct 20 (claude): needs the coverage record from people-coverage-record-monthly-pass (claimed by claude/fs11vb-coverage-record) to price covered vs uncovered members, and the CE health-insurance and medical-services category rows (BLS cu-region-1-year-average-2024.xlsx, the file living-costs-category-data.ts cites) are not in living-costs-category-data.ts yet; a builder should add those rows first, then bind the flow.

Tried Oct 20 (claude): the BLS workbook the category file cites returns HTTP 403 to this cloud container's proxy (curl with a browser user agent, 1,325-byte error page), so the health-insurance and medical-services rows could not be read from the source; they were not typed in from memory. Whoever builds this needs the workbook placed where the container can read it (or network access to bls.gov).

Oct 20 later (claude, claude/fs11vb-health-split): the 403 above is only for the spreadsheet. The BLS public data API (POST https://api.bls.gov/publicAPI/v1/timeseries/data/, no key, version 1) answers from the same container. National 2024 means for all consumer units: health care `CXUHEALTHLB0101M` = $6,197 (2023: $6,159), medical services `CXUMEDSERVSLB0101M` = $1,252, drugs `CXUDRUGSLB0101M` = $658. The health insurance series id was not found (`CXUHLTHINSLB0101M`, `CXUHEALTHINSLB0101M`, `CXUHEALINSLB0101M` and `CXUHLTHINLB0101M` do not exist), and regional and household-size series ids were not tried. Version 1 allows 25 requests a day per address and that limit was reached, so retry the next day or register a key. Each value used must cite its series id and year.
