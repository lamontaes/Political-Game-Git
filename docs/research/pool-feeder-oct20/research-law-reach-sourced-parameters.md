# research-law-reach-sourced-parameters

Oct 20 pool-feeder research for the 25 stopgap rows of the law-reach item. Most rows are mechanics (the engine that reads the law is missing), so they list what the mechanic will read; the sourced numbers calibrate year-end bands. Rows reuse the Oct 19 files where noted; everything else was fetched this session. Rows marked search-result summary were seen only in a search answer, not on the page itself, and are therefore tagged ESTIMATED or flagged. No numbers are invented.

## SG-GOV-REACH-B-territory-residents

- Feeds: src/core2/law-reach/group-b-money.ts; data/research/money/public-budget-bases.json
- Recommended: US-AS 49,710 (2020); US-GU 153,836 (2020); US-MP 47,329 (2020); US-VI 87,146 (2020); US-PR 3,184,835 (2025)
- Low / high: same / same
- Unit: residents
- Tag: SOURCED
- Sources:
  - U.S. Census Bureau, 2020 Island Areas Censuses and Puerto Rico estimates, as carried in the repo — data/research/money/public-budget-bases.json — "islandAreaPopulation2020": 49710 (US-AS); "islandAreaPopulation2020": 153836 (US-GU); "islandAreaPopulation2020": 47329 (US-MP); "islandAreaPopulation2020": 87146 (US-VI); "puertoRicoPopulation2025": 3184835 (US-PR)
- Note: The stopgap row is already status resolved in stopgaps.json (Oct 19); the budgets module reads these into GovernmentRow.residents.
- builderNote: Confirm group-b-money.ts reads only GovernmentRow.residents for island areas and delete the separate parameter-table population; nothing to research.

## SG-GOV-REACH-B-flat-tax-replacement

- Feeds: src/core2/law-reach/group-b-money.ts (~line 649); parameters.json
- Recommended: Replacement rate = revenue-neutral flat rate on the same taxable income, times a ratio: default 1.0, converted-state pattern 0.85. Per-place neutral rates (percent): AL 4.95, AR 3.79, CA 6.28, CT 5.04, DC 7.17, DE 5.74, HI 6.82, KS 5.48, MA 5.04, MD 4.93, ME 6.66, MN 6.99, MO 4.55, MT 5.61, ND 2.08, NE 4.67, NJ 4.51, NM 4.48, NY 5.66, OH 3.11, OK 4.51, OR 8.69, RI 4.4, SC 5.65, VA 5.43, VT 5.62, WI 5.07, WV 3.99. Already flat or no wage tax: AK AZ CO FL GA IA ID IL IN KY LA MI NC NH NV PA SD TN TX UT WA WY. Territories AS GU MP PR VI: no precedent, use ratio 1.0 on the place's own schedule.
- Low / high: ratio 0.71 (Iowa 2025) / ratio 0.99 (Georgia 2024)
- Unit: ratio to revenue-neutral rate; percent of taxable income
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/C-government-law.json key SG-GOV-REACH-B-flat-tax-replacement (confidence low): Tax Foundation, State Individual Income Tax Rates and Brackets, as of January 1, 2025 — https://taxfoundation.org/publications/state-individual-income-tax-rates-and-brackets/ — "into a single bracket with a rate of 3.8 percent"
  - Tax Foundation, State Individual Income Tax Rates and Brackets, as of January 1, 2026 — https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/ — "moved to a flat rate of 2.75 percent"
- Note: Per-place neutral rates are schedule-implied averages on a stylized lognormal income distribution (median $42k, sigma 1.1), so they are estimates; the engine should compute the neutral rate from the simulated population and use the table only as a fallback.
- builderNote: Add flat-rate terms (rate, threshold, keep deductions) to the repeal provision from the Oct 19 file; the withholding engine reads them for full and counted workers.

## SG-GOV-start-law-carried-back

