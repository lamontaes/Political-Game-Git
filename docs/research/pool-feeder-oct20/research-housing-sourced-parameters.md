# research-housing-sourced-parameters: research results (Oct 20 pool feeder)

Sources: Oct 19 files in `data/research/stopgaps-oct19/` reused by id where they cover a row; the rest researched Oct 20 from pages fetched in this session. Tag SOURCED means a fetched measure; ESTIMATED means no direct measure and a stated spread; mechanic means a builder change that reads sourced inputs.

### SG-WORLD-housing-price-index

- Feeds: src/core2/modules/housing.ts price path and the parameter table (house price growth after the last FHFA quarter; island and territory fallback).
- Recommended: (a) keep FHFA state index through 2026Q2 (SOURCED). (b) Puerto Rico: use FHFA's Puerto Rico series, not CPI; NAR's FHFA write-up lists Puerto Rico with the states. (c) Island areas, annual growth fallback from Census median home value 2010 to 2020, annualized (computed here): AS 2.2%/yr, GU 2.5%/yr, MP 4.0%/yr, VI 1.3%/yr. (d) After the last quarter: mechanic, a house price step from the region's incomes, rates and vacancy; until then the national one-year change is a check band.
- Low / high: island-area fallback 0.0% to 4.5%/yr per area (ESTIMATED spread, wide because it is a single decade endpoint pair); national one-year band 1% to 4%/yr around the fetched 2.1% (estimate).
- Unit: percent per year, nominal.
- Tag: SOURCED for FHFA states and the national change; ESTIMATED for island areas.
- Sources:
  - Census Bureau, "New 2020 Island Areas Censuses Data Show Homeownership and Median Home Values", 2023 — https://www.census.gov/library/stories/2023/07/2020-island-areas-home-values.html — "Median home values in the U.S. Virgin Islands (USVI) were the highest ($290,600)"; "The median home value rose 28.6%, from $216,100 in 2010 to $277,800 in 2020."; "Median home value increased by 48.8% in the CNMI from 2010 to 2020, from $123,800 to $184,200."; American Samoa "$84,400", up 23.8% since 2010; USVI up 14.3% from $254,300.
  - National Association of Home Builders, "House price appreciation by state and metro area in the second quarter of 2026", 2026 — https://eyeonhousing.org/2026/09/house-price-appreciation-by-state-and-metro-area-in-the-second-quarter-of-2026/ — "national house prices increased 2.1% in the second quarter of 2026 from a year earlier"; Puerto Rico "also registered an annual increase" and fell 2.6% from the first quarter (it appears in the FHFA state-level results).
  - FHFA, House Price Index page, 2026 — https://www.fhfa.gov/data/hpi — "from all 50 states and over 400 American cities"; the release schedule lists "September 2026 and 2026Q3" for the November 24 release (the page itself does not mention territories).
- builderNote: Check the FHFA state table for a Puerto Rico row and read it instead of CPI; for the other four island areas use the annualized Census growth above with the spread; add the economy house-price step as the builder's mechanic.

### SG-WORLD-housing-island-areas

- Feeds: src/core2/modules/housing.ts starting tenure, rent and value for AS, GU, MP, VI.
- Recommended table (2020 Census Island Areas):

| Place | Owner share of occupied units | Median gross rent per month            | Median home value |
| ----- | ----------------------------- | -------------------------------------- | ----------------- |
| AS    | 71.1%                         | $601                                   | $84,400           |
| GU    | 52.0%                         | $1,057 (excludes military housing)     | $277,800          |
| MP    | 29.0%                         | $750 ESTIMATED (low $502, high $1,057) | $184,200          |
| VI    | 47.8%                         | $926                                   | $290,600          |

