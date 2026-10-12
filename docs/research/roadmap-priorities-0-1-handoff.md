# Priorities 0 and 1 research handoff

This branch completes a research pass through P0-1–P0-13 and R1–R12 under Roadmap Rule 8. Every topic has a separate pushed commit. All 82 requests assigned to these priorities have an answer with remaining gaps. This is research for future adoption; no simulation code or parameter values changed, and nothing was merged.

**The pass does not provide complete calibration for all 56 jurisdictions.** In particular, eviction law, marriage and majority law, office structures and vacancies, local taxation, current program eligibility, and representative local budget histories remain incomplete. No estimated number supplies missing legal authority. National and foreign study findings are benchmarks, not independently measured rates for every state.

The topic files and request answers are the source records. The research log records files, coverage, terms questions and elapsed topic work. Model: GPT-6/Codex; actual effort and usage are not exposed. Recorded times exclude source retrieval performed before each topic timer. No subagents were used or finisher review claimed.

| Topic | Findings available                                                                                                  | Material remaining gaps                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P0-1  | Consumer spending by region and household size; sampled local-government spending components                        | Local vendor shares, nonlocal leakage, unincorporated-area purchasing and town visitor spending          |
| P0-2  | IRS sole-proprietor industry cost ratios; preliminary household windfall response                                   | Firm-size liquidity, cash-buffer days, local sales and competition coefficients                          |
| P0-3  | Published pay-frequency, wage and schedule benchmarks; historical payday summary                                    | Current statutory payment lags in all places; occupation-specific tenure effects                         |
| P0-4  | ATUS time use, CPS absence, employer insurance and SCF account balances                                             | Physical cash, current local living costs and medical costs by age and place                             |
| P0-5  | Licensed daily-diary affect measures and an explicit mathematical conversion                                        | Representative day-scale mood/stress recovery and choice weights                                         |
| P0-6  | State civic engagement, help/contact measures and Pew friend contact                                                | Tie survival, distance, turnover, workplace networks and congregation inventory                          |
| P0-7  | Family, marriage and first-birth aggregates; one majority-law check                                                 | Complete majority/marriage law, birth spacing, partner age gaps and licensed trait norms                 |
| P0-8  | Licensed foreign bereavement trajectory comparisons                                                                 | Representative US grief classes, actions and causal recovery constants                                   |
| P0-9  | SSA claim-age and benefit distributions; pension access and federal retirement rules                                | Career lengths and territorial distributions                                                             |
| P0-10 | Licensed modern event-appraisal comparisons                                                                         | US event weights and recall decay                                                                        |
| P0-11 | FEC aggregate finance measures by candidate status                                                                  | Causal incumbency effects by level and unprompted candidacy rates                                        |
| P0-12 | CDC causes by age; NOAA reported hazards/damage; FEMA designated-area declarations                                  | Serious illness duration, matched officeholder mortality and home vulnerability curves                   |
| P0-13 | SSA published name cohorts, Census surnames, NCES naming patterns                                                   | Small/suppressed name cells, individual island distributions and school founding-era evidence            |
| R1    | LAUS history and descriptive persistence; QCEW industry payroll                                                     | Metro output, complete BEA industry measures and missing territory series                                |
| R2    | NY Fed household debt, G.19 credit and federal underwriting mechanisms                                              | Bank balance sheets, local credit-line amounts and verified underwriting schedules                       |
| R3    | JOLTS, CPS duration, OEWS staffing and DOL wage summaries                                                           | Vacancy fill duration, current local ordinances and teen job histories                                   |
| R4    | FHFA growth summaries, vacancy, purchase-cost guidance and partial Washington statute checks                        | Full eviction matrices, rental stocks, local price levels and supply elasticities                        |
| R5    | Local fiscal-year-end sample and federal withholding/payroll rules                                                  | Adoption deadlines, local tax authority, reserves, pensions and territory revenue mixes                  |
| R6    | FY2026 match rates, SNAP ceilings, Medicare costs, SSA formula and highway apportionments                           | Current eligibility, full UI formulas, education awards, state school aid and local pass-through         |
| R7    | Verified subset of state structure, federal succession, DC structure and partial territory facts                    | Complete all-office matrices, current party balances, local samples and age/tenure aggregates            |
| R8    | Census BDS state/PR births, exits, age/size/industry marginals; owner-payment distinctions                          | Startup funding, draws, multi-unit shares and four island business series                                |
| R9    | Reported IRS address flows, county population components and CPS mover reasons                                      | Complete resident flows, territorial series, causal choices and disaster return times                    |
| R10   | Licensed US crisis-participation associations and foreign closure comparisons                                       | Lasting blame, ambition/cause formation, attribution and persistence by traits                           |
| R11   | 22,705 county/place/municipio population rows; 78 PR identity joins; 571 territorial PLACE features                 | Current island populations, CDP population stocks and missing recent local growth                        |
| R12   | Federal actuals FY2021–25; Census components 2021–24; full summaries 2021–22; CA enacted/actual General Fund sample | Other enacted budgets, local histories, territory finances, 2025 state/local totals and opening balances |

## Corrections to apply before adoption