- Feeds: src/core2/data/laws/starting-law.json; src/core2/modules/laws.ts
- Recommended: Use the asOf 2025-01-20 table in data/research/stopgaps-oct19/C-government-law.json key SG-GOV-start-law-carried-back, `recommended` (income tax brackets for all states, sales tax, property tax effective rate, SNAP FY2025 maximums, unemployment January 2025 maximums, Medicaid FY2025 FMAP, and `changedAfterStart` entries with enactment dates). Keep 2026 values as later scheduled phases.
- Low / high: per-series; see file / per-series; see file
- Unit: percent / dollars per series
- Tag: SOURCED
- Sources:
  - Tax Foundation, State Individual Income Tax Rates and Brackets, as of January 1, 2025 — https://taxfoundation.org/publications/state-individual-income-tax-rates-and-brackets/ — "State Individual Income Tax Rates and Brackets, as of January 1, 2025" (Oct 19, fetched)
  - USDA FNS, FY2025 Maximum Allotments and Deductions — https://www.fns.usda.gov/sites/default/files/media/file/FY2025-Maximum-Allotments-Deductions.pdf — "effective October 1, 2024, through September 30, 2025" (Oct 19, fetched)
  - U.S. DOL, Significant Provisions of State UI Laws, January 2025 — https://oui.doleta.gov/unemploy/content/sigpros/2020-2029/January2025.pdf — "EFFECTIVE JANUARY 2025" (Oct 19, fetched)
  - KFF, Federal Matching Rate and Multiplier — https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/ — "KFF estimates of increased FY 2025 FMAPs and the multiplier" (Oct 19, fetched)
- Note: Confidence medium. Territories (AS GU MP PR VI) are covered in the file only where federal tables list them; the rest stay ESTIMATED.
- builderNote: Replace the Oct 2025 / Jan 2026 first phases in starting-law.json with the Jan 20, 2025 values and keep later changes as dated phases. This is the largest piece of the item.

## SG-GOV-REACH-A-leave-claims

- Feeds: src/core2/data/laws/reach-group-a.json; paid-leave premium calibration
- Recommended: Calibration band for the leave-taking choice and benefit: California PFL SFY 24-25 had 332,635 claims filed (283,354 bonding, 49,169 care), average weekly benefit $996, average 7.10 weeks per claim; 49% of private workers have paid family leave access.
- Low / high: 5.49 weeks per claim (SFY 18-19) / 7.45 weeks per claim (SFY 25-26)
- Unit: claims per year; dollars per week; weeks per claim
- Tag: SOURCED
- Sources:
  - California EDD, Paid Family Leave Program Statistics, SFY 2025-26 — https://edd.ca.gov/siteassets/files/about_edd/quick-stats/pfl-statistics-sfy-25_26.pdf — "Total Claims Filed 332,635 ... Average Weekly Benefit Amount $996 ... Average Weeks Per Claim 7.10" (SFY 24-25 column)
  - BLS, Employee Benefits in the United States, March 2025 — https://www.bls.gov/ncs/ebs/benefits/2025/employee-benefits-in-the-united-states-march-2025.pdf — "Access to paid family and medical leave 49% in 2026" (as returned by the fetch; the page label year differs from the URL year)
- Note: These check a year's total claims and benefit dollars; they never choose which worker takes leave. Premium rates per state are already in the policy row.
- builderNote: Mechanic: builder writes the leave-taking choice (health engine) and the treasury benefit payment; read the band above in the one-year proof only.

## SG-GOV-REACH-A-bargaining

- Feeds: src/core2/data/laws/reach-group-a.json; rerateJob
- Recommended: Calibration only: public-sector union membership rate 32.9% vs private 5.9% (2025); full-time union median weekly earnings $1,404 vs nonunion $1,174.
- Low / high: n/a / n/a
- Unit: percent; dollars per week
- Tag: SOURCED
- Sources:
  - BLS, Union Members 2025 — https://www.bls.gov/news.release/union2.nr0.htm — "The public-sector union membership rate, at 32.9 percent, increased by 0.7 percentage point over the year." and "The union membership rate in the private sector, at 5.9 percent, was unchanged over the year."
- Note: BLS cautions the October 2025 survey was not collected, so 2025 annual estimates are not strictly comparable with earlier years. Mechanic: a bargaining engine is a builder job; the contract outcome must follow from the unit, employer budget and law, not from the premium.
- builderNote: Mechanic: builder; use the 32.9% membership figure to check counted public workers' union share and the earnings gap as a year-end band.

## SG-GOV-REACH-A-union-dues

- Feeds: src/core2/data/laws/reach-group-a.json (right-to-work effect); WORLD/CORE union membership
- Recommended: Right-to-work lowers the membership rate about 1.7 points in the adoption year and about 4 points after five years (matches the existing "about four points over five years"). Dues amount: no figure fetched.
- Low / high: 2 points (Illinois EPI panel) / 4 points at five years
- Unit: percentage points of workers
- Tag: ESTIMATED
- Sources:
  - NBER Digest, Impacts of Right-to-Work Laws on Unionization and Wages, 2022 (Fortin, Lemieux and Lloyd, WP 30098) — https://www.nber.org/digest/202208/impacts-right-work-laws-unionization-and-wages — search-result summary only, page not opened: "reduces the unionization rate by 1.7 percentage points in the year of implementation ... 4 percentage points five years after adoption"
  - BLS, Union Members 2025 — https://www.bls.gov/news.release/union2.nr0.htm — "was 10.0 percent in 2025, little changed from the prior year"
