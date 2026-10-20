# research-people-sourced-parameters

Oct 20 pool-feeder research for seven people rows. Five were worked on Oct 19 (file E-careers-finance.json) and are reused by key; the births row was refreshed with 2025 NCHS numbers fetched this session; the views row is a mechanic. Three rows are ESTIMATED because no page supports them.

## SG-M1-births-circumstances

- Feeds: src/core2/births-plan.ts; src/core2/data/renewal/parameters.json
- Recommended: Year-end calibration: U.S. births 3,606,400 in 2025; general fertility rate 53.1 per 1,000 women 15-44; teen birth rate 11.7 per 1,000 women 15-19. Rates check the total only; they never pick a pregnancy.
- Low / high: 53.1 (2025) / 53.8 (2024 final, search summary)
- Unit: births per 1,000 women 15-44
- Tag: SOURCED
- Sources:
  - National Center for Health Statistics, U.S. Births down 1% in 2025, 2026 — https://cdc.gov/nchs/pressroom/releases/20260409.html — "3,606,400 births recorded in 2025"; "53.1 births for every 1,000 females ages 15 to 44 in 2025"; "11.7 births per 1,000 women"
  - NCHS, National Survey of Family Growth — https://www.cdc.gov/nchs/nsfg/index.htm — "gathers information on pregnancy and births, marriage and cohabitation, infertility, use of contraception" (the individual-level source a clinical-records model would draw on)
- Note: The CDC infertility page returned 404, so no infertility share is sourced here. The clinical reproductive records and infant-development producer are builder work.
- builderNote: Mechanic plus band: builder replaces the proxies with individual reproductive records; the proof reports the town's births per 1,000 women 15-44 against 53.1.

## SG-P10-response-model

- Feeds: src/core2/data/drives.json
- Recommended: Keep the prototype response weights. The Oct 19 pass fetched no page with trajectory shares and withdrew its earlier unsourced split.
- Low / high: 0.45 / 0.65
- Unit: share of responses to major loss (unsupported range)
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/E-careers-finance.json key SG-P10-response-model (confidence low, sources empty) — no page fetched
- Note: Weights stay prototype; the range is the Oct 19 researcher's design estimate with no citation.
- builderNote: No change; keep the stopgap registered and note that no appraisal or bereavement-trajectory page was reachable.

## SG-P10-perception-model

- Feeds: src/core2/data/drives.json
- Recommended: Optionally clamp the per-trait channel multiplier to 0.67 to 1.5, labeled estimate; channel membership stays authored.
- Low / high: 0.67 / 1.5
- Unit: salience multiplier
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/E-careers-finance.json key SG-P10-perception-model (confidence low, sources empty) — no appraisal-research page fetched
- Note: The clamp is a design estimate, not a measured value.
- builderNote: Add the clamp as a TUNABLE labeled ESTIMATED, or leave as is.

## SG-P10-drive-acts

- Feeds: src/core2/data/drives.json (volunteer act)
- Recommended: Volunteering act lasts 2.18 hours; about 5.3% of people volunteer on an average day; 0.12 hours per person per day. Other acts (tell, join, donate, confront) have no fetched duration.
- Low / high: 2.16 hours (women) / 2.20 hours (men)
- Unit: hours per participant day; share of adults
- Tag: SOURCED
- Sources:
  - Bureau of Labor Statistics, American Time Use Survey news release, Table 1, 2024 — https://www.bls.gov/news.release/atus.t01.htm — "Volunteering (organizational and civic activities) 0.12 ... 5.3 ... 2.18" (Oct 19, fetched)
- Note: National only; territories use the national figure. The 5.3% is a check on the day's share, not a per-person chance.
- builderNote: Set the volunteer act duration to 2.18 hours and report the daily share against 5.3%; leave other durations prototype.

## SG-P15-kin-generation

- Feeds: src/core2/data/opening-kin.json
- Recommended: 65% of adults with a living parent live within an hour of that parent; 72% of parents with an independent adult child live within an hour of one; 55% of adults live within an hour of some extended family. The Oct 19 census rerun found 0.57 of parents and 0.45 of adult children outside the county nationally.
- Low / high: 0.55 / 0.72
- Unit: share within an hour's drive
- Tag: SOURCED
- Sources:
  - Pew Research Center, Families Drawn Together By Communication Revolution, 2006 — https://www.pewresearch.org/social-trends/2006/02/21/families-drawn-together-by-communication-revolution/ — "live within an hour's drive of that parent" (Oct 19, fetched)
  - Pew Research Center, More than half of Americans live within an hour of extended family, 2022 — https://www.pewresearch.org/short-reads/2022/05/18/more-than-half-of-americans-live-within-an-hour-of-extended-family/ — "55% ... live within an hour's drive of at least some extended family" (Oct 19, fetched)
  - data/research/stopgaps-oct19/census/census-rerun.results.json (Oct 19) for the county-level translation
- Note: One national rule for all 56 places; no place variation sourced.
- builderNote: Constrain kin placement so about 65% of parents and 72% of adult children sit within an hour; the kin-matching engine stays a later build.

## SG-P15-personality-mapping

- Feeds: src/core2/data/opening-kin.json; parameters.json personality* rows
- Recommended: Keep the A4 quadratic term at 0; no legible Terracciano and others (2005) Table 2 could be fetched (PubMed blocked).
- Low / high: -0.002 / 0.0
- Unit: T-score points per year squared
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/E-careers-finance.json key SG-P15-personality-mapping (confidence low, sources empty) — no page fetched
- Note: The earlier -0.0008 guess was withdrawn on Oct 19.
- builderNote: Leave the quadratic at 0 and replace only after Table 2 is read from a legible copy.

## SG-P15-views-first-version

- Feeds: src/core2/modules/views.ts
- Recommended: Mechanic: opening views from education, faith, place type and upbringing through CES-derived weights, plus the 14 values.
- Low / high: n/a / n/a
- Unit: n/a
- Tag: MECHANIC (builder)
- Sources:
  - Cooperative Election Study (Harvard) — https://cces.gov.harvard.edu/ — fetch returned 403 this session, so no CES figure or sample size is recorded
- Note: The weights must be read from CES microdata by the builder; none were researchable by page fetch.
- builderNote: Mechanic: builder derives the weights from CES cells and keeps the stopgap registered until the 14 values are formed.
