# Every world opens on the real published numbers

Every world opens on the same real statistics in almost every table. The President's 4.1% unemployment is the real December 2024 figure, and so are the town's rents, jobs, pay, budgets, poverty and crime rates, and the 2024 election map. Of 55 statistic groups audited, 42 are the same in every world. Nine are already drawn per world or per person, two are calibration only, and two are law. Each of the 42 gets its own fix, starting with the national economy the President's address reads. The CTO has two questions below.

## For the CTO

- **Two rulings conflict on disasters.** On October 16, 2026 the owner kept FEMA's records in play (`docs/coordination/OWNER-DECISIONS.md:539`). His October 27, 2026 ruling covers "every statistic unless it is in law." This report treats the newer ruling as covering disasters, so row 41's fix makes the records calibrate hazard causes (inferred; please confirm and record it).
- **The property-tax rate is the county's effective rate from the Census survey, not a statute** (row 53). It stays as law until you rule whether it is law or a statistic.

## The rule being applied

- Owner, October 27, 2026, 5:40 PM Eastern: "THE 4.1% IS STILL HARDCODED. I SAID NO REAL DATA. EACH START SHOULD BE DIFFERENT BASED ON THE SIMULATION. REALISTIC NOT REAL." And: "IT GOES FOR EVERY STATISTIC UNLESS IT IS IN LAW."
- Owner, October 27, 2026, earlier: "Real data is just used to calibrate; as soon as you press start, it's alternate history" (`docs/coordination/OWNER-DECISIONS.md`, the President's address).
- `docs/codex/README.md`: starting values "start from real averages with a per-world spread."
- A statistic is copied when it enters every world as the same figure: the published one, or one fixed estimate. It is drawn when a seeded offset around the published number sets it. Calibration means the figure only checks totals and never sets a value. Law means a rate or rule set by statute, which the owner exempted.

## Counts

| Class       | Groups | What it means                                                                   |
| ----------- | ------ | ------------------------------------------------------------------------------- |
| Copied      | 42     | Every world opens on the same figure: the published one, or one fixed estimate. |
| Drawn       | 9      | A seeded per-world or per-person draw around the published figure.              |
| Calibration | 2      | Used only as a check in tests.                                                  |
| Law         | 2      | Statute rates and rules; they stay as the real starting law.                    |
| **Total**   | **55** |                                                                                 |

Of the 42 copied groups, 5 are base rates that drive events in play (deaths, births, moves, crime, unemployment by age). The other 37 are starting levels.

## The table

Paths are under `src/` unless they start with `data/`. "Read" marks code a reviewer opened; "partly" marks a reader and file found but not followed to the screen.

### National and regional economy

| #   | Statistic                                                                                                                                                                | Data                                                     | Reader                                                                                 | Class            | Player sees it                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | National unemployment, prices and inflation, payroll jobs, hourly earnings, real output, policy, prime, 10-year and mortgage rates, and every month back to January 2021 | `core2/data/macro/history.json`                          | `core2/macro-model.ts:106` `historyMonths`; `core2/modules/macro.ts:321` `open` (read) | Copied           | The President's address and the first night's news (`director/opening-story.ts:233-256`), the Economy screen (`bench/play.mjs:3763`) |
| 2   | Central bank rate history                                                                                                                                                | same file                                                | `core2/central-bank-board.ts:3` (partly)                                               | Copied           | Board decisions                                                                                                                      |
| 3   | State and metro unemployment, jobs, hourly pay, income per person, regional price parity, sector mix                                                                     | `core2/data/regional/regions.json`                       | `core2/regional-model.ts:122` `openingRegionMonths` (read)                             | Copied           | The opening's jobs report (`bench/printed-words.ts:616-628`), the Economy screen's region row                                        |
| 4   | Unemployment by age and seasonal staffing                                                                                                                                | `core2/data/jobs/age-unemployment.json`, `seasonal.json` | `core2/modules/jobs.ts:585, 912` (partly)                                              | Copied base rate | Who is out of work                                                                                                                   |

### Housing

| #   | Statistic                                      | Data                                                        | Reader                                                                  | Class  | Player sees it                                               |
| --- | ---------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| 5   | State house price index, annual prices         | `core2/data/housing/housing.json`, `history.json`           | `core2/housing-prices.ts:7-66` (read)                                   | Copied | Home values, mortgage balances                               |
| 6   | County median rent, home value and owner share | `core2/data/housing/housing.json`                           | `core2/modules/housing.ts:430-607` (read)                               | Copied | Each household's rent and home value                         |
| 7   | County median home value (old core)            | ACS B25077                                                  | `simulation/county-home-value.ts:11-60` (read)                          | Copied | Scene tier by home value (`bench/scene.ts:242-264`)          |
| 8   | HUD fair market rents and income limits        | `core2/reference/town-rent.generated.ts`                    | `core2/hud-rents.ts:65-128` (partly)                                    | Copied | Household shelter costs                                      |
| 9   | Shelter beds and building permits              | `core2/data/housing/shelter-beds.json`, `construction.json` | `core2/housing-homeless.ts:104`, `housing-construction.ts:106` (partly) | Copied | Where homeless households can stay, how many homes get built |

### Jobs, pay and money

| #   | Statistic                               | Data                                                                   | Reader                                                                     | Class                                                               | Player sees it             |
| --- | --------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| 10  | Share of each age employed, by county   | `core2/data/opening-employment.json` and two resident tables           | `core2/opening-employment.ts:76` (read)                                    | Copied                                                              | Who has a job              |
| 11  | Pay by occupation and area (BLS OEWS)   | `core2/reference/town-pay.generated.ts`                                | `core2/town-pay.ts:104-125` (partly)                                       | Copied: the same pay center and the same tenure rule in every world | Each worker's pay          |
| 12  | The town's jobs by sector               | `core2/reference/town-employment.generated.ts`                         | `core2/town-employment-mix.ts:66-233` (partly)                             | Copied                                                              | Which workplaces exist     |
| 13  | Median earnings by place                | `core2/data/place-earnings-2024.json`                                  | `core2/residents.ts:760-799` (partly)                                      | Copied                                                              | Pay of counted workers     |
| 14  | Starting household cash (SCF)           | `data/research/money/scf-transaction-accounts-2022.json`               | `core2/starting-cash.ts:13` (read)                                         | Copied                                                              | Cash on hand               |
| 15  | Living costs and household goods prices | `core2/reference/living-costs-data.ts`, `core2/data/prices/goods.json` | `core2/opening-finance.ts:838`, `modules/place-prices.ts:292-388` (partly) | Copied                                                              | Bills and prices           |
| 16  | Average Social Security benefit         | `core2/data/opening-income.json`                                       | `core2/opening-income.ts:753-761` (partly)                                 | Copied                                                              | Retirees' income           |
| 17  | Bank deposits by county (FDIC)          | `core2/data/tables/town-deposits.json`                                 | `core2/modules/credit.ts:122` (partly)                                     | Copied                                                              | The town bank's size       |
| 18  | Private school share and tuition        | `core2/data/opening-private-tuition.json`                              | `core2/opening-private-tuition.ts:59, 107` (partly)                        | Copied                                                              | Who pays tuition           |
| 19  | Living costs by household (old core)    | BLS CES                                                                | `simulation/cost-of-living.ts:169-171` (read)                              | Drawn                                                               | Already a per-world spread |
| 20  | Market rent (old core)                  | HUD FMR                                                                | `simulation/living-world/town-rent.ts:25-28` (read)                        | Drawn                                                               | Already a per-world draw   |

### Business

| #   | Statistic                                                                       | Data                                                       | Reader                                                              | Class  | Player sees it                                     |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| 21  | Business closure rate (Census BDS) and the share of jobs in outside-owned firms | `core2/data/business/bds-rates.json`, `ownership.json`     | `core2/modules/business.ts:183, 2301`, `past-business.ts:87` (read) | Copied | Closures in the news archive                       |
| 22  | Union membership by state                                                       | `core2/data/business/union-membership.json`                | `core2/membership-dues.ts:57` (partly)                              | Copied | A union local's dues                               |
| 23  | Businesses per resident (County Business Patterns)                              | old core                                                   | `simulation/local-business-counts.ts:1-30` (read)                   | Copied | How many businesses a town has                     |
| 24  | Margins, pay share and sales per worker (IRS)                                   | old core                                                   | `simulation/living-world/town-business-books.ts:1-30` (partly)      | Copied | The news layoff block (`bench/play.mjs:3904-3918`) |
| 25  | Opening cash days by industry                                                   | `core2/data/opening-capital.json`                          | `core2/opening-capital.ts:263` (read)                               | Drawn  | Already a seeded spread                            |
| 26  | Local news outlets per state                                                    | `data/research/press/local-news-2026.json`                 | `core2/modules/press.ts:259, 525` (partly)                          | Copied | How many outlets a town has                        |
| 27  | Campaign ad prices                                                              | `data/research/campaign-reality/campaign-unit-prices.json` | `core2/modules/campaigns.ts:36` (partly)                            | Copied | What an ad costs                                   |

### Population, people and health

| #   | Statistic                                       | Data                                                                        | Reader                                                                      | Class            | Player sees it                                                        |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| 28  | Town, county and state population               | `core2/data/tables/place-population.json`                                   | `core2/gov-rules/place-population.ts:60`, `core2/population.ts:1445` (read) | Copied           | Town size in the creator (`bench/creator.ts:179-198`) and the opening |
| 29  | Household shapes                                | `core2/reference/household-mix.generated.ts`                                | `core2/town-households.ts:76-84` (read)                                     | Drawn            | Per-household draw                                                    |
| 30  | Kin ages and partnership                        | `core2/data/opening-kin.json`, `opening-partnership.json`                   | `core2/opening-kin.ts` (partly)                                             | Drawn            | Per-person draw                                                       |
| 31  | Birthplace share and gun ownership              | `core2/data/state-nativity-2024.json`, `data/people/firearm-ownership.json` | `core2/nativity.ts:62-66` (read)                                            | Drawn            | Per-person draw                                                       |
| 32  | Chronic conditions by age                       | `data/research/health/chronic-condition-pack-2026.json`                     | `core2/condition-pack.ts:123` (read)                                        | Copied           | People's health records                                               |
| 33  | Death rates (SSA 2023 life table, state ratios) | `core2/data/health/ssa-2023-period-life-table.json`                         | `core2/health-mortality-table.ts:1`, `births-counted.ts:442` (partly)       | Copied base rate | Who dies                                                              |
| 34  | Birth and cohort tables                         | `data/research/renewal/natality-*.json`                                     | `core2/births-counted.ts:145-173` (partly)                                  | Copied base rate | Births                                                                |
| 35  | Movers by age and state (ACS)                   | `data/research/migration/mover-rates-acs-2024.json`                         | `core2/modules/moves.ts:180` (partly)                                       | Copied base rate | Who leaves town                                                       |
| 36  | Time use (ATUS)                                 | `core2/data/time-use-reference.json`                                        | `core2/free-block.ts:154` (partly)                                          | Copied           | How people spend their free hours                                     |
| 37  | School names, grades and enrollment (NCES)      | `core2/data/opening-schools.json`, `opening-public-schools.json`            | `core2/deep-past.ts:37, 351-367` (read)                                     | Copied           | The Journal's memoir names real schools                               |
| 38  | School name shapes (old core)                   | `simulation/school-name-patterns.json`                                      | `simulation/school-names.ts:1-25` (read)                                    | Drawn            | Already generated names                                               |

### Outcomes, crime and disasters

| #   | Statistic                                                                                                                          | Data                                                      | Reader                                                                 | Class            | Player sees it                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------- | ----------------------------------------------- |
| 39  | About 55 measures per state: poverty, uninsured, graduation, turnout, violent crime, homelessness, air quality, overdoses and more | `data/research/outcome-web/place-outcome-bases-2024.json` | `core2/outcome-web-model.ts:243-310` (read: "Never zero, never drawn") | Copied           | Kept measures that views, news and screens read |
| 40  | Crime victimization rates (NCVS)                                                                                                   | `core2/data/crime/victimization.json`                     | `core2/modules/crime.ts:260` (read)                                    | Copied base rate | Crimes and news                                 |
| 41  | FEMA declarations, aid and damaged homes, replayed on their real dates                                                             | `core2/data/disasters/*.json`                             | `core2/modules/disasters.ts:107-200` (read)                            | Copied           | News and household payments                     |

### Elections, officials and government money

| #   | Statistic                                                                 | Data                                                                         | Reader                                                                           | Class                            | Player sees it                             |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------ |
| 42  | 2024 county vote, turnout, citizenship and the contested-state map        | `core2/data/county-presidential-2024.json`, `place-citizenship-2024.json`    | `core2/electorate-places.ts:155, 233-310`, `officials-president.ts:36-60` (read) | Copied                           | Outside-town vote, state and federal races |
| 43  | Past election vote shares                                                 | same                                                                         | `core2/past-elections.ts:439-453` (read)                                         | Drawn (±2 points of vote share)  | Past-election records                      |
| 44  | Past election vote totals                                                 | same                                                                         | `core2/past-elections.ts:455` (read)                                             | Copied                           | Past-election records                      |
| 45  | Party counts in legislatures, Congress and statewide offices              | `data/research/offices/legislature-party-counts-2026.json`                   | `core2/modules/officials.ts:138, 179, 321` (read)                                | Copied                           | The legislature's makeup                   |
| 46  | "Elected with 60% of the vote" for every sitting holder of an office kind | `core2/data/offices/tenure.json:40-66`                                       | `core2/modules/offices.ts:818-841`; screen `bench/government.ts:210-216` (read)  | Copied (one estimate per office) | The Government sheet                       |
| 47  | 2024 state results and the starting swing (old core)                      | `core2/data/elections/electoral-calibration.generated.json`                  | `simulation/world-setup/political-start.ts:217` (residual 0; read)               | Calibration                      | No reader in play found outside tests      |
| 48  | National poll support for policy questions                                | `data/research/campaigns/policy-support-2026.json`                           | `core2/campaign-views.ts:309` (partly)                                           | Copied                           | Ballot measure and recall support          |
| 49  | Issue views against CES 2024 by state and age                             | `core2/data/views/ces-2024-views.json`                                       | `core2/opening-profile.ts:65` (read)                                             | Drawn                            | Per-person draw                            |
| 50  | Federal, state and local budgets by line, per resident                    | `data/research/money/public-budget-bases.json`, `federal-budget-fy2025.json` | `core2/modules/budgets.ts:487-560` (read)                                        | Copied                           | Budget screens and ordinance stakes        |
| 51  | Federal debt holders                                                      | `core2/data/budgets/federal-debt.json`                                       | `core2/budgets-treasury.ts:70, 113-129` (partly)                                 | Copied                           | Budget lines (partly)                      |
| 52  | Treasury payees, federal spending by state, service charges               | `core2/data/budgets/*.json`                                                  | `core2/budgets-treasury.ts:41-132`, `budget-stakes.ts:7` (partly)                | Copied                           | Budget lines and stakes (partly)           |

### Law (stays) and calibration only

| #   | Statistic                                                                                                              | Class       | Note                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| 53  | Minimum wage, income-tax and property-tax rates, eviction and foreclosure steps                                        | Law         | The property-tax rate is a question for the CTO (above).                                                                  |
| 54  | Filing rules, deadlines, terms, limits, official pay, contribution limits, sentencing, poverty thresholds, school days | Law         | Stays. Real statute citations and old effective dates on the Issues sheet are item `play-issues-real-statutes-and-dates`. |
| 55  | Turnover and network checks                                                                                            | Calibration | Test-time checks only.                                                                                                    |

## Why it happened

- The macro engine was built to open on "the last complete month before the start" from agency figures (`core2/macro-model.ts:106`, measured by reading). No seed reaches it; only a custom world's chosen figures change the opening (`core2/modules/macro.ts:322`, measured).
- The outcome web sets each of its 55 measures to the published state median once, at the opening; the code's own comment reads "Never zero, never drawn" (`core2/outcome-web-model.ts:243`, measured by reading).
- Three opening tables set counts as people times the published rate, rounded, which is the same in every world (`core2/opening-employment.ts:76`, `opening-private-tuition.ts:107`, `past-business.ts:87`; measured by reading).

## What happens next

One pull request per source table, each with a played-world proof by place, seed and record id:

1. National economy (rows 1 and 2): item `core-macro-opening-month-per-world`, in progress. In that change the regional layer's unemployment (row 3) moves by the world's national offset; the rest of row 3 is item 2.
2. Regional economy and jobs (rows 3, 4, 10 to 13): `realistic-regional-and-jobs-per-world`.
3. Housing (rows 5 to 9 and the property-tax question): `realistic-housing-per-world`.
4. Money and population (rows 14 to 18, 28): `realistic-money-and-population-per-world`.
5. Business, press and ads (rows 21 to 24, 26, 27): `realistic-business-per-world`.
6. Outcome measures and crime (rows 39, 40): `realistic-outcome-bases-per-world`.
7. Health, renewal and time use (rows 32 to 36; rows 33 to 35 are base rates): `realistic-base-rates-per-world`.
8. Elections and officials (rows 42, 44 to 48): `realistic-elections-per-world`.
9. Budgets (rows 50 to 52): `realistic-budgets-per-world`.
10. Schools (row 37): `realistic-school-names-generated`.
11. Disasters (row 41): `world-disasters-from-conditions` (open) gets this report as evidence.
12. The guard: `realistic-not-real-guard`, a test that builds two worlds from two seeds and fails when any audited statistic is equal in both or equal to its published value, added to the local gate.

## Method

Two read-only reviewers each audited half the code (the new core and its data; the old core, the director, the English engine and the screens). Their tables were merged here and spot-checked for rows 1, 39, 46 and 47 by reading the code. Rows marked "partly" have a reader and file found but were not followed to the screen.