- Note: ESTIMATED because the NBER page was seen only through a search summary and no dues-per-worker figure was fetched.
- builderNote: Mechanic: builder records membership and dues on named jobs and counted groups; use the 4-point figure as the five-year band, not a per-worker chance.

## SG-GOV-REACH-A-cannabis-market

- Feeds: src/core2/data/laws/reach-group-a.json; reach spending shift
- Recommended: Spending ~$170 per resident per year stays an ESTIMATE (2024 state sales); adult past-year use 23.1% (2022-2024 pooled), same for all places until a state table is read; Colorado 2024 sales $1,397,131,978 as a check on one mature market.
- Low / high: $100 per resident (design spread) / $240 per resident (design spread)
- Unit: dollars per resident per year; share of adults
- Tag: ESTIMATED
- Sources:
  - SAMHSA, 2024 NSDUH (search-result summary, page not opened) — https://www.samhsa.gov/data/sites/default/files/reports/rpt56777/2024-nsduh-psr-compilation-info.pdf — "annual averages of 23.1% of adults aged 18 or older ... used marijuana in the past year" (2022-2024 pooled)
  - City of Los Angeles Cannabis Commission, 2024 US Cannabis Sales, citing Colorado Dept. of Revenue (search-result summary) — https://cannabis.lacity.gov/articles/2024-us-cannabis-sales — "$1,397,131,978" (Colorado 2024)
- Note: The spread is a design range around the existing $170, not a measured one. SAMHSA publishes a state-by-age table (Table 2, marijuana use in past year by state) that was not read; use it for the per-state prevalence table.
- builderNote: Mechanic: builder seeds adult-use on named adults with state prevalence from SAMHSA Table 2; keep the per-resident dollars as ESTIMATED until a state sales table is read.

## SG-GOV-REACH-A-consumer-credit

- Feeds: src/core2/data/laws/reach-group-a.json (consumer-loan-quote)
- Recommended: Cap of 36% military annual percentage rate (statutory); product-specific state caps are not researched.
- Low / high: n/a / n/a
- Unit: percent APR
- Tag: MECHANIC (builder)
- Sources:
  - Search-result summary of 10 U.S.C. 987 / 32 C.F.R. Part 232 — https://policyrisk.com/wiki/military-lending-act — "caps the cost of most consumer credit for active-duty service members and their covered dependents at a 36% Military Annual Percentage Rate" (page not opened)
- Note: Counted earnings history and the named-borrower explanation are builder work.
- builderNote: Mechanic: builder; the quote engine reads the cap from the law row; add state caps by place from NCLC when read.

## SG-GOV-REACH-A-housing-supply

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-housing-supply)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: Builder proves a completed home reaches a named household; no number to source.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-rent-assistance

- Feeds: src/core2/data/laws/reach-group-a.json (housing-assistance); rent contracts
- Recommended: Tenant pays about 29% of income as rent; the program pays the rest. Vermont 2025: average tenant rent $478 a month, 28.9% of income, HUD pays about $1,007 a month per household.
- Low / high: 28.5% (Hudson County NJ) / 29.3% (Caledonia County VT)
- Unit: share of household income
- Tag: ESTIMATED
- Sources:
  - HUD Picture of Subsidized Households, 2025, as reported in local news (search-result summary; national table not fetched) — https://blog.policymap.com/data/sources/huds-picture-of-subsidized-households — "Average rent paid was $478 a month, or 28.9% of average household income, with HUD contributing about $1,007 per household per month" (Vermont)
- Note: ESTIMATED: only state and county figures were seen; the national average was not fetched.
- builderNote: Mechanic: builder; pay the treasury-to-household rent benefit so the tenant's share is about 29% of income; check the national mix against HUD's table in the proof.

## SG-GOV-REACH-A-affordable-units

- Feeds: src/core2/data/laws/reach-group-a.json (housing-construction set-aside)
- Recommended: Set-aside 10 to 20 percent of new units; rental units priced below about 60% of area median income.
- Low / high: 10% of units / 20% of units
- Unit: share of new units
- Tag: SOURCED
- Sources:
  - National Low Income Housing Coalition (with Grounded Solutions Network), 2024 Advocates' Guide, Inclusionary Housing Policies — https://nlihc.org/sites/default/files/AG-2024/6-4_Inclusionary-Housing-Policies.pdf — "an inclusionary housing program might require developers to sell or rent 10 to 20% of new residential units to lower-income residents"
  - Grounded Solutions Network design worksheet (search-result summary) — https://groundedsolutions.org/wp-content/uploads/2018-10/06%20Inclusionary%20Housing%20Design%20Worksheet.pdf — "Rental units are typically below 60% AMI"
