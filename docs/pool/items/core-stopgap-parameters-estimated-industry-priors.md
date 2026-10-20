---
id: core-stopgap-parameters-estimated-industry-priors
title: "Stopgaps in parameters (estimated-industry-priors): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind estimated-industry-priors"
claimed-at:
after:
---

**What.** A firm's demand and cost priors in src/core2/data/parameters.json (`businessIrs*Margin`, `*PayrollShare`, `*SalesCostShare`, and the credit-line days) are flat per-industry ratios from later-vintage corporate aggregates (IRS Statistics of Income TY2022) and the 2003 Survey of Small Business Finances, so a three-person shop and a 300-person plant in one industry carry the same books and every firm has a credit line. Replace them with size-class by industry priors from the Census Statistics of U.S. Businesses and Annual Business Survey (receipts, payroll and employees by NAICS and employment size class, on www2.census.gov, which was reachable from cloud on Oct 20) with their measured spread, so the business-books builder (`src/core2/business-books.ts`) reads payroll share and margin by the firm's industry and size class and draws each firm's books from that cell's distribution as seeded generation of who exists. Whether a firm holds a credit line comes from the credit engine reading its books and its owner (the 2023 Small Business Credit Survey rate of about 26 percent, spread 15 to 40, only checks the share of firms with a usable line), not from a draw. Suppressed-cost cells keep their ESTIMATED flag.

**Rules.** Research before building: published cells check and shape the books, and actual receipts remain ledger outcomes. No dice: a firm's line comes from its books and owner through the credit engine, and the 26 percent only checks the total. Estimate, never UNKNOWN: a size class with a suppressed cell takes the industry's value, marked ESTIMATED with source and spread. One rule, all 56 places: the cells are national by industry and size, with a state adjustment only where published. One model, two tiers: a counted-owner firm uses the same prior. Numbers in the parameter table are SOURCED, ESTIMATED or TUNABLE and never copy a publisher's table whole beyond the cells used.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), two firms of one industry but different size classes carry different payroll share and margin by business book record id, the spread across firms matches the sourced quantiles for the cell, the share of firms holding a credit line lands within 15 to 40 percent with each line approved by the credit engine's record, and src/core2/business-books-priors.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/data/parameters.json, src/core2/data/business-books.json, src/core2/business-books.ts, data/research/core/business-size-class-priors.json, src/core2/business-books-priors.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Firm demand/cost priors from later-vintage corporate aggregate ratios and conditional credit-line source rows, not observed individual-firm books or credit approval.

Looked at Oct 20 (claude/political-game-pool-3xfqef-6), released unbuilt: SG-P8-business-books-priors names its replacement as recorded firm budgets or cohort-matched individual firm data with measured distributions. That is a data-sourcing task (an established source such as the Census Annual Business Survey or BLS/SOI size-class tables, matched by industry and size), not an engine change; a builder with web access starts there, and the priors in `parameters.json` keep their ESTIMATED tag until then.

Oct 20 (pool feeder): spec written; a data-sourcing task first (an earlier look on Oct 20 said so); the research-reachable-sources-oct20 item found census.gov hosts reachable, so SUSB and ABS can be fetched, bls.gov cannot. The credit-line probability in data/research/stopgaps-oct19/B-people-behavior-2.json (0.26, 0.15 to 0.40) is used only as the total check, because a per-firm probability would be a dice roll.
