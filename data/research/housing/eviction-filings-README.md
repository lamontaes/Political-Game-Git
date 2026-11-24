# Eviction filing rates by state (research for eviction-filings-2026.json)

Retrieved 2026-11-01. The game's housing parameters (`housingNoticeBaseline`, `housingNoticeArrearsWeight`, `housingNoticeLateWeight` in `src/core2/data/housing/parameters.json`) cite "Eviction Lab 2018 filing rates (7.8 per 100 renter households nationally)" and name `data/research/housing/eviction-filings-2026.json`. This note says how that file is built from the Eviction Lab's own downloads.

## Answer

|                           | Rate (filings per 100 renter households)                      | Year       | Source                                                                                                |
| ------------------------- | ------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| United States             | **7.80** (95% credible interval 7.59 to 8.00)                 | 2018       | 3,656,428 filings / 46,902,048 renting households, national estimates file                            |
| Lowest state              | **South Dakota 0.65** (model estimate; interval 0.53 to 0.80) | 2018       | 767 / 117,703                                                                                         |
| Highest state             | **Maryland 69.58** (model estimate; interval 63.88 to 74.26)  | 2018       | 558,758 / 803,015                                                                                     |
| Highest without Maryland  | South Carolina 23.32                                          | 2018       | 151,857 / 651,145                                                                                     |
| Connecticut               | **3.98** (court counts for every county, so no interval)      | 2018       | 19,978 / 501,956                                                                                      |
| Connecticut, recent (ETS) | 4.13 in 2024, 3.60 in 2025                                    | 2024, 2025 | 20,017 and 17,501 statewide court filings / ACS 1-year renter-occupied households 484,999 and 486,030 |

Covered: all 50 states and D.C. (51 rows, every one for 2018). Median 4.30, 10th percentile 1.50, 90th percentile 15.89. Sixteen of the 51 rows are court counts for every county; the other 35 are the publisher's Bayesian estimates.

Not covered: Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands. The Eviction Lab collected records "from all 50 states and the District of Columbia (DC)" (supplementary information, section 1) and nothing else. Following the researcher skill, their rows are the median of the 51 sourced rates (4.30), tagged ESTIMATED, with the 51-state range as their spread.

The 7.8 in the parameter citation is the 2018 row of the national estimates file: 3,656,427.8 / 46,902,048 = 7.796.

For Storrs (context, not in the JSON): Tolland County, Connecticut, 2018 was 342 filings over 15,655 renting households, 2.18 per 100, from court counts (`county_eviction_estimates_2000_2018.csv`, row `Connecticut,Tolland County,09,09013,2018,15655,342,342,342,1,0,335,335,335,1`). Students in campus housing live in group quarters, not renter households, so they are in neither the numerator nor the denominator.

## What a test should use

- The cross-state range for 2018 is 0.65 (SD) to 69.58 (MD). Maryland is an outlier because of its law, not because of distress: "In Maryland, the filing serves as the initial eviction notice and can be filed immediately following nonpayment ... if the tenant pays the balance of the rent due, plus any incurred late fees or court costs, the complaint is considered satisfied and the tenant remains in place ... repeated filings against the same household constituted 57.4% of all case filings in Maryland" (supplementary information, section 5.3). A band that fits ordinary states is 0.65 to 23.32 (without Maryland), or 1.50 to 15.89 (10th to 90th percentile).
- Connecticut's own rate is 3.98 (2018). The ETS figures for 2024 (4.13) and 2025 (3.60) are close, so the 2018 figure still describes the state.
- If the game counts a household served once, not each filing, the `threatenedRate` column is the matching measure: national 5.83, Connecticut 3.87, range SD 0.63 to MD 29.65.

## Pages and files fetched

The Eviction Lab's data are in a public S3 bucket, `eviction-lab-data-downloads`, browsed at https://data-downloads.evictionlab.org/ (the page says: "This data is shared under the terms of the Open Data Commons Attribution License (ODC-BY 1.0)"). Every file below came from `https://eviction-lab-data-downloads.s3.amazonaws.com/<key>` and is saved in a downloads folder (not committed) with `/` replaced by `_`.

Used for the rows:

