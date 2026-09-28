# Household spending and private pay periods have sourced views

The money-spine source lane now has annual Consumer Expenditure Survey observations by income before taxes, region of residence, and consumer-unit size. It also has the BLS February 2023 snapshot of private-establishment pay-period frequencies. These are source observations for later calibration. They do not set a game's household budget, price, payroll date, or spending rule.

## Published scope

The [BLS calendar-year demographic tables](https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error.htm) publish separate 2024 workbooks for [income before taxes](https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error/cu-income-before-taxes-2024.xlsx), [region of residence](https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error/cu-region-1-year-average-2024.xlsx), and [consumer-unit size](https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error/cu-size-2024.xlsx). The import retains all 101 annual expenditure items in each workbook, their annual mean dollars per consumer unit, share of annual expenditures, standard error, relative standard error, and original cell text. Published footnote marks remain nonnumeric rather than becoming zero. The workbook defines b/ as a high-relative-error caution and c/ as a value too small to display.

The three workbooks cover 10 income columns, five region columns, and seven size columns, each including an all-consumer-units total. They are three **separate views**. They do not publish a joint income-by-region-by-size distribution in these files. BLS calls the observed unit a consumer unit; it is not automatically the same as a game household or a census household. The [BLS table guide](https://www.bls.gov/cex/tables-getting-started-guide.htm) describes the means, shares, and uncertainty measures. The tables are calendar-year 2024 estimates, not local county prices or current household bills.

## Source differences visible in the import

| 2024 observation                  | Published share of annual expenditures |
| --------------------------------- | -------------------------------------: |
| Food, income under $15,000        |                                  16.5% |
| Food, income $200,000 and more    |                                  10.8% |
| Housing, income under $15,000     |                                  41.6% |
| Housing, Northeast region         |                                  35.2% |
| Housing, one-person consumer unit |                                  39.0% |

The source compiler reproduces these cells from the three locked publisher XLSX files. They show differences across the separate BLS cuts, not an approved formula for any individual person or family. Source income bands describe groups; the game must not infer an exact person's spending from a group average without an approved design rule.

## Handoff

The dedicated importer records publisher URLs, exact XLSX hashes, 2024 vintage, sample counts in thousands of consumer units, source row numbers, units, and cohort labels. Deterministic replay produces one compressed corpus and lock/manifest pair. The raw workbooks occupy less than 0.1 MiB combined and are stored once in the owned source directory. No simulation or presentation file changed.

## Private-establishment pay-period snapshot

The [BLS Current Employment Statistics pay-period page](https://www.bls.gov/ces/publications/length-pay-period.htm) gives February 2023 weighted percentages for weekly, biweekly, semimonthly, and monthly pay periods. Its overall table reports 27.0%, 43.0%, 19.8%, and 10.3%, respectively. The page also has eight establishment-size groups and ten broad industry groups. For example, 65.4% of construction establishments reported weekly pay periods; 66.6% of establishments with at least 1,000 employees reported biweekly periods.

These are percentages of **private establishments**, not percentages of employees, and BLS calls them a point-in-time snapshot rather than a continuous time series. The page says government and public/private education hours-and-earnings series are out of scope. Its broad industry labels do not supply an exact crosswalk to the two-digit County Business Patterns industry rows. Those scope limits must accompany any later use for generated employers.

Direct nonbrowser requests to the BLS page returned HTTP 403 in this environment. The owned raw artifact is therefore an explicitly labeled transcription of its three published HTML tables, captured through the browser on September 26, 2026. It is **not** an original publisher HTML or workbook download. The lock records the captured artifact's SHA-256 and page URL. The compiler records table/row/cell locators, while deterministic replay and validation check 76 normalized observations, all four period categories, rounded percentage sums, and selected published values. A later refresh must compare the capture to the live BLS page again.

## Remaining boundary

The remaining source lane includes CPI category series, county housing and commute observations, household finance and lending sources, reserves and government finances, energy and trade inputs, and tax source tables. Neither imported source establishes those values or a saved player effect. Browser/player acceptance was not run for this data-only package.