- Low / high: owner share and value are census counts (no spread beyond rounding); MP rent is an estimate: no all-units median was found; $502 is the median gross rent for units built in 2019 or 2020 (a floor), $1,057 is Guam (a ceiling).
- Unit: percent of occupied units; US dollars per month; US dollars.
- Tag: SOURCED except MP rent (ESTIMATED).
- Sources:
  - Census Bureau, 2020 DHC Summary File American Samoa press release, 2023 — https://www.census.gov/newsroom/press-releases/2023/2020-dhc-summary-file-american-samoa.html — "71.1% of occupied units were owned, while 28.9% were rented."; "The median home value was $84,400, and the median gross monthly rent $601."
  - Census Bureau, 2020 DHC Summary File Guam press release, 2023 — https://www.census.gov/newsroom/press-releases/2023/2020-dhc-summary-file-guam.html — "52.0% of the island's householders in occupied units were owners, and 48.0% were renters."; "The median monthly rent was $1,057."; "The median home value was $277,800."
  - Census Bureau, Island Areas home values story, 2023 — https://www.census.gov/library/stories/2023/07/2020-island-areas-home-values.html — USVI "$290,600"; CNMI "from $123,800 to $184,200".
  - Census Bureau, USVI DHC and CNMI cross-tabulation releases (read as web-search excerpts, pages not fetched whole) — https://www.census.gov/newsroom/press-releases/2023/2020-dhc-summary-file-usvi.html and https://census.gov/newsroom/press-releases/2024/2020-island-areas-cross-tabulation-cnmi.html — USVI "47.8% by owners and 52.2% by renters", median gross rent "$926"; CNMI "29.0% were occupied by owners and 71.0% by renters", "$502 applies to households living in units built in 2019 or 2020".
- builderNote: Replace the national-share fallback for these four with the table; the MP rent is a registered estimate until the CNMI DHC housing table (data.census.gov) is read; confirm USVI and CNMI values on that table.

### SG-WORLD-housing-eviction-steps

- Reused from `data/research/stopgaps-oct19/D-economy-world.json` (id `SG-WORLD-housing-eviction-steps`); confidence low.
- Recommended: `{"fillMedians":{"noticeDays":7,"stayAfterJudgmentDays":5,"hearingDaysMidpoint":8.75,"cureAllowed":true},"rangeNotice":[0,14],"rangeStay":[0,21],"gapPlaces":["AL","AR","CA","CT","GA","IL","IN","MS","NM","TN","UT","GU","VI","AS"]}`
- Low / high: `0` / `21`; unit: days
- Tag: ESTIMATED
- Basis: Computed medians from the repo's own verified fields (eviction-steps-2026.json): notice 7 days (29 verified places, range 0-14), stay after judgment 5 days (34 places, 0-21), hearing midpoint 8.75 days (36 places); cure is allowed in most verified places. No statute text was fetched here, so the 14 gap places keep the median fill with low confidence, and the official statutes still need to be read.
- Sources fetched (1):
  - Political-Game-Git repo, eviction-steps-2026.json, 2026 — https://github.com/lamontaes/Political-Game-Git/blob/main/data/research/housing/eviction-steps-2026.json — "noticeDays 7, cureAllowed true, verifiedFields"
- builderNote: Keep median fill in housing.ts; set these medians as constants (7, 5, 8.75, cure true) and tag each gap place isEstimate:true until statutes are read.

### SG-WORLD-housing-foreclosure-steps

- Reused from `data/research/stopgaps-oct19/D-economy-world.json` (id `SG-WORLD-housing-foreclosure-steps`); confidence low.
- Recommended: `{"typicalDaysFillByProcess":{"nonjudicial":174,"judicial":2007,"both":2293},"fromRepoATTOMValues":"medians from 14 places with published ATTOM days (nonjudicial n=10, judicial n=3, both n=1); nonjudicial includes NV 1507 and RI 1929 as outliers","redemptionFillDays":0}`
- Low / high: `155` / `3491`; unit: days from first filing to sale
- Tag: ESTIMATED
- Basis: Computed from the repo's ATTOM days: nonjudicial median 174 days (155-199 for most, with NV and RI at 1507 and 1929), judicial median 2007. Filling a place by its process class beats the national average (about 198 across the 14) because judicial states run 10x longer. No statute text was fetched, so all 56 places stay unverified.
- Sources fetched (1):
  - Political-Game-Git repo, foreclosure-steps-2026.json, 2026 — https://github.com/lamontaes/Political-Game-Git/blob/main/data/research/housing/foreclosure-steps-2026.json — "typicalDaysToComplete 199 Alaska; ATTOM Q2 2026"
- builderNote: In housing-foreclosure.ts use the process-class fill (174 non-judicial, 2007 judicial, 2293 both) instead of nationalTypicalDaysToComplete; read statutes to upgrade each place.

### SG-WORLD-housing-shelter-beds-state-rate