- builderNote: Mechanic: builder allocates new units with the set-aside share (the law row's own share) priced below market for eligible households; use 10-20% as the band.

## SG-GOV-REACH-A-rent-contracts

- Feeds: src/core2/data/laws/reach-group-a.json (rent-renewal)
- Recommended: California AB 1482 model: cap = 5% plus local CPI change, never above 10% over 12 months; buildings under 15 years old are exempt. Other places read their own statute from records.
- Low / high: 5% + CPI (cap) / 10% (ceiling)
- Unit: percent per 12 months
- Tag: ESTIMATED
- Sources:
  - California Civil Code 1947.12 (AB 1482), as summarized in search results — https://www.sheppard.com/insights/blogs/statewide-residential-rent-control-california — "may not raise the gross rental rate by more than 5 percent plus the percentage change in the cost of living, or 10 percent, whichever is lower" (search-result summary, page not opened)
- Note: ESTIMATED only because the statute summary was seen in a search result, not on the page; the statute text (Civil Code 1947.12) should be read by the builder. The 2024-2025 effective caps ranged 6.3% (Bay Area) to 8.8% (San Diego) per the same results.
- builderNote: Mechanic: builder resolves cap and building exemptions from the law record per building and delivers the renewal notice; this row is a worked check, not the data for other places.

## SG-GOV-REACH-A-eviction-cases

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-eviction-cases)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: Right-to-counsel coverage by place was not fetched (civilrighttocounsel.org returned 404); builder uses the policy row's own list.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-pretrial

- Feeds: src/core2/data/laws/reach-group-a.json (ending cash bail); justice engine
- Recommended: Share of local-jail inmates held before trial: 457,000 of 664,200 held, about 0.69 (derived; the page lists about 105,000 convicted, which gives 0.81 of that smaller total).
- Low / high: 0.69 / 0.81
- Unit: share of jail population unconvicted
- Tag: SOURCED
- Sources:
  - Prison Policy Initiative, Mass Incarceration: The Whole Pie 2025 — https://www.prisonpolicy.org/reports/pie2025.html — "457,000 people detained before trial in local jails"
  - Bureau of Justice Statistics, Jail Inmates in 2023 statistical tables — https://www.bjs.ojp.gov/library/publications/jail-inmates-2023-statistical-tables — "At midyear 2023, local jails held 664,200 persons in custody"
- Note: The 0.69 is the builder's derived ratio (457,000 / 664,200), not a published figure.
- builderNote: Mechanic: builder; replace the "estimated count of people held" with the justice engine's detained defendants and use 0.69-0.81 only to check the town total.

## SG-GOV-REACH-A-redistricting

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-redistricting)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-police-oversight

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-police-oversight)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-juvenile-age

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-juvenile-age)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-carry-permit

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-carry-permit)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-handgun-age

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-handgun-age)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-stand-your-ground

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-stand-your-ground)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-discrimination

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-discrimination)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-age-verification

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-age-verification)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-facial-recognition

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-facial-recognition)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-data-privacy

- Feeds: src/core2/data/laws/reach-group-a.json (stopgapId SG-GOV-REACH-A-data-privacy)
- Recommended: none: a mechanic, not a number
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - src/core2/data/laws/reach-group-a.json policy `source` field names the statute or publisher the rule is read from (no new figure fetched)
- Note: The policy row already names its source; the builder mechanic reads the law field. No figure was researched for this row.
- builderNote: Builder writes the mechanic named in the stopgap row's replacement; the engine reads the law field already in the policy row.

## SG-GOV-REACH-A-abortion

- Feeds: src/core2/data/laws/reach-group-a.json
- Recommended: Mechanic. Calibration for a year's total: 3,606,400 U.S. births in 2025; general fertility rate 53.1 per 1,000 women 15-44.
- Low / high: 53.1 (2025) / 53.8 (2024 final)
- Unit: births per 1,000 women 15-44
- Tag: MECHANIC (builder)
- Sources:
  - National Center for Health Statistics, U.S. Births down 1% in 2025, 2026 — https://cdc.gov/nchs/pressroom/releases/20260409.html — "3,606,400 births recorded in 2025"; "53.1 births for every 1,000 females ages 15 to 44 in 2025"
- Note: The 2024 final rate of 53.8 comes from the search summary of the same release, not the page text.
- builderNote: Mechanic: builder (OPUS-PEOPLE) renewal engine; use the births figure as a year-end band shared with the births item.
