---
id: world-medical-spending-categories
title: "Households pay out-of-pocket medical services and drugs from the BLS Consumer Expenditure health lines"
area: world
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/laws-medical-debt
pr:
blocked-on:
after: people-coverage-record-monthly-pass
source: added with npm run pool -- add
claimed-at: 2026-10-29T16:54:43.144Z
---

**What.** Living costs carry only drugs and medical supplies today; the Consumer Expenditure health insurance and medical services lines are bound to no household flow. Bind those lines to a monthly out-of-pocket flow for each household, sized from the CE averages by age and income, and let a serious illness in the health record raise a person's bill by the care it needs. Covered people pay a smaller share through the coverage record from the earlier part, and uncovered people pay the full price.

**Rules.** Wire to the world: the flow must move money from a household's cash to a medical seller on the cash journal, in every place. An effect is a read: the flow reads each member's coverage record and health need when it pays. Estimate, never UNKNOWN: every rate starts from the real average with a per-world spread, marked with its source.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed), a household with a member who had a serious illness pays a higher monthly medical amount than a healthy neighbor's household, by journal record id, covered members pay less than uncovered ones, and the books balance.

**Files.** src/core2/reference/living-costs-data.ts, src/core2/modules/health.ts, src/core2/data/health/spending.json

**Notes.** Part 2 of 3 split from missing-engine-health-coverage-and-medical-spending (Oct 20). Claim released Oct 23: branch gone.

Released Oct 20 (claude): needs the coverage record from people-coverage-record-monthly-pass (claimed by claude/fs11vb-coverage-record) to price covered vs uncovered members, and the CE health-insurance and medical-services category rows (BLS cu-region-1-year-average-2024.xlsx, the file living-costs-category-data.ts cites) are not in living-costs-category-data.ts yet; a builder should add those rows first, then bind the flow.

Tried Oct 20 (claude): the BLS workbook the category file cites returns HTTP 403 to this cloud container's proxy (curl with a browser user agent, 1,325-byte error page), so the health-insurance and medical-services rows could not be read from the source; they were not typed in from memory. Whoever builds this needs the workbook placed where the container can read it (or network access to bls.gov).

Oct 20 later (claude, claude/fs11vb-health-split): the 403 above is only for the spreadsheet. The BLS public data API (POST https://api.bls.gov/publicAPI/v1/timeseries/data/, no key, version 1) answers from the same container. National 2024 means for all consumer units: health care `CXUHEALTHLB0101M` = $6,197 (2023: $6,159), medical services `CXUMEDSERVSLB0101M` = $1,252, drugs `CXUDRUGSLB0101M` = $658. The health insurance series id was not found (`CXUHLTHINSLB0101M`, `CXUHEALTHINSLB0101M`, `CXUHEALINSLB0101M` and `CXUHLTHINLB0101M` do not exist), and regional and household-size series ids were not tried. Version 1 allows 25 requests a day per address and that limit was reached, so retry the next day or register a key. Each value used must cite its series id and year.

Oct 25 audit: From the dropped people-health-spending-flows: CE rows 461 to 469 of cu-region-1-year-average-2024.xlsx (health insurance $4,055) are in the repo; pay the insurance and clinic firms the opening already holds.

Deferred Oct 25: nothing on screen reads it yet.

Built Oct 29 (laws lead helper, branch claude/laws-medical-debt, with health-medical-debt-record): the coverage engine bills each household on the 1st (src/core2/medical-bills.ts) from the CE medical services parent (CXUMEDSERVSLB0101M, $1,252, region and size parameters already in parameters.json) less the clinic component everyday living buys, each member priced by coverage (MEPS #441 Figure 6 out-of-pocket shares: private 29.7%, public 9.1%, uninsured 63.8%, Medicare 26.1%, against the 28.2% average) and care need (MEPS #533: top 5% of spenders 48.3% of spending, 9.66 times average), paid to the town's hospital or clinic, else the outside account. The CE health insurance line is not bound: coverage.ts already pays the worker's premium (KFF), so binding it would pay premiums twice. Proof: src/core2/law-wiring-medical-debt.test.ts part (a), 8 played months; Sunset, Utah (US-UT, 4974480), MEDICAL_DEBT_SEED=first-seed-a1: medical-bill:household_89d014c33cbd4bcb (a member with care need 1) billed 138190 and paid 113020 by journal:2025-08-01:95160 against healthy neighbor medical-bill:household_330b8cdbe8295af8 billed 25926, paid by journal:2025-08-01:95113; employer member 2663 against uncovered 5721, Medicaid member 1409 against uncovered 9876; 2427 medical journal entries, each balanced. Second seed: New Haven, Connecticut (US-CT, 0952000), MEDICAL_DEBT_SEED=second-seed-b2: medical-bill:household_42d41d7e1ed8c673 (a Medicare member with care need 1) billed 50819, paid by journal:2025-05-01:58449, against medical-bill:household_08209f9939d60ef6 billed 20526 (journal:2025-05-01:58439).