- https://data-downloads.evictionlab.org/ (the index page, with the bucket name)
- https://eviction-lab-data-downloads.s3.amazonaws.com/?list-type=2 (the bucket listing: 203 keys)
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/README_estimating_eviction.txt
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/state_eviction_estimates_2000_2018.csv (969 rows: 51 places x 19 years; sha256 c2aa7d29...)
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/state_eviction_estimates_codebook.xlsx
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/national_eviction_estimates_2000_2018.csv (sha256 f825940d...)
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/national_eviction_estimates_codebook.xlsx
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/estimating_eviction_supplementary_information.pdf (the methods; read as text with `pdftotext -layout`)
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/county_eviction_estimates_2000_2018.csv (for the Tolland County line only)
- https://eviction-lab-data-downloads.s3.amazonaws.com/ets/allstates_weekly_2020_2021.csv (Eviction Tracking System, all state sites, weekly to the week of 2026-10-04, last_updated 2026-10-10; 237 MB; sha256 a1d96369...)
- https://eviction-lab-data-downloads.s3.amazonaws.com/ets/data_dictionary_weekly_monthly.xlsx
- https://eviction-lab-data-downloads.s3.amazonaws.com/ets/ets_historical_baseline_years.csv
- https://www2.census.gov/programs-surveys/acs/summary_file/2025/table-based-SF/data/1YRData/acsdt1y2025-b25003.dat (ACS 2025 1-year tenure; renter-occupied is `B25003_E003`)
- https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25003.dat
- https://api.census.gov/data/2025/acs/acs1/groups/B25003.json (variable labels: `B25003_003E` is "Estimate!!Total:!!Renter occupied")
- https://www2.census.gov/geo/docs/reference/state.txt (state FIPS to postal code)
- https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt (ZCTA to county, to name the two ETS sites that report by ZIP code and to count each state's counties)

Fetched and read, not used for rows:

- https://eviction-lab-data-downloads.s3.amazonaws.com/CHANGELOG.txt and DATA_DICTIONARY.txt (the 2018 legacy release)
- https://eviction-lab-data-downloads.s3.amazonaws.com/legacy-data/unvalidated/national.csv, legacy-data/unvalidated/states.csv, legacy-data/validated/states-validated.csv: the 2018 release (data to 2016), which the 2022 estimates replace. Its national 2016 filing rate is 6.12; the 2022 estimates put 2016 at 8.21. Not used.
- https://eviction-lab-data-downloads.s3.amazonaws.com/External%20Validation%2020210430.pdf (validation rules for the legacy county and tract files)
- https://eviction-lab-data-downloads.s3.amazonaws.com/estimating-eviction-prevalance-across-us/state_proprietary_2000_2018.csv and us_proprietary_2000_2018.csv: LexisNexis counts only, which the publisher says "undercounted the court-issued filings by 29.8%" on average. Not used.
- https://eviction-lab-data-downloads.s3.amazonaws.com/pnas_eviction_profile/state_filing_rates.csv and state_eviction_rates.csv: one share per state and race group, with no year and no counts. Not used.
- https://eviction-lab-data-downloads.s3.amazonaws.com/ets/serial_rates.csv (repeat filings per ETS site)
- https://eviction-lab-data-downloads.s3.amazonaws.com/ets/all_sites_monthly_2020_2021.csv: city sites only, no state sites. Deleted after listing its sites.

Blocked (CloudFront answered 403 "Request blocked" to curl and to WebFetch): https://evictionlab.org/eviction-tracking/, https://evictionlab.org/eviction-tracking/connecticut/, https://evictionlab.org/get-the-data/, https://evictionlab.org/methods/, https://evictionlab.org/national-estimates/. A retry with a browser user agent was refused by this session's permission check and was not made. The GitHub organization (https://github.com/EvictionLab, and `gh api orgs/EvictionLab/repos`) was also refused: this session's GitHub access is bound to its own repositories. Nothing in the JSON depends on these pages; the S3 bucket holds the data and the methods report.

## How each row is found

Run from the repository root: `python3 -I scripts/research/compile-eviction-filings.py <downloads> <si.txt> data/research/housing/eviction-filings-2026.json` (14 seconds; standard library only), then `npx prettier --write data/research/housing/eviction-filings-2026.json`. `<si.txt>` is `pdftotext -layout` of the supplementary information PDF.

- **State rows (51).** The 2018 line of `state_eviction_estimates_2000_2018.csv` for each state. `renterHouseholds` is `renting_hh`; `filings` is `filings_estimate`; `filingsLow` and `filingsHigh` are the 95% credible interval; `rate` is filings / renting households x 100, rounded to two places, computed here because the file has counts, not rates. `filingsFrom` is `court` where `ind_filings_court_issued` is 1 ("number of filings observed in court-issued data for all counties") and `model` otherwise. `landlordTenantCount` is `ind_filings_court_issued_LT` ("court-issued data are landlord-tenant cases", adjusted down to eviction cases by the model). `threatenedHouseholds` is `hh_threat_estimate`. The postal code comes from the Census state file by `FIPS_state`.
- **National row.** The 2018 line of `national_eviction_estimates_2000_2018.csv`, the same way.
- **Check.** The script recomputes every state's 2015 rate from the same file and compares it with the publisher's Table S16 ("Average state-level eviction filing rates, by data source, 2015", supplementary information page S-58, parsed from `<si.txt>`). All 51 match to the hundredth (largest difference 0.00), so the rate column is computed the way the Eviction Lab computes it.
- **Territory rows (5).** The median of the 51 state rates, tagged ESTIMATED; `rateLow` and `rateHigh` are the lowest and highest state rates.
- **ETS rows (11 states x 2 years).** `allstates_weekly_2020_2021.csv` holds 11 statewide sites. Its `state` column is filled only on the first site's rows and names that site "missouri" although its tracts are all in FIPS 05 (Arkansas, all 75 counties), so the script reads the file as blocks in order: a tract block is named by the tracts' state FIPS, a ZIP block by the state holding most of its ZCTAs' land (Pennsylvania: ZIP prefixes 150 to 196; Virginia: 201 and 220 to 246), and each `sealed` block (filings with no usable address) belongs to the block before it. Each week's count is split over the calendar years of its seven days, a seventh per day, so 2024 covers 366 days and 2025 covers 365. The rate is that year's filings over the ACS 1-year renter-occupied households of the same year. Coverage: Arkansas, Connecticut, Delaware, Indiana, Minnesota, Missouri and Rhode Island have tract rows in every county; New Mexico lacks De Baca and Harding counties (31 of 33); Wisconsin lacks Menominee County (71 of 72); Pennsylvania (1,798 ZIP codes) and Virginia (896) report by ZIP code.

## Limits

- **Filings, not evictions.** A filing is a court case. Many end with the tenant staying, and one household can draw several in a year; `threatenedRate` counts each household once.
- **2018 is the latest year with every state.** The Eviction Lab's estimates run 2000 to 2018. After 2018 it publishes only the ETS, which covers 11 states statewide (plus cities), so no later year has all 51.
- **35 of the 51 rows are model estimates**, built from partial court data, LexisNexis records and county covariates. Their intervals are in `filingsLow` and `filingsHigh`; Idaho (0.96 to 5.27) and West Virginia (2.01 to 9.95) are the widest. South Dakota, the lowest, is a model row; the lowest court-count row is Hawaii (1.21). Maryland 2018 is a model row because the publisher's Maryland court counts end in 2017.
- **Two denominators.** The 2018 rows divide by the publisher's renting households (block groups interpolated from the 2000 and 2010 Censuses and 2016 ESRI Business Analyst, extrapolated to 2018). The ETS rows divide by ACS 1-year renter-occupied households. The ACS 2018 figure differs a little, so the ETS rate is a cross-check, not a continuation of the series.
- **ETS against 2018.** The ETS 2024 and 2025 rates sit near the 2018 rows for Connecticut (4.13, 3.60 against 3.98), Indiana, Missouri, Pennsylvania and Wisconsin. They are lower for Delaware (10.46, 10.28 against 15.89), Rhode Island, Virginia and New Mexico, and higher for Minnesota (3.44, 3.87 against 2.78). Arkansas is about twice its 2018 model estimate (2.26 and 2.29 against 1.08), which suggests that model row is low. The publisher put Arkansas among the five states with no data source covering 90% of counties (Table S16).
- **Pre-pandemic.** 2018 is before the 2020 to 2021 moratoria. The national rate was 7.8 then and had been falling slowly (8.2 in 2016).