Rule 3 requires new files in existing research folders. Corrections therefore live in new verified files; the earlier findings remain for review.

- Use [complete crisis coefficients](../../data/research/drives/roadmap-r10-crisis-tables-verified.json) instead of the initial R10 table files. The first extractor omitted significance-marked cells, including all Table 5 rows. The verified file contains 35 coefficients and five observation counts. The total-act count model scale remains unverified; do not apply a binary log-odds interpretation to it.
- Apply [verified highway stages](../../data/research/programs/roadmap-r6-highway-stages-verified.json) to the original R6 table indices. Stages 1 and 2 both precede set-asides and differ by treatment of penalty shifts. Stage 3 includes set-asides. These are alternatives, not additive receipts.
- Apply [FHFA row geography](../../data/research/housing/roadmap-r4-fhfa-coverage-verified.json) to the two growth-summary files. The original row metadata used the source footprint; each datum belongs to its named state or metro.
- Use [island baseline records with full provenance](../../data/research/places/roadmap-r11-island-baselines-verified.json) instead of the original island baseline file. These are April 2020 census counts, not January 2026 estimates.
- Join the procurement sample to [exact government identity names](../../data/research/core-figures/P0-1/public-spending-government-identities-2023.csv) using `government.id = governmentId`. The JSON sample retains IDs; the CSV preserves official names.
- Apply [column and coverage contracts](../../data/research/core-figures/roadmap-priorities-0-1-column-contracts.json) to CSV aliases and FIPS identifiers. The P0-1 procurement envelope contains E* current operations plus F* construction, excluding G* other capital. Its bound applies to the procurement subset of those components, not all government procurement.

## Limits on use

Published survey means, regression coefficients, indexes and Census estimates retain their source design and uncertainty even when an earlier transcription marks `isEstimate: false`. That flag generally distinguishes transcription from an author extrapolation; it does not guarantee a census or zero sampling error. The column contract records this convention. Only explicitly supported population scenarios have a projected January 2026 center and range; their ranges are scenarios, not confidence intervals.

IRS migration covers matched tax returns and reported, unsuppressed address pairs. It does not cover everyone, and excluded residual destinations prevent closed probability routing. Census population components are net changes, not gross immigration. FEMA county designations are not independent disasters, and NOAA forecast zones are not counties. Damage estimates are reported aggregates, not measured home-level damage functions.

Census financial reports describe reported finance, not adopted appropriations or local vendor purchases. Preserve calendar, fiscal period, fund, units and revision before balancing accounts. State and local gross totals are not additive consolidated budgets. Federal actuals are nationwide amounts, not funds allocated to each place. California is a single General Fund example.

FY2026 SNAP and Medicaid rules cover the January 2026 opening; later dates require FY2027 rules. Historical Medicaid eligibility and payday tables are labeled as historical. No missing statute, benefit, expense, office or territorial observation becomes zero or permission.

Empirical rates and associations check aggregate simulation results. They do not supply random actor choices, daily hazards, per-loss grudges or arbitrary blame targets.

## Source terms

Agency statistics and legal facts carry government-work or publisher terms with their URLs. CC BY study derivatives retain attribution; underlying survey microdata and third-party article material are excluded. Pew notices and disclaimer are retained. NY Fed's broader terms allow derivatives used in business with attribution; the Small Business Credit Survey's separate CC BY-NC terms do not, so its numerical tables were excluded. JPMorgan liquidity, personality norms, religion datasets and several academic coefficients remain licensing gaps.

No Council of State Governments Book of the States, Zillow, Eviction Lab, S&P Case-Shiller, Freddie Mac survey, ANES, GSS or Ballotpedia data were adopted. Real officeholders and candidates were not collected; office findings are structural or aggregate.

## Validation

The [validation receipt](../../data/research/core-figures/roadmap-priorities-0-1-validation.json) records the final inventory and checks. Validation covers changed research files: strict JSON parsing, CSV structure, file sizes, row provenance with the documented aliases/supersessions, request-field preservation, selected raw-file hashes and arithmetic identities. It does not establish full legal coverage or scientific causal identification.

Repository gate commands: changed-file Prettier check, `git diff --check`, `npm run zero-dice`, and `node --import /tmp/roadmap-tools/node_modules/tsx/dist/loader.mjs scripts/release/index.ts check --mode pr`. The temporary loader runs the same release checker without modifying repository dependencies. The first standard release command could not find the absent `tsx` dependency; the temporary-tool run passed. The prior CI American English check flagged a Census proper name and a DC seat summary. Exact sampled-government names now live in a CSV identity table joined by government ID; the DC summary uses district-seat phrasing. No official name was respelled and no test changed. The focused American English test passed all 25 cases with the repository's 30-second timeout. The temporary runner's initial default 5-second timeout expired; no spelling hits remained. Command: `/tmp/roadmap-tools/node_modules/.bin/vitest run tests/american-english.test.ts --config /tmp/roadmap-vitest.config.mts --testTimeout 30000`. The temporary config resolves Vitest without installing repository dependencies.

Typecheck, eslint, game tests and startup bench are inapplicable to this research-only change; the roadmap explicitly waives the startup bench. No full suite was run.
