---
id: research-opening-customers-cleaning-coverage
title: "Public cleaning share and buyer coverage sourced; household service means given sampling intervals"
area: core
kind: research
priority: 2
size: S
status: in-pr
claimed-by: claude/dreamy-tesla-bgi3ui-opening-customers
pr: #5864
blocked-on:
source: "split Oct 24, 2026 from research-opening-customers-sourced-parameters (PR #5864)"
claimed-at: 2026-10-24T01:40:00.000Z
---

**What.** Replaces two authored fractions in src/core2/data/parameters.json with ESTIMATED values that buildOpeningCustomers already reads: openingCustomerPublicCleaningBudgetShare, 0.1 to 0.124 (spread 0.091 to 0.179, from BOMA International and IFMA operating-cost benchmarks and the Census 2022 Census of Governments: Finance), and openingCustomerLocalAuthorityBudgetCoverage, 0.25 to 0.8 (spread 0.243 to 1, from the same Census finance data and the Census 2025 Government Units listing). Where a town has a cleaning company, its town and county offices now open the game paying it about four times as much: about $2,000 a year before and about $8,000 after in a 2,000-person town in an average state. It also gives the 60 regional and household-size parent means from BLS Consumer Expenditure Surveys Tables 1800 and 1400, 2024, their published 95 percent sampling intervals with the values unchanged, and adds four research files under data/research/core/ (building-operating-cost-janitorial-share.json, census-2022-local-public-buildings-by-government-type.json, census-gus-2021-county-identity-continuity.json and bea-2023-use-summary-buyer-shares.json), read by scripts/research/check-opening-customer-priors.ts and scripts/research/opening-customers-year.ts. It updates the `replacement` of SG-P8-opening-customer-generation, SG-P8-opening-customer-public-procurement, SG-P8-outside-product-demand-crosswalk, SG-P8-opening-public-owner-history and SG-P8-opening-public-owner-coverage, and it reports one played year in Apache Creek, New Mexico. Split from research-opening-customers-sourced-parameters, which stays open for the TUNABLE calendar rows, the rows that have no spread to give and the mechanics those five stopgaps wait on.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome; both fractions are amounts inside one product, so no choice flips at them. Estimate, never UNKNOWN: both fractions stay ESTIMATED with their sources and spreads, because no measured share of local public-building spending paid to cleaning contractors was found to make the cleaning share SOURCED. One rule, all 56 places: spending per resident comes from per-state rows in data, with no state named in logic.

**Done when.** (a) Each of these rows is ESTIMATED or SOURCED with a citation (publisher, year, URL) and a spread (low, high, unit, citation): openingCustomerPublicCleaningBudgetShare (0.124, 0.091 to 0.179), openingCustomerLocalAuthorityBudgetCoverage (0.8, 0.243 to 1) and the 60 regional and household-size parent means from BLS CEX Tables 1800 and 1400, 2024, each with its 95 percent sampling interval. (b) Each of the four new files under data/research/core/ has a reader in scripts/research/ (check-opening-customer-priors.ts and opening-customers-year.ts), and tests/guards/research-data-has-reader.test.ts lists none of them. (c) The five stopgaps named in What stay open in src/core2/data/stopgaps.json, each `replacement` naming the source read, and the four that read a new research file name that file and the builder item that finishes it (core-opening-public-buyers-sourced-reads, world-local-sales-below-opening-forecast). (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, calibration-guard.test.ts), and so do the opening-customers and public-owner engine tests. (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports each band and where the town landed, with record ids, and says which band the drawn place could not show.

**Files.** src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/building-operating-cost-janitorial-share.json, data/research/core/census-2022-local-public-buildings-by-government-type.json, data/research/core/census-gus-2021-county-identity-continuity.json, data/research/core/bea-2023-use-summary-buyer-shares.json, scripts/research/check-opening-customer-priors.ts, scripts/research/opening-customers-year.ts

**Notes.** Split Oct 24, 2026 from research-opening-customers-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5864 on branch claude/dreamy-tesla-bgi3ui-opening-customers.
