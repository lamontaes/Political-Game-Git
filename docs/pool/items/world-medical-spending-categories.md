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

Oct 30 (laws lead helper, review repair): the proofs above came from a test that no longer runs as written. Part (a) now keeps to the drawn town (row placeId), needs a member whose serious illness is under way (care need 1, a health case with an onset event) and a healthy household of the same size and plans, both paying the month in full by journal entry, and reads every town payment line by line from the members' main accounts to the seller's. Most towns have no full household with an illness under way in eight months, so each part takes the first drawn place that can show it. Proof: MEDICAL_DEBT_SEED=wf-med-1, Grand Junction, Colorado (US-CO, 0831660, world seed 1af50786169d398a74527eff8bd7fa5f1f822ae67bb369991afcd01db4f64218): medical-bill:household_df978fbbd49839d6 paid 127576 by journal:2025-09-01:165115 and journal:2025-09-01:165116 (member person_dbe00b2479b2ed11, uninsured, care need 1, onset health.serious-illness:person_dbe00b2479b2ed11:2025-08-23) against healthy medical-bill:household_1574000fc7f6c14e paid 23936 by journal:2025-09-01:165002; 1833 town payments read line by line. MEDICAL_DEBT_SEED=wf-med-2, Bellevue, Washington (US-WA, 5305210, world seed 60f661c4141b5601621965bf4214cf3af6ac2928a471933ba4e373c05f8e6df8): medical-bill:household_2ff34979bbb2fbdf paid 160539 by journal:2025-09-01:163888 (person_dbb3a01cdf1986b1, onset 2025-08-05) against medical-bill:household_0b356947814914a3 paid 23514 by journal:2025-09-01:163868. MEDICAL_DEBT_SEED=wf-med-9a3efd0d1849, Florissant, Colorado (US-CO, 0827095, world seed b4696216e574b33d37827efce2b0c0aabf0802d98f93d5ed8474a166c4fac4c6): medical-bill:household_35264ba96dd4ec95 paid 94488 (person_fa4dc5136a54b233, Medicare, onset 2025-03-22) against medical-bill:household_3533dca96de06d54 paid 9860.