- Reused from `data/research/stopgaps-oct19/D-economy-world.json` (id `SG-WORLD-housing-shelter-beds-state-rate`); confidence low.
- Recommended: `{"stateRatesFromRepoHIC2025":"54 places fetched from repo (min 2.47, median 9.54, max 71.58 per 10,000; nation 14.56)","placeFactor":{"principal_city_of_CoC":2.0,"suburban_or_small_town_under_50k":0.35,"rural_under_5k":0.1}}`
- Low / high: `2.47` / `71.58`; unit: beds per 10,000 people
- Tag: ESTIMATED
- Basis: The repo's HUD 2025 table gives the state rates (median 9.54, nation 14.56). Beds sit in CoC principal cities, so a state rate times population overstates small towns; the factors 2.0, 0.35 and 0.1 are my estimates (not fetched) normalized so a state's places sum to its beds.
- Sources fetched (1):
  - Political-Game-Git repo, hic-2025-shelter-beds-by-state.json, 2026 — https://github.com/lamontaes/Political-Game-Git/blob/main/data/research/housing/hic-2025-shelter-beds-by-state.json — "national bedsPer10k 14.56; yearRoundBeds 497490"
- builderNote: In housing-homeless.ts multiply the state rate by the placeFactor class and renormalize across the state's places; replace by HIC provider geocodes later.

### SG-WORLD-housing-shelter-territory

- Reused from `data/research/stopgaps-oct19/D-economy-world.json` (id `SG-WORLD-housing-shelter-territory`); confidence low.
- Recommended: `{"AS":6.2,"MP":6.2}`
- Low / high: `2.47` / `10.9`; unit: beds per 10,000 people
- Tag: ESTIMATED
- Basis: Fetched from the repo: Guam 6.18, Puerto Rico 2.47 and the U.S. Virgin Islands 10.9 beds per 10,000. American Samoa and the Marianas lack a CoC, so I use the territory median (6.2) instead of the national 14.56, which they likely exceed by 2x or more. Territory governments' own counts are still needed.
- Sources fetched (1):
  - Political-Game-Git repo, hic-2025-shelter-beds-by-state.json, 2026 — https://github.com/lamontaes/Political-Game-Git/blob/main/data/research/housing/hic-2025-shelter-beds-by-state.json — "US-GU bedsPer10k 6.18; US-VI 10.9; US-PR 2.47"
- builderNote: In housing-homeless.ts use 6.2 for AS and MP, not the national rate.

### SG-WORLD-housing-mortgage-history

- Feeds: src/core2/housing-mortgages.ts purchase-year, price, rate and refinancing inputs.
- Recommended: (a) rate path: read the weekly Freddie Mac 30-year fixed series as the origination rate by purchase date (latest sourced point: 7.40% on October 15, 2026; 6.27% a year earlier). (b) Refinancing: mechanic, an owner refinances when the current rate is below the loan's rate by the balance-and-fee break-even computed from the loan, with no fixed chance. (c) Purchase price: FHFA state index (see SG-WORLD-housing-price-index). (d) County mortgage shares by age (ACS B25038, B25027) and the NAR median down payment: not obtained this session (Census API needs a key per the Oct 19 README; the NAR page fetched did not show the down-payment figure), so keep the registered parameter and its ESTIMATED tag.
- Low / high: current-rate band 6.27% to 7.40% (the two fetched points); down payment unresolved.
- Unit: percent per year; fraction of price.
- Tag: mechanic (builder) with one SOURCED rate input.
- Sources:
  - Freddie Mac, Primary Mortgage Market Survey, 2026 — https://www.freddiemac.com/pmms — "The 30-year fixed-rate mortgage averaged 7.40% as of October 15, 2026, unchanged from last week."; "A year ago at this time, the 30-year FRM averaged 6.27%."
  - National Association of Realtors, Highlights from the Profile of Home Buyers and Sellers, 2026 — https://www.nar.realtor/research-and-statistics/research-reports/highlights-from-the-profile-of-home-buyers-and-sellers — "mortgage interest rates averaged 6.69% during the data collection period" (down-payment figure not on the page).
- builderNote: Load the historical weekly series (Freddie Mac PMMS or FRED MORTGAGE30US, not fetched here) as a research file with a reader; derive refinancing from the rate gap, not a roll.
