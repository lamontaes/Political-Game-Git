# Town population has research anchors; many household, work, and rent decisions still use assumptions

Population openings use comparable Census distributions, but household composition, employment choices, local elections, and rent decisions still contain unsupported assumptions. This ledger identifies the numbers and the systems they affect. Research cited in source is distinguished from independently verified evidence. It changes no rates, laws, people, or saved history. The next decisions are research and ownership routing, followed by explicit approval of any calibration change.

## Scope and source states

This is the CTO's September 30 bedrock inventory, due at 5 a.m. Eastern. It covers Team 3's Census readers, town residents/employment/rent/elections, money contract, and preserved fairness/labor/election drafts. Shared press and outcome files are inspected only at the population adapter boundaries. Read-only inspection acquires no source ownership.

| Source state                      | Exact source head                          | Meaning                                                                                                                                               |
| --------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Census and existing town source   | `cdffc19020cb17c29cd556ea33697299475d2bd5` | Published Census candidate; review/check receipts do not establish merged runtime acceptance.                                                         |
| Money contract                    | `1e1651136c316661a42cbd5d83c9a614eab19823` | Held money documentation head; earlier tested source was `a78035ed00fce63b8560229adac27392455b4f48`. This inventory is not a new test of that source. |
| Fairness, labor, elections drafts | `48631f388627f5697db79a3719b240f5d10bc457` | Preserved local handoff, NOT READY. Employer-specific fairness model remains absent. Draft formulas are not claimed as production behavior.           |

The appendix contains every TypeScript numeric literal found in the 15 scoped files or expressly named shared-file functions/constants: 1,456 sites in 236 symbol groups. Exact expressions preserve values, units, conditions, and repeated uses. Dates encoded as strings and the `Infinity` tenure endpoint are listed separately below. Zero-literal files remain in the scope list.

Generated observation tables are source data, rather than hard-coded model coefficients, and are excluded from the literal sweep. Imported household-mix, BLS, HUD, Census, Social Security, and childcare tables retain their own provenance obligations. This ledger does not certify every imported row. Team 1 owns legal research; Team 5 owns remaining press calibration; outcome coefficients belong to their owner. Test fixture numbers are excluded.

**Evidence labels:** R = numeric research basis identified in pinned source, not freshly verified against the publication; P = explicit placeholder or unsupported authored choice; L = legal/HUD rule claimed by source, with place/vintage applicability still requiring exact-law review; C = calendar, unit, conservation, indexing, or bounded-execution convention. Mixed groups remain mixed. A citation for a subject does not validate nearby coefficients. Unverified entries receive no inferred research status.

## Behavior-shaping numbers and their effects

Locations below use the pinned heads above. The appendix supplies every literal expression and line, including values omitted from this summary for readability.

| Number / rule                                                                                                                                                                                  | Location                                              | Evidence and limitation                                                                                                                                                                        | Downstream effect                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Median 0.5; seeded quantile 0.25 + draw × 0.5                                                                                                                                                  | represented-population.ts:386–388                     | R for observed comparable distributions; P for selecting only their central half. These are not empirical uncertainty bounds.                                                                  | Generates opening demographics and population; propagates to roster, budgets, elections, press coverage, and outcome weights.                         |
| Seven-character place key; at least two comparable observations; log10 population order with floor 1                                                                                           | represented-population.ts:342–359                     | C key format; P comparability/coverage selection policy. Broadens peers rather than using one place as an observation.                                                                         | Controls which empirical distributions fill missing fields, especially territories and non-GEOID places.                                              |
| Ten-year interval; vintages 2020, 2024, 2025                                                                                                                                                   | represented-population.ts:141–246                     | R source vintages; C interval. Ta'u MCD and combined Chalan Kanoa remain broader anchors, not village observations.                                                                            | Establishes reference growth and coverage; does not invent village counts.                                                                            |
| 365.25 days/year, 86,400,000 milliseconds/day, 100 percentage units                                                                                                                            | represented-population.ts:768–873                     | C time/percentage conversion and count bounds.                                                                                                                                                 | Projects elapsed growth and reconciles recorded changes without double-counting opening changes.                                                      |
| Unknown town fallback 1,000 residents                                                                                                                                                          | town-residents.ts:102                                 | P; no use inside this pinned file beyond its export declaration. External callers are not certified absent.                                                                                    | Legacy exported fallback must not become a fabricated canonical observation. World-aware roster now uses the population contract.                     |
| Household member means 1, 2, 4, 3, 2                                                                                                                                                           | town-residents.ts:113–118                             | P alone/couple/couple-with-children/parent-with-children/housemates composition.                                                                                                               | Converts household shape mix to estimated household counts for the legacy reader.                                                                     |
| Employed share of ages 16+ = 0.597                                                                                                                                                             | town-residents.ts:139                                 | R source cites BLS CPS 2025 Table 57; national aggregate, not an individual employment probability.                                                                                            | Roster employment reference; does not establish any actor's job.                                                                                      |
| Congregation every 1,500 residents; max 4; household share 0.45; 8 households written; retail staff 4, school staff 3; 6 neighbor households                                                   | town-residents.ts:148–166                             | P explicit authored limits.                                                                                                                                                                    | Sets named organizations, staff, neighbors, congregation ties and available social encounters.                                                        |
| Household skeleton adult/child age ranges: 20–88, 19–40, 22–85, 26–52, partner age head ±6 bounded 19–90, child count integer(1,4), youngest max(0,head−45), child upper bound min(17,head−20) | town-residents.ts:289–308                             | P household composition sampling. See exact expressions for which shape uses each range.                                                                                                       | Shapes biographies, parent/child relations, schooling, work eligibility and materialized ages.                                                        |
| Same-sex couple share 0.015                                                                                                                                                                    | town-residents.ts:366                                 | P unsupported calibration; nearby ACS discussion does not establish this chosen value.                                                                                                         | Changes generated partnership composition and related kinship.                                                                                        |
| Couple marriage dated from younger partner’s age 24; roster lookup at most 64 attempts                                                                                                         | town-residents.ts:517–521,560–572                     | P universal marriage and start-age choice; C bounded lookup policy.                                                                                                                            | Partnership chronology and which generated residents can be located/materialized.                                                                     |
| Work demand 20–40 hours/week; working ages 18–66; school ages 5–10, 11–13, 14–17; sample at most 2,000 households                                                                              | town-residents.ts:598,608,841–844,905                 | P role/age policies and sample limit. School bands are not exact place-specific legal entitlements.                                                                                            | Employment/school role attachment and summary approximation.                                                                                          |
| Working ages 18–66; lead age 28; occupation-specific ages 21–32; workplace/sector weights 1–6                                                                                                  | town-employment.ts:73–74,403–865,964–1027             | P authored workplace templates; imported industry anchors do not validate individual role weights.                                                                                             | Chooses employer mix, available roles, supervisory jobs and age eligibility.                                                                          |
| Full-time 35–45, part-time 16–29 hours/week                                                                                                                                                    | town-employment.ts:872–873                            | P hour ranges.                                                                                                                                                                                 | Pay amounts, schedules, time demand and eligibility interactions.                                                                                     |
| Age-band median tenure: <20:0.8, <25:1.5, <35:3.0, <45:4.7, <55:7.0, <65:9.6, otherwise 9.9 years                                                                                              | town-employment.ts:884–890                            | R source cites BLS tenure release September 24, 2026; `Infinity` closes last band. Stepwise medians are not a researched individual distribution.                                              | Opening tenure, hiring/pay percentile and employment biographies.                                                                                     |
| Part-time shares 0.08–0.50 by industry; default 0.08                                                                                                                                           | town-employment.ts:908–924                            | P explicit game assumption; complete industry assignments in appendix.                                                                                                                         | Staffing quotas choose part-time hours/pay. Ages 65+, enrolled residents, or parents of children under 6 can also force part-time.                    |
| Student not working 0.60 (age <=24); retirement 0.35 (age >=62); parent at home 0.15; looking for work 0.04                                                                                    | town-employment.ts:1089–1112                          | P actor rolls, not researched decision models.                                                                                                                                                 | Employment status, income, job search and time available to families. Preserved continuous labor draft does not certify replacement.                  |
| Filing lead 28 days, primary lead 56, candidate age 21                                                                                                                                         | local-elections.ts:138–140                            | P authored local profile; legal values require exact place rules.                                                                                                                              | Candidate access and campaign calendar.                                                                                                               |
| Challenger count weights [0.20,0.45,0.20,0.10,0.05]; open-seat [0,0.15,0.45,0.25,0.15]                                                                                                         | local-elections.ts:142–144                            | P local candidate competition distributions.                                                                                                                                                   | Number of opponents and winner opportunities.                                                                                                         |
| Incumbent edge 1.35; turnout uniform 0.12–0.32; adult share 0.75                                                                                                                               | local-elections.ts:146–150                            | P explicit profile, not observed municipal turnout.                                                                                                                                            | Converts World-aware town population into ballots and favors incumbents.                                                                              |
| Candidate ballot floor 20; candidate base 0.6 + draw × 0.8; positive vote floor 1; tie increment 1                                                                                             | local-elections.ts countVotes                         | P ballot floor and preference draw; C tie arithmetic, with behavioral winner effect. Exact locations below.                                                                                    | Vote totals, contest winners and normalization. A corrected population denominator does not validate vote choice.                                     |
| Seasonal months 3–11; cadence 1,2,4 years; fallback November first Tuesday / parity; redistricting 10 years                                                                                    | local-elections.ts SEASONS/CADENCE/calendar functions | C calendar operations mixed with P fallback cycles and L conventional redistricting claim. Exact municipal law must supersede authored defaults.                                               | Election dates, seat staggering and boundary timing.                                                                                                  |
| Landlord shares by six home kinds; bedroom shares over efficiency through four bedrooms                                                                                                        | town-rent.ts:185–206                                  | P explicitly remembered housing mix, not verified RHFS observations. Full arrays in appendix.                                                                                                  | Ownership/legal exposure, bedroom availability and household rent.                                                                                    |
| Lognormal rent spread: home 0.25, world 0.05                                                                                                                                                   | town-rent.ts:215–216                                  | P unsupported spread.                                                                                                                                                                          | Persistent rent differences across homes and worlds; burden and eviction exposure.                                                                    |
| Public housing income rent 0.30; minimum 5,000 cents/month; flat-rent FMR ratio 0.80                                                                                                           | town-rent.ts:220–224                                  | L source claims Brooke rule, 24 CFR 5.630 and statutory FMR floor. Authority discretion and applicability require verification; 50-dollar maximum discretion is not every authority's minimum. | Public-housing lease amounts and income/rent coupling.                                                                                                |
| Affordable income rent 0.30; 60/50 income-limit ratio 1.2; HUD family factors [0.7,0.8,0.9,1,1.08,1.16,1.24,1.32], +0.08 above eight members                                                   | town-rent.ts:226–231,479–483                          | L HUD convention claimed in source; vintage/application not freshly checked.                                                                                                                   | Affordable rents and size-adjusted eligibility.                                                                                                       |
| Inclusionary set-aside 0.15                                                                                                                                                                    | town-rent.ts:241                                      | P authored proxy for varying local rules, not exact law per place.                                                                                                                             | Which homes are reserved and which households can obtain them.                                                                                        |
| Stabilized rent cap: inflation +0.05, capped at 0.10                                                                                                                                           | town-rent.ts:249                                      | P generalized California-law proxy; statute citation does not establish law in every place.                                                                                                    | Renewal rent and household cash; Team 1 exact-law dependency.                                                                                         |
| Covered moves ratio 0.80; citywide rent rise 0.051; starts after 365 days                                                                                                                      | town-rent.ts:259,275–276                              | R source cites Diamond/McQuade/Qian 2019 San Francisco effects; P 365-day implementation lag and transport to other places. Neither establishes actor probability.                             | Mobility and market rents after stabilization; extrapolation remains unresolved.                                                                      |
| Bedroom need: two people/bedroom; under-sized weight ×0.25, over need+1 ×0.50; fallback max four bedrooms                                                                                      | town-rent.ts:542–556                                  | P weighting/maximum; HUD rule-of-thumb claim for occupancy is not a universal local occupancy law.                                                                                             | Household size changes sampled home size and FMR rent.                                                                                                |
| Affordable household size 1.5 people/bedroom; candidate landlord minimum age 30; leaseholder minimum age 18                                                                                    | town-rent.ts:504–509,941,1202                         | P/inferred authored bounds; exact expressions below retain context.                                                                                                                            | Affordable rent size adjustment, local landlord eligibility and lease eligibility.                                                                    |
| Arrears filing at 2 months, conciliatory 3; settlement <=3; lawyer retention <=4; plan 6 months; pay limit 0.50; judge relief <=2; quiet period 3 months                                       | town-rent.ts:336–344                                  | P explicit eviction timings and affordability cutoffs.                                                                                                                                         | Filing, settlement, payment plan and court response. No numeric citation validates these actor rules.                                                 |
| No-counsel eviction ratio 0.42; counsel ratio 0.16                                                                                                                                             | town-rent.ts:357–358                                  | R source describes national Eviction Lab totals and New York counsel reports. Different contexts, not an identified universal causal contrast.                                                 | Court outcome decision inputs; cannot assume every place/person gets those probabilities.                                                             |
| Rent-burden threshold 0.30                                                                                                                                                                     | town-rent.ts:2722–2723                                | C conventional reporting classification, not proof of a legal rent ceiling.                                                                                                                    | Snapshot classification of households under rent strain.                                                                                              |
| Daily income annualization 260; weekly 52, biweekly 26, semimonthly 24, monthly 12, quarterly 4, annual 1                                                                                      | resource-income.ts:22–28                              | C periodic conventions; P 260 weekday assumption for daily cash.                                                                                                                               | Common income read affects rent, benefits, taxes and budgeting only where callers use it. Existing separate income readers are not silently replaced. |
| Received income 365.25/(12 × elapsed days); irregular trailing 30-day window                                                                                                                   | resource-income.ts:99–141                             | C conversions; P 30-day estimator/window.                                                                                                                                                      | Cash-based monthly income can diverge from promised pay and respond to missed/irregular transfers.                                                    |
| Paid minutes = weekly hours ×60 ×workdays /5; annual/weekly and cents conversions                                                                                                              | town-compensation.ts:179–203,416–435                  | C conversions mixed with P five equal workdays allocation.                                                                                                                                     | Recorded illness, custody and voter-ID trips reduce pay; exact leave rules remain imported.                                                           |
| Annual full-time hours 2,080; catch-up at most 400 days                                                                                                                                        | town-pay.ts:119–121                                   | C 40×52 convention and bounded execution, not every worker's observed year.                                                                                                                    | Hourly/annual conversion and long-gap payment processing.                                                                                             |
| Wage percentile 25 +50×min(1,tenure/20) +(draw×2−1)×15, clipped 10–90                                                                                                                          | town-pay.ts:216–217                                   | P tenure slope and random percentile placement. R only for published BLS wage percentile anchors 10/25/50/75/90.                                                                               | Seeded pay within researched wage tables; unsupported person-specific slope.                                                                          |
| Employer size bands 10,20,50,100,250,500,1,000                                                                                                                                                 | town-pay.ts:362–368                                   | R source-data category boundaries, not employer growth coefficients.                                                                                                                           | Chooses the researched pay-frequency distribution's size category.                                                                                    |
| Friday weekday 5; week 7 days; biweekly parity 2; semimonthly day 15/16 and month end                                                                                                          | town-pay.ts:431–463                                   | C arithmetic; P common authored employer schedule. Epoch Friday January 7, 2000 fixes parity.                                                                                                  | Payment timing, cash on hand and rent arrears. Frequency research does not establish an individual employer's payday.                                 |
| Recruitment 7–28 days; reply 3–7                                                                                                                                                               | job-market.ts:100–101                                 | P owner-approved ranges without an empirical distribution citation.                                                                                                                            | Vacancy/applicant calendars and time without income.                                                                                                  |
| Offer spread 0.08; decision 2–7 days; start lead 1–7; grace 2; follow-up 3–7; second-full-time cutoff 30 hours/week                                                                            | job-market.ts:115–134                                 | P explicit unresearched job-market placeholders.                                                                                                                                               | Re-listing wages, applicant decisions, start failure and multiple-job access.                                                                         |
| Monthly separations 0.033; government staff ratio 6,789,100 /340,110,988; initial employer age 91 days                                                                                         | job-market.ts:153–159                                 | R JOLTS national annual average and CES/Census national ratio; P initial-hiring window and transport to individual towns/jobs.                                                                 | Vacancies, government staffing and early business recruitment.                                                                                        |
| Generic public office clerk 2,164 cents/hour; 37–40 hours/week                                                                                                                                 | job-market.ts:173–174                                 | R national occupation wage cited; P universal public-employer role and hours, not local salary law.                                                                                            | Generic government vacancies and pay offers.                                                                                                          |
| Minimum applicant age 16; annual offer rounding increment 50,000 minor units; adult start threshold 19/18; fallback 35–45 or 40 hours/week                                                     | job-market.ts:181,788,1602–1661                       | L general federal minimum claim with exceptions; P wage rounding/hours and actor routing. Preserve minor-unit meaning: 50,000 cents is 500 dollars, not 50,000 dollars.                        | Job eligibility, rounded offers and first-job pay.                                                                                                    |
| Catch-up at most 520 weeks; Monday January 3, 2000 epoch                                                                                                                                       | job-market.ts:193–195                                 | C execution/calendar policy.                                                                                                                                                                   | Prevents unlimited listing/pay backfill; fixes weekly schedule parity.                                                                                |
| Fairness universal 2.6% pay cut removed; no employer-specific replacement coefficient                                                                                                          | fairness-pay-law.ts at held handoff                   | No numeric literals in file. WIP preserves supplied rates and legal floors; missing researched employer model remains a blocker.                                                               | Removes unsupported automatic wage haircut; does not claim complete fairness response.                                                                |
| Draft labor: hours 40; remaining-years 5+20×sigmoid((80−age)/8); retirement center 65, physical adjustment 2, health adjustment 4, scale 3, commitment 0.20                                    | labor-decision.ts:37–90                               | P held authoring formulas, not researched calibration.                                                                                                                                         | If approved/wired, would change work/retirement effort by age, health, finances and commitments. No current replacement claimed.                      |
| Draft exertion 0.8/0.6/0.15; limited health 0.6; reliability fallback 0.5 mapped (value+2)/4; values 1/0.75/0.5/0.25                                                                           | labor-decision.ts:234–286                             | P held trait and occupation mappings.                                                                                                                                                          | Planned labor effort; no empirical response/coverage evidence.                                                                                        |
| Draft school fallback 36 hours/week; childcare 98×exp(−age/3), preschool blend exp(−age/2); child cutoff 5; adult split 18                                                                     | labor-decision.ts:290–334                             | P held demand/time assumptions.                                                                                                                                                                | Parent labor supply and childcare affordability if later approved.                                                                                    |
| Draft career factor 1−exp(−years/10); career divisor 35; bend points 128,600/774,900 cents with basis-point factors 9,000/3,200/1,500                                                          | labor-decision.ts:342–348                             | P career forecast; L Social Security planning constants claimed, unverified vintage/eligibility. A forecast is not an entitlement record.                                                      | Planned retirement cash and work incentive; actual credited benefits remain separate.                                                                 |
| Draft planning conversions 12 months/year,52 weeks/year,40 weekly hours, divisor80                                                                                                             | labor-decision.ts:358–380                             | C conversions mixed with P forecast scaling/divisor. Imported SCF and childcare anchors require broad coverage and seeded opening variation; fixed fallback is not a territory observation.    | Labor planning financial coverage; no accepted actor calibration.                                                                                     |
| Draft turnout year ratios 0.91/0.72/0.39; competitiveness 1−2×abs(share−0.5); engagement 1+0.05×competitiveness                                                                                | election-turnout.ts:7–37                              | P held calibration; numeric research basis not verified.                                                                                                                                       | Would rescale turnout by presidential/midterm/local cycle and race competitiveness.                                                                   |
| Draft automatic-registration turnout delta 0.015; photo-ID delta 0                                                                                                                             | election-turnout.ts:70–71                             | R source points to existing outcome research for registration; transport and numeric provenance not freshly verified. Zero ID coefficient does not establish zero harm in every context.       | Planned election-law turnout change; starting-law subtraction avoids double-counting baseline.                                                        |
| Daily press threshold/rank 1,000; weekly/daily profile indices 1/2                                                                                                                             | press/outlets.ts:384–386                              | P existing press threshold; C profile slots. Team 5 owns calibration.                                                                                                                          | World-aware counts select existing coverage/profile without changing threshold, owners, names or saved outlets.                                       |
| Outcome share bounds 0/1, county subtraction and overshoot normalization                                                                                                                       | place-outcome-store.ts:243–315                        | C accounting invariants; proven empty sets distinguished from unsupported identities.                                                                                                          | Allocates existing outcomes using canonical World population. Missing coverage throws rather than becoming zero share. Coefficients remain unchanged. |

Additional calendar policies: `local-elections.ts:739` schedules the next yearly government review with a seeded month from 1–12 and day from 1–28. This is P authored timing, not a researched review calendar.

`local-elections.ts:1372` gives an appointed vacancy a 365-day term; exact municipal term law remains unresolved.

`job-market.ts:799` rounds hourly offers in five-cent increments, another P wage-grid choice.

The completed-shift delegation in `life-paths2.ts:1095` adds no numeric coefficient; it routes recorded earned terms to the common compensation writer. Budget raw-classification calls add no numeric calibration; fiscal constants remain with the budget owner.

## Connections and unresolved research

Measured source connections: canonical population reaches town roster, public staffing, local elections, press coverage and outcome allocations. Changed seating records an opening population layer within the existing deferred block. Existing outlet records return before profile writes. These facts describe source paths; they do not prove latest-main runtime acceptance.

The rent chain still separates promised/received income readers. Missed compensation can affect cash without every rent/benefit reader consuming the common received-income contract. Housing supply, landlord mix, bedroom mix, rent spread, eviction timing and legal applicability remain separate gaps. A researched average rent does not validate those mechanisms. The employment chain mixes researched national totals with authored per-person rolls and role templates. The held labor draft is not a researched replacement.

Route exact-law proxies and candidate/lease/applicant age rules to Team 1. Route rent distribution and eviction transportability questions through CTO/Team 9 before a homes assignment. Route press thresholds to Team 5 and retain existing outcome coefficients with their owner. Team 3 retains the employer-specific fairness research gap; no replacement wage penalty is invented. Five released law population calls still require a concrete composition baseline containing the corrected Census contract and preserving authoredSkeleton/jobRound.

## Verification and next action

The AST sweep completed at the named immutable heads. Documentation coverage checks verify 15 scope entries, 236 symbol groups and all 1,456 site references. Numeric literals include arithmetic/indexing mechanics so no unsupported policy number is hidden by a heuristic filter. Infinity and string-date conventions are explicit above. Source citations are not freshly validated research. Imported datasets and external caller completeness are not certified.

Prior source receipts remain: population/outcome 20/20, budget 27/27, 12-root strict types with zero diagnostics, scoped lint/format/zero-dice/release checks. Those were not rerun for this inventory. Full simulations, browser acceptance, new calibration tests, and independent report reviewer are NOT RUN. No source calibration changed and no merge is claimed. The report's mechanical/format checks are recorded in the publishing receipt.

Next bounded action is CTO review of these gaps and final outcome adapter review. Team 5 approved the exact Census press hunk at the named Census head. Inventory is reviewable; research applicability and current-main runtime acceptance remain separate open work.

## Complete source literal appendix

Each subsection pins a file and symbol. Each line lists every literal site's column, preserving duplicates, followed by the exact source expression.

**Default evidence is unverified unless the behavior table above identifies R/L/C.** No research status is inferred for an unclassified literal.

Function and assignment names identify the immediate downstream operation; the table above traces the principal system effects. Numeric indices and rounding bounds are retained alongside behavioral parameters.

### src/simulation/nationwide-world/represented-population.ts — referencePopulationIsEmpty

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------- |
| [line 120](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L120) | -1 @ 33, 0 @ 40         | <code>if (annual) return annual.at(-1) === 0;</code>           |
| [line 122](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L122) | 0 @ 49                  | <code>const enumerated = decennialPopulation(key)?.[0];</code> |
| [line 123](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L123) | 0 @ 21, 0 @ 41          | <code>return survey === 0 && enumerated === 0;</code>          |

### src/simulation/nationwide-world/represented-population.ts — populationReference

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column                    | Exact expression                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [line 141](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L141) | -1 @ 18                                    | <code>history?.at(-1) ??</code>                                                           |
| [line 148](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L148) | 0 @ 43                                     | <code>!(population !== null && population &gt; 0) &&</code>                               |
| [line 149](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L149) | 0 @ 19, 0 @ 25, 0 @ 30                     | <code>(enumerated?.[0] ?? 0) &gt; 0;</code>                                               |
| [line 150](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L150) | 0 @ 46                                     | <code>if (useDecennial) population = enumerated![0]!;</code>                              |
| [line 157](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L157) | 0 @ 32, 0 @ 37                             | <code>(row?.counts.population ?? 0) &gt; 0</code>                                         |
| [line 159](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L159) | 0 @ 38, 0 @ 43                             | <code>: (islandCounts?.population ?? 0) &gt; 0</code>                                     |
| [line 164](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L164) | 0 @ 34, 0 @ 39                             | <code>(row?.counts.population ?? 0) &gt; 0</code>                                         |
| [line 196](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L196) | 1 @ 14                                     | <code>.slice(1)</code>                                                                    |
| [line 198](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L198) | 0 @ 23, 1 @ 50                             | <code>history[i]! &gt; 0 ? [value / history[i]! - 1] : [],</code>                         |
| [line 202](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L202) | 0 @ 27, 0 @ 32                             | <code>(island.population ?? 0) &gt; 0 &&</code>                                           |
| [line 203](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L203) | 0 @ 35, 0 @ 40                             | <code>(island.previousPopulation ?? 0) &gt; 0</code>                                      |
| [line 206](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L206) | 1 @ 65, 10 @ 69, 1 @ 75                    | <code>Math.pow(island.population! / island.previousPopulation!, 1 / 10) - 1,</code>       |
| [line 209](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L209) | 0 @ 32, 0 @ 37                             | <code>(row?.counts.population ?? 0) &gt; 0 &&</code>                                      |
| [line 210](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L210) | 0 @ 36, 0 @ 41                             | <code>(row?.counts.population2023 ?? 0) &gt; 0</code>                                     |
| [line 212](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L212) | 1 @ 78                                     | <code>annualChanges = [row!.counts.population! / row!.counts.population2023! - 1];</code> |
| [line 246](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L246) | 2020 @ 29, 2025 @ 46, 2020 @ 62, 2024 @ 69 | <code>vintage: useDecennial ? 2020 : history ? 2025 : island ? 2020 : 2024,</code>        |

### src/simulation/nationwide-world/represented-population.ts — quantile

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------- |
| [line 282](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L282) | 0 @ 30                  | <code>if (!values.length) return 0;</code>                    |
| [line 283](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L283) | 1 @ 37                  | <code>const position = (values.length - 1) * fraction;</code> |
| [line 287](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L287) | 1 @ 23                  | <code>values[lower]! * (1 - (position - lower)) +</code>      |

### src/simulation/nationwide-world/represented-population.ts — observedChanges

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------- |
| [line 295](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L295) | 1 @ 14                  | <code>.slice(1)</code>                                                    |
| [line 297](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L297) | 0 @ 27, 1 @ 58          | <code>history[index]! &gt; 0 ? [value / history[index]! - 1] : [],</code> |
| [line 301](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L301) | 1 @ 52                  | <code>? [counts.population / counts.population2023 - 1]</code>            |

### src/simulation/nationwide-world/represented-population.ts — fieldDistribution

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------- |
| [line 326](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L326) | 0 @ 66                  | <code>peer.counts[field] !== null && peer.counts.population! &gt; 0</code> |

### src/simulation/nationwide-world/represented-population.ts — comparableDemographics

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------- |
| [line 342](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L342) | 7 @ 51                  | <code>const length = /^\d+$/.test(key) ? key.length : 7;</code>                              |
| [line 346](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L346) | 1 @ 40                  | <code>: Math.floor(Math.log10(Math.max(1, population)));</code>                              |
| [line 351](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L351) | 0 @ 71, 0 @ 76          | <code>(row) =&gt; row.geoid.length === length && (row.counts.population ?? 0) &gt; 0,</code> |
| [line 359](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L359) | 1 @ 37                  | <code>const peers = comparable.length &gt; 1 ? comparable : sameType;</code>                 |

### src/simulation/nationwide-world/represented-population.ts — generateOpening

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column       | Exact expression                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------- |
| [line 386](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L386) | 0.5 @ 70                      | <code>const center = quantile(localGrowth.length ? localGrowth : growth, 0.5);</code>     |
| [line 388](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L388) | 0.25 @ 33, 0.5 @ 53, 0.5 @ 77 | <code>? center + quantile(growth, 0.25 + rng.next() * 0.5) - quantile(growth, 0.5)</code> |
| [line 398](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L398) | 0.5 @ 7                       | <code>0.5,</code>                                                                         |
| [line 401](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L401) | 0 @ 7                         | <code>? 0</code>                                                                          |
| [line 402](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L402) | 1 @ 16, 1 @ 50                | <code>: Math.max(1, Math.round(populationAnchor * (1 + annualChange - center)));</code>   |
| [line 407](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L407) | 0 @ 24, 0 @ 34                | <code>if (population === 0) return 0;</code>                                              |
| [line 415](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L415) | 0.5 @ 37                      | <code>const median = quantile(ratios, 0.5);</code>                                        |
| [line 416](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L416) | 0.25 @ 35, 0.5 @ 55           | <code>const draw = quantile(ratios, 0.25 + rng.next() * 0.5);</code>                      |
| [line 421](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L421) | 0 @ 55, 1 @ 75                | <code>: (anchor / reference.population) * (median &gt; 0 ? draw / median : 1);</code>     |
| [line 422](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L422) | 0 @ 21                        | <code>return Math.max(0, Math.min(population, Math.round(population * ratio)));</code>    |
| [line 441](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L441) | 0 @ 41                        | <code>(total, value) =&gt; total + (value ?? 0),</code>                                   |
| [line 442](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L442) | 0 @ 5                         | <code>0,</code>                                                                           |
| [line 444](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L444) | 0 @ 43                        | <code>if (households !== null && totalKinds &gt; 0) {</code>                              |
| [line 449](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L449) | 1 @ 35                        | <code>index === fields.length - 1</code>                                                  |
| [line 453](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L453) | 0 @ 57                        | <code>Math.round((households * (kinds[field] ?? 0)) / totalKinds),</code>                 |
| [line 473](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L473) | 1 @ 49                        | <code>return [field, Math.round(population / (1 + annualChange))];</code>                 |
| [line 480](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L480) | 0.5 @ 45                      | <code>const median = quantile(distribution, 0.5);</code>                                  |
| [line 483](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L483) | 0.25 @ 9, 0.5 @ 52            | <code>0.25 + demographicRng.fork(field).next() * 0.5,</code>                              |
| [line 488](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L488) | 0 @ 47, 1 @ 67                | <code>? (local / sourceTotal) * (median &gt; 0 ? draw / median : 1)</code>                |
| [line 490](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L490) | 0 @ 31                        | <code>return [field, Math.max(0, Math.min(population, population * ratio))];</code>       |
| [line 499](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L499) | 0 @ 20                        | <code>if (totalKinds &gt; 0)</code>                                                       |
| [line 506](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L506) | 0 @ 17, 0 @ 64                | <code>if (total &gt; 0 && fields.every((field) =&gt; values[field] === 0)) {</code>       |
| [line 510](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L510) | 0.5 @ 11                      | <code>0.5,</code>                                                                         |

### src/simulation/nationwide-world/represented-population.ts — reconcileCounts

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------- |
| [line 569](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L569) | 0 @ 70                  | <code>const sum = fields.reduce((value, field) =&gt; value + counts[field], 0);</code>          |
| [line 577](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L577) | 1 @ 33                  | <code>index === fields.length - 1</code>                                                        |
| [line 579](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L579) | 1 @ 76                  | <code>: Math.min(remaining, Math.round((total * counts[field]) / (sum &#124;&#124; 1)));</code> |

### src/simulation/nationwide-world/represented-population.ts — openingPopulation

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------- |
| [line 593](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L593) | 0 @ 70                  | <code>if (saved.demographics && saved.reference.unknownFields.length === 0)</code> |

### src/simulation/nationwide-world/represented-population.ts — censusDemographics

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column | Exact expression  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------- |
| [line 655](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L655) | 0 @ 7                   | <code>: 0;</code> |

### src/simulation/nationwide-world/represented-population.ts — representedPopulation

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                          | Literal value at column   | Exact expression                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------- |
| [line 768](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L768) | 365.25 @ 6, 86400000 @ 15 | <code>(365.25 * 86400000);</code>                                                         |
| [line 771](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L771) | 1 @ 41, 1 @ 54            | <code>const scale = annualChange === null ? 1 : Math.pow(1 + annualChange, years);</code> |
| [line 800](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L800) | 100 @ 6                   | <code>(100 * (reference.laborForce - reference.employed)) /</code>                        |
| [line 801](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L801) | 1 @ 14                    | <code>Math.max(1, reference.laborForce);</code>                                           |
| [line 803](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L803) | 0 @ 5                     | <code>0,</code>                                                                           |
| [line 805](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L805) | 100 @ 7                   | <code>100,</code>                                                                         |
| [line 824](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L824) | 365.25 @ 6, 86400000 @ 15 | <code>(365.25 * 86400000);</code>                                                         |
| [line 826](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L826) | 1 @ 29, 1 @ 42            | <code>annualChange === null ? 1 : Math.pow(1 + annualChange, writtenYears);</code>        |
| [line 836](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L836) | 0 @ 7                     | <code>: 0;</code>                                                                         |
| [line 838](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L838) | 0 @ 5                     | <code>0,</code>                                                                           |
| [line 841](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L841) | 1 @ 32, 100 @ 43          | <code>Math.round(laborForce * (1 - rate / 100) + employmentResidual),</code>              |
| [line 848](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L848) | 0 @ 7                     | <code>: 0;</code>                                                                         |
| [line 873](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/represented-population.ts#L873) | 100 @ 24, 1 @ 66          | <code>unemploymentRate: (100 * (laborForce - employed)) / Math.max(1, laborForce),</code> |

### src/simulation/nationwide-world/place-population.ts — load

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                  | Literal value at column | Exact expression                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| [line 26](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/place-population.ts#L26) | 0 @ 24, 1 @ 61          | <code>map.set(pair.slice(0, colon), Number(pair.slice(colon + 1)));</code> |

### src/simulation/nationwide-world/place-population.ts — populationAtRank

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                  | Literal value at column | Exact expression                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------- |
| [line 62](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/place-population.ts#L62) | 1 @ 24                  | <code>return ranked[rank - 1] ?? null;</code> |

### src/simulation/nationwide-world/place-population.ts — placeReferencePopulation

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                    | Literal value at column | Exact expression                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| [line 106](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/place-population.ts#L106) | 0 @ 34                  | <code>if (acs !== undefined && acs &gt; 0)</code>                                              |
| [line 110](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/place-population.ts#L110) | 0 @ 56                  | <code>const enumerated = decennialPopulation(placeGeoid)?.[0];</code>                          |
| [line 111](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/nationwide-world/place-population.ts#L111) | 0 @ 79                  | <code>if (enumerated !== undefined && Number.isFinite(enumerated) && enumerated &gt; 0)</code> |

### src/simulation/living-world/town-residents.ts — UNKNOWN_TOWN_POPULATION

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------- |
| [line 102](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L102) | 1000 @ 40               | <code>export const UNKNOWN_TOWN_POPULATION = 1_000;</code> |

### src/simulation/living-world/town-residents.ts — MEAN_MEMBERS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------- |
| [line 113](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L113) | 1 @ 10                  | <code>alone: 1,</code>                  |
| [line 114](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L114) | 2 @ 11                  | <code>couple: 2,</code>                 |
| [line 116](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L116) | 4 @ 27                  | <code>"couple-with-children": 4,</code> |
| [line 117](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L117) | 3 @ 27                  | <code>"parent-with-children": 3,</code> |
| [line 118](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L118) | 2 @ 15                  | <code>housemates: 2,</code>             |

### src/simulation/living-world/town-residents.ts — peoplePerHousehold

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------- |
| [line 129](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L129) | 0 @ 5                   | <code>0,</code>  |

### src/simulation/living-world/town-residents.ts — EMPLOYED_SHARE_16_PLUS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------------------------- |
| [line 139](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L139) | 0.597 @ 39              | <code>export const EMPLOYED_SHARE_16_PLUS = 0.597;</code> |

### src/simulation/living-world/town-residents.ts — RESIDENTS_PER_CONGREGATION

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------ |
| [line 148](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L148) | 1500 @ 36               | <code>const RESIDENTS_PER_CONGREGATION = 1_500;</code> |

### src/simulation/living-world/town-residents.ts — MAX_CONGREGATIONS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------- |
| [line 149](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L149) | 4 @ 27                  | <code>const MAX_CONGREGATIONS = 4;</code> |

### src/simulation/living-world/town-residents.ts — CONGREGATION_HOUSEHOLD_SHARE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------- |
| [line 150](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L150) | 0.45 @ 38               | <code>const CONGREGATION_HOUSEHOLD_SHARE = 0.45;</code> |

### src/simulation/living-world/town-residents.ts — CONGREGATION_HOUSEHOLDS_WRITTEN

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------- |
| [line 151](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L151) | 8 @ 41                  | <code>const CONGREGATION_HOUSEHOLDS_WRITTEN = 8;</code> |

### src/simulation/living-world/town-residents.ts — STAFF_PER_EMPLOYER

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------ |
| [line 161](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L161) | 4 @ 24                  | <code>"enterprise:retail": 4,</code> |
| [line 162](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L162) | 3 @ 21                  | <code>"service:school": 3,</code>    |

### src/simulation/living-world/town-residents.ts — NEIGHBOR_HOUSEHOLDS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------- |
| [line 166](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L166) | 6 @ 36                  | <code>export const NEIGHBOR_HOUSEHOLDS = 6;</code> |

### src/simulation/living-world/town-residents.ts — pickShape

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------- |
| [line 274](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L274) | 0 @ 17                  | <code>if (point &lt; 0) return shape;</code> |
| [line 276](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L276) | -1 @ 21, 0 @ 25         | <code>return shares.at(-1)![0];</code>       |

### src/simulation/living-world/town-residents.ts — townHouseholdSkeleton

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column                            | Exact expression                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [line 289](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L289) | 1 @ 57                                             | <code>const age = rng.fork(&#96;age:${n}&#96;).integer(min, max + 1);</code>        |
| [line 293](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L293) | 0 @ 32, 20 @ 35, 88 @ 39                           | <code>if (shape === "alone") adult(0, 20, 88);</code>                               |
| [line 295](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L295) | 0 @ 11, 19 @ 14, 40 @ 18                           | <code>adult(0, 19, 40);</code>                                                      |
| [line 296](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L296) | 1 @ 11, 19 @ 14, 40 @ 18                           | <code>adult(1, 19, 40);</code>                                                      |
| [line 298](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L298) | 0 @ 45, 22 @ 48, 85 @ 52, 0 @ 64, 26 @ 67, 52 @ 71 | <code>const head = shape === "couple" ? adult(0, 22, 85) : adult(0, 26, 52);</code> |
| [line 300](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L300) | 1 @ 13, 19 @ 25, 6 @ 36, 90 @ 49, 6 @ 60           | <code>adult(1, Math.max(19, head - 6), Math.min(90, head + 6));</code>              |
| [line 302](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L302) | 1 @ 53, 4 @ 56                                     | <code>const children = rng.fork("children").integer(1, 4);</code>                   |
| [line 303](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L303) | 0 @ 33, 45 @ 43                                    | <code>const youngest = Math.max(0, head - 45);</code>                               |
| [line 304](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L304) | 0 @ 20, 1 @ 42                                     | <code>for (let c = 0; c &lt; children; c += 1)</code>                               |
| [line 308](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L308) | 17 @ 41, 20 @ 52, 1 @ 58                           | <code>.integer(youngest, Math.min(17, head - 20) + 1),</code>                       |

### src/simulation/living-world/town-residents.ts — townHouseholdMaterialized

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------- |
| [line 343](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L343) | 0 @ 60                  | <code>return !!world.people[townResidentId(world, town, index, 0)];</code> |

### src/simulation/living-world/town-residents.ts — birthDateForAge

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| [line 347](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L347) | 1 @ 36, 13 @ 39, 2 @ 53 | <code>const month = String(rng.integer(1, 13)).padStart(2, "0");</code> |
| [line 348](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L348) | 1 @ 34, 29 @ 37, 2 @ 51 | <code>const day = String(rng.integer(1, 29)).padStart(2, "0");</code>   |
| [line 349](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L349) | 0 @ 35, 4 @ 38          | <code>const year = Number(today.slice(0, 4)) - age;</code>              |
| [line 354](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L354) | 1 @ 29                  | <code>: makeIsoDate(&#96;${year - 1}-${month}-${day}&#96;);</code>      |

### src/simulation/living-world/town-residents.ts — SAME_SEX_COUPLE_SHARE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------- |
| [line 366](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L366) | 0.015 @ 38              | <code>export const SAME_SEX_COUPLE_SHARE = 0.015;</code> |

### src/simulation/living-world/town-residents.ts — namedMembers

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------ |
| [line 412](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L412) | 0 @ 25                  | <code>if (couple && n === 0) firstPartner = identity;</code> |
| [line 413](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L413) | 1 @ 25                  | <code>if (couple && n === 1 && firstPartner)</code>          |

### src/simulation/living-world/town-residents.ts — materializeTownHousehold

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------- |
| [line 476](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L476) | 0 @ 24                  | <code>label: &#96;${inputs[0]!.familyName} household&#96;,</code>      |
| [line 502](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L502) | 1 @ 23                  | <code>: n === 1</code>                                                 |
| [line 517](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L517) | 0 @ 39, 1 @ 55          | <code>const younger = Math.min(adults[0]!.age, adults[1]!.age);</code> |
| [line 520](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L520) | 0 @ 25, 1 @ 34          | <code>personIds: [ids[0]!, ids[1]!],</code>                            |
| [line 521](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L521) | 0 @ 48, 24 @ 61         | <code>startedAt: yearsBefore(today, Math.max(0, younger - 24)),</code> |

### src/simulation/living-world/town-residents.ts — townRosterPlace

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------- |
| [line 560](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L560) | 0 @ 33, 0 @ 42, 0 @ 48  | <code>const from = range ? Math.max(0, range[0]) : 0;</code>                 |
| [line 561](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L561) | 1 @ 49                  | <code>const to = range ? Math.min(households, range[1]) : households;</code> |
| [line 566](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L566) | 0 @ 22, 64 @ 35, 1 @ 50 | <code>for (let attempt = 0; attempt &lt; 64; attempt += 1) {</code>          |
| [line 572](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L572) | 0 @ 19                  | <code>if (member &gt;= 0) return { household, member };</code>               |

### src/simulation/living-world/town-residents.ts — workTimeDemand

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------- |
| [line 598](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L598) | 20 @ 37, 40 @ 55        | <code>expectedWeekly: { minimumHours: 20, maximumHours: 40 },</code> |

### src/simulation/living-world/town-residents.ts — workingAge

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------- |
| [line 608](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L608) | 18 @ 44, 66 @ 64        | <code>member.role === "adult" && member.age &gt;= 18 && member.age &lt;= 66;</code> |

### src/simulation/living-world/town-residents.ts — townCongregationCount

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------- |
| [line 612](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L612) | 1 @ 19                  | <code>return Math.max(1, Math.round(population / RESIDENTS_PER_CONGREGATION));</code> |

### src/simulation/living-world/town-residents.ts — seatTownResidents

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------- |
| [line 682](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L682) | 0 @ 29                  | <code>if (roster.households === 0) return world;</code>                            |
| [line 684](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L684) | 0 @ 61                  | <code>lifePlaceByJurisdictionId(town)?.displayName.split(",")[0]!.trim() ??</code> |
| [line 717](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L717) | 0 @ 13                  | <code>let n = 0;</code>                                                            |
| [line 719](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L719) | 1 @ 10                  | <code>n += 1</code>                                                                |
| [line 755](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L755) | 0 @ 20, 1 @ 39          | <code>for (let s = 0; s &lt; staff; s += 1) {</code>                               |
| [line 785](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L785) | 0 @ 16, 1 @ 43          | <code>for (let c = 0; c &lt; congregations; c += 1) {</code>                       |
| [line 801](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L801) | 0 @ 18, 1 @ 63          | <code>for (let h = 0; h &lt; CONGREGATION_HOUSEHOLDS_WRITTEN; h += 1) {</code>     |

### src/simulation/living-world/town-residents.ts — SCHOOL_AGES

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------------- |
| [line 841](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L841) | 5 @ 28, 10 @ 31         | <code>"schooling:elementary": [5, 10],</code> |
| [line 842](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L842) | 11 @ 24, 13 @ 28        | <code>"schooling:middle": [11, 13],</code>    |
| [line 843](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L843) | 14 @ 27, 17 @ 31        | <code>"schooling:secondary": [14, 17],</code> |
| [line 844](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L844) | 5 @ 25, 17 @ 28         | <code>"schooling:general": [5, 17],</code>    |

### src/simulation/living-world/town-residents.ts — schoolProgram

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------- |
| [line 854](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L854) | 1 @ 25, 0 @ 40          | <code>return kinds.size === 1 ? [...kinds][0]! : null;</code> |

### src/simulation/living-world/town-residents.ts — describeTownResidents

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------ |
| [line 905](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L905) | 2000 @ 12               | <code>sample = 2_000,</code>                                                   |
| [line 909](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L909) | 0 @ 16                  | <code>let people = 0;</code>                                                   |
| [line 910](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L910) | 0 @ 18                  | <code>let children = 0;</code>                                                 |
| [line 911](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L911) | 0 @ 18                  | <code>let adults16 = 0;</code>                                                 |
| [line 912](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L912) | 0 @ 16, 1 @ 31          | <code>for (let i = 0; i &lt; n; i += 1) {</code>                               |
| [line 915](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L915) | 1 @ 17                  | <code>people += 1;</code>                                                      |
| [line 916](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L916) | 5 @ 52, 1 @ 67          | <code>if (member.role === "child" && member.age &gt;= 5) children += 1;</code> |
| [line 917](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L917) | 16 @ 25, 1 @ 41         | <code>if (member.age &gt;= 16) adults16 += 1;</code>                           |
| [line 920](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L920) | 0 @ 23, 0 @ 27          | <code>const scale = n === 0 ? 0 : roster.households / n;</code>                |

### src/simulation/living-world/town-residents.ts — yearsBefore

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| [line 944](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L944) | 0 @ 34, 4 @ 37          | <code>const year = Number(date.slice(0, 4)) - years;</code> |
| [line 945](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-residents.ts#L945) | 4 @ 27                  | <code>const rest = date.slice(4);</code>                    |

### src/simulation/living-world/town-employment.ts — WORKING_AGE_MIN

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                             | Literal value at column | Exact expression                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| [line 73](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L73) | 18 @ 32                 | <code>export const WORKING_AGE_MIN = 18;</code> |

### src/simulation/living-world/town-employment.ts — WORKING_AGE_MAX

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                             | Literal value at column | Exact expression                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| [line 74](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L74) | 66 @ 32                 | <code>export const WORKING_AGE_MAX = 66;</code> |

### src/simulation/living-world/town-employment.ts — counties

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                             | Literal value at column | Exact expression                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| [line 94](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L94) | 0 @ 23, 1 @ 63          | <code>map.set(row.slice(0, colon), parseCells(row.slice(colon + 1)));</code> |

### src/simulation/living-world/town-employment.ts — states

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| [line 104](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L104) | 0 @ 23, 1 @ 63          | <code>map.set(row.slice(0, colon), parseCells(row.slice(colon + 1)));</code> |

### src/simulation/living-world/town-employment.ts — addSectors

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| [line 130](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L130) | 0 @ 45                  | <code>into.set(sector, (into.get(sector) ?? 0) + value * weight);</code> |

### src/simulation/living-world/town-employment.ts — townEmploymentMix

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| [line 141](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L141) | 0 @ 34, 2 @ 37          | <code>const stateFips = geoid?.slice(0, 2) ?? null;</code>                                   |
| [line 146](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L146) | 0 @ 22                  | <code>if (found.length &gt; 0) {</code>                                                      |
| [line 151](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L151) | 1 @ 52                  | <code>addSectors(sectors, counties().get(county)!, 1 / found.length);</code>                 |
| [line 154](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L154) | 1 @ 68                  | <code>if (county.startsWith(stateFips)) addSectors(sectors, cells, 1);</code>                |
| [line 155](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L155) | 0 @ 24                  | <code>if (sectors.size &gt; 0) basis = "state";</code>                                       |
| [line 157](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L157) | 0 @ 24                  | <code>if (sectors.size === 0)</code>                                                         |
| [line 158](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L158) | 1 @ 73                  | <code>for (const cells of counties().values()) addSectors(sectors, cells, 1);</code>         |
| [line 160](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L160) | 0 @ 70                  | <code>const privateTotal = [...sectors.values()].reduce((a, b) =&gt; a + b, 0);</code>       |
| [line 166](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L166) | 3 @ 27, 2 @ 46          | <code>const cityIsState = row[3] === null && row[2] !== null;</code>                         |
| [line 167](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L167) | 0 @ 34, 2 @ 42          | <code>const stateGov = cityIsState ? 0 : row[2];</code>                                      |
| [line 168](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L168) | 2 @ 35, 3 @ 44          | <code>const local = cityIsState ? row[2] : row[3];</code>                                    |
| [line 169](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L169) | 0 @ 35, 0 @ 53, 0 @ 68  | <code>const publicTotal = (federal ?? 0) + (stateGov ?? 0) + (local ?? 0);</code>            |
| [line 172](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L172) | 0 @ 75                  | <code>total && total &gt; publicTotal ? privateTotal / (total - publicTotal) : 0;</code>     |
| [line 174](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L174) | 4 @ 70                  | <code>const groupCells = (cityIsState ? nationalPublicRow() : row).slice(4);</code>          |
| [line 175](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L175) | 0 @ 66, 0 @ 70          | <code>const groupSum = groupCells.reduce&lt;number&gt;((a, b) =&gt; a + (b ?? 0), 0);</code> |
| [line 180](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L180) | 0 @ 61                  | <code>if (value !== null && value !== undefined && groupSum &gt; 0)</code>                   |
| [line 181](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L181) | 0 @ 41                  | <code>localGroups.set(group, ((local ?? 0) * scale * value) / groupSum);</code>              |
| [line 186](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L186) | 0 @ 26                  | <code>federal: (federal ?? 0) * scale,</code>                                                |
| [line 187](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L187) | 0 @ 25                  | <code>state: (stateGov ?? 0) * scale,</code>                                                 |

### src/simulation/living-world/town-employment.ts — nationalPublicRow

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| [line 199](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L199) | 0 @ 55                  | <code>cells.forEach((cell, n) =&gt; (sums[n] = (sums[n] ?? 0) + cell!));</code> |

### src/simulation/living-world/town-employment.ts — LEAD

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| [line 403](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L403) | 28 @ 62                 | <code>const LEAD = { authority: "directs-others" as const, minAge: 28 };</code> |

### src/simulation/living-world/town-employment.ts — TOWN_WORKPLACES

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 411](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L411) | 2 @ 14                  | <code>outlets: 2,</code>                                                                |
| [line 413](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L413) | 5 @ 51                  | <code>role("Farmworker", "occupation:farmworker", 5, { rigidity: "mixed" }),</code>     |
| [line 414](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L414) | 1 @ 55                  | <code>role("Farm manager", "occupation:farm-manager", 1, LEAD),</code>                  |
| [line 422](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L422) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 424](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L424) | 3 @ 62                  | <code>role("Equipment operator", "trade:equipment-operator", 3),</code>                 |
| [line 425](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L425) | 2 @ 63                  | <code>role("Quarry laborer", "occupation:extraction-laborer", 2),</code>                |
| [line 433](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L433) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 435](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L435) | 3 @ 48                  | <code>role("Line worker", "trade:line-worker", 3),</code>                               |
| [line 436](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L436) | 2 @ 78                  | <code>role("Customer service representative", "occupation:customer-service", 2),</code> |
| [line 444](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L444) | 3 @ 14                  | <code>outlets: 3,</code>                                                                |
| [line 446](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L446) | 3 @ 44                  | <code>role("Carpenter", "trade:carpenter", 3),</code>                                   |
| [line 447](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L447) | 2 @ 48                  | <code>role("Electrician", "trade:electrician", 2),</code>                               |
| [line 448](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L448) | 3 @ 71                  | <code>role("Construction laborer", "occupation:construction-laborer", 3),</code>        |
| [line 449](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L449) | 1 @ 66                  | <code>role("Project manager", "profession:construction-manager", 1, LEAD),</code>       |
| [line 457](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L457) | 2 @ 14                  | <code>outlets: 2,</code>                                                                |
| [line 459](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L459) | 6 @ 65                  | <code>role("Production worker", "occupation:production-worker", 6),</code>              |
| [line 460](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L460) | 2 @ 44                  | <code>role("Machinist", "trade:machinist", 2),</code>                                   |
| [line 461](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L461) | 1 @ 68                  | <code>role("Shift supervisor", "occupation:production-supervisor", 1, LEAD),</code>     |
| [line 469](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L469) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 471](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L471) | 3 @ 63                  | <code>role("Warehouse worker", "occupation:warehouse-worker", 3),</code>                |
| [line 472](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L472) | 2 @ 71                  | <code>role("Sales representative", "occupation:sales-representative", 2),</code>        |
| [line 480](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L480) | 3 @ 14                  | <code>outlets: 3,</code>                                                                |
| [line 482](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L482) | 4 @ 45                  | <code>role("Cashier", "occupation:cashier", 4),</code>                                  |
| [line 483](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L483) | 4 @ 58                  | <code>role("Sales associate", "occupation:retail-sales", 4),</code>                     |
| [line 484](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L484) | 2 @ 45                  | <code>role("Stocker", "occupation:stocker", 2),</code>                                  |
| [line 485](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L485) | 1 @ 58                  | <code>role("Store manager", "occupation:retail-manager", 1, LEAD),</code>               |
| [line 493](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L493) | 2 @ 14                  | <code>outlets: 2,</code>                                                                |
| [line 495](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L495) | 4 @ 55                  | <code>role("Truck driver", "occupation:truck-driver", 4, {</code>                       |
| [line 498](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L498) | 1 @ 51                  | <code>role("Dispatcher", "occupation:dispatcher", 1),</code>                            |
| [line 506](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L506) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 508](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L508) | 2 @ 67                  | <code>role("Installation technician", "trade:telecom-technician", 2),</code>            |
| [line 509](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L509) | 2 @ 78                  | <code>role("Customer service representative", "occupation:customer-service", 2),</code> |
| [line 517](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L517) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 519](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L519) | 3 @ 53                  | <code>role("Bank teller", "occupation:bank-teller", 3),</code>                          |
| [line 520](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L520) | 2 @ 55                  | <code>role("Loan officer", "profession:loan-officer", 2),</code>                        |
| [line 521](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L521) | 1 @ 62                  | <code>role("Branch manager", "profession:financial-manager", 1, LEAD),</code>           |
| [line 529](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L529) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 531](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L531) | 2 @ 61                  | <code>role("Insurance agent", "profession:insurance-agent", 2),</code>                  |
| [line 532](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L532) | 1 @ 55                  | <code>role("Office clerk", "occupation:office-clerk", 1),</code>                        |
| [line 540](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L540) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 542](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L542) | 2 @ 65                  | <code>role("Real estate agent", "profession:real-estate-agent", 2),</code>              |
| [line 543](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L543) | 1 @ 63                  | <code>role("Property manager", "profession:property-manager", 1),</code>                |
| [line 551](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L551) | 2 @ 14                  | <code>outlets: 2,</code>                                                                |
| [line 553](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L553) | 2 @ 51, 22 @ 64         | <code>role("Accountant", "profession:accountant", 2, { minAge: 22 }),</code>            |
| [line 554](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L554) | 1 @ 45, 25 @ 58         | <code>role("Attorney", "profession:lawyer", 1, { minAge: 25 }),</code>                  |
| [line 555](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L555) | 1 @ 55                  | <code>role("Paralegal", "profession:legal-assistant", 1),</code>                        |
| [line 556](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L556) | 1 @ 47, 22 @ 60         | <code>role("Engineer", "profession:engineer", 1, { minAge: 22 }),</code>                |
| [line 564](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L564) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 566](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L566) | 1 @ 59                  | <code>role("Office manager", "occupation:office-manager", 1),</code>                    |
| [line 567](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L567) | 2 @ 63                  | <code>role("Business analyst", "profession:business-analyst", 2, {</code>               |
| [line 568](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L568) | 22 @ 17                 | <code>minAge: 22,</code>                                                                |
| [line 577](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L577) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 579](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L579) | 3 @ 45                  | <code>role("Janitor", "occupation:janitor", 3, { rigidity: "mixed" }),</code>           |
| [line 580](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L580) | 2 @ 51                  | <code>role("Landscaper", "occupation:landscaper", 2),</code>                            |
| [line 581](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L581) | 1 @ 59                  | <code>role("Security guard", "occupation:security-guard", 1),</code>                    |
| [line 589](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L589) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 591](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L591) | 3 @ 45, 22 @ 58         | <code>role("Teacher", "profession:teacher", 3, { minAge: 22 }),</code>                  |
| [line 592](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L592) | 1 @ 62                  | <code>role("Teacher's aide", "occupation:teacher-assistant", 1),</code>                 |
| [line 600](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L600) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 602](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L602) | 4 @ 63                  | <code>role("Registered nurse", "profession:registered-nurse", 4, {</code>               |
| [line 603](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L603) | 21 @ 17                 | <code>minAge: 21,</code>                                                                |
| [line 606](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L606) | 3 @ 65                  | <code>role("Nursing assistant", "occupation:nursing-assistant", 3),</code>              |
| [line 607](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L607) | 1 @ 49, 30 @ 62         | <code>role("Physician", "profession:physician", 1, { minAge: 30 }),</code>              |
| [line 608](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L608) | 1 @ 67                  | <code>role("Medical records clerk", "occupation:medical-records", 1),</code>            |
| [line 616](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L616) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 618](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L618) | 2 @ 52, 21 @ 65         | <code>role("Nurse", "profession:registered-nurse", 2, { minAge: 21 }),</code>           |
| [line 619](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L619) | 2 @ 65                  | <code>role("Medical assistant", "occupation:medical-assistant", 2),</code>              |
| [line 620](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L620) | 1 @ 55                  | <code>role("Receptionist", "occupation:receptionist", 1),</code>                        |
| [line 628](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L628) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 630](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L630) | 3 @ 63                  | <code>role("Home health aide", "occupation:home-health-aide", 3),</code>                |
| [line 631](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L631) | 1 @ 70                  | <code>role("Licensed practical nurse", "profession:practical-nurse", 1, {</code>        |
| [line 632](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L632) | 21 @ 17                 | <code>minAge: 21,</code>                                                                |
| [line 641](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L641) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 643](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L643) | 2 @ 71                  | <code>role("Recreation attendant", "occupation:recreation-attendant", 2),</code>        |
| [line 644](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L644) | 1 @ 61                  | <code>role("Fitness trainer", "occupation:fitness-trainer", 1),</code>                  |
| [line 652](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L652) | 3 @ 14                  | <code>outlets: 3,</code>                                                                |
| [line 654](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L654) | 3 @ 39                  | <code>role("Cook", "occupation:cook", 3, { rigidity: "mixed" }),</code>                 |
| [line 655](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L655) | 4 @ 45                  | <code>role("Server", "service:food-server", 4, { rigidity: "mixed" }),</code>           |
| [line 656](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L656) | 1 @ 51                  | <code>role("Dishwasher", "occupation:dishwasher", 1),</code>                            |
| [line 657](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L657) | 1 @ 69                  | <code>role("Restaurant manager", "occupation:food-service-manager", 1, LEAD),</code>    |
| [line 665](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L665) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 667](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L667) | 2 @ 58                  | <code>role("Front desk clerk", "occupation:hotel-clerk", 2),</code>                     |
| [line 668](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L668) | 2 @ 53                  | <code>role("Housekeeper", "occupation:housekeeper", 2),</code>                          |
| [line 676](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L676) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 677](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L677) | 3 @ 59                  | <code>roles: [role("Mechanic", "trade:automotive-mechanic", 3)],</code>                 |
| [line 684](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L684) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 686](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L686) | 2 @ 50                  | <code>role("Hairstylist", "service:hairstylist", 2),</code>                             |
| [line 687](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L687) | 1 @ 40                  | <code>role("Barber", "service:barber", 1),</code>                                       |
| [line 697](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L697) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 700](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L700) | 1 @ 43, 30 @ 65         | <code>role("Pastor", "profession:clergy", 1, { ...LEAD, minAge: 30 }),</code>           |
| [line 701](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L701) | 1 @ 66                  | <code>role("Church office secretary", "occupation:office-clerk", 1),</code>             |
| [line 709](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L709) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 710](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L710) | 1 @ 75                  | <code>roles: [role("Community organizer", "profession:community-organizer", 1)],</code> |
| [line 717](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L717) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 719](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L719) | 1 @ 71                  | <code>role("Union representative", "profession:union-representative", 1, {</code>       |
| [line 720](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L720) | 25 @ 17                 | <code>minAge: 25,</code>                                                                |
| [line 729](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L729) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 732](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L732) | 1 @ 65                  | <code>role("Party office manager", "occupation:office-manager", 1),</code>              |
| [line 733](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L733) | 1 @ 71                  | <code>role("Party field organizer", "profession:political-organizer", 1),</code>        |
| [line 741](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L741) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 743](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L743) | 2 @ 74                  | <code>role("Campaign field organizer", "profession:political-organizer", 2, {</code>    |
| [line 746](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L746) | 1 @ 63                  | <code>role("Campaign manager", "profession:campaign-manager", 1, {</code>               |
| [line 748](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L748) | 26 @ 17                 | <code>minAge: 26,</code>                                                                |
| [line 759](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L759) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 762](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L762) | 6 @ 45, 22 @ 58         | <code>role("Teacher", "profession:teacher", 6, { minAge: 22 }),</code>                  |
| [line 763](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L763) | 2 @ 62                  | <code>role("Teacher's aide", "occupation:teacher-assistant", 2),</code>                 |
| [line 764](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L764) | 0 @ 56                  | <code>role("Principal", "profession:school-principal", 0, {</code>                      |
| [line 766](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L766) | 32 @ 17                 | <code>minAge: 32,</code>                                                                |
| [line 775](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L775) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 777](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L777) | 0 @ 56, 25 @ 69         | <code>role("City clerk", "profession:municipal-clerk", 0, { minAge: 25 }),</code>       |
| [line 778](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L778) | 0 @ 56, 24 @ 69         | <code>role("City planner", "profession:urban-planner", 0, { minAge: 24 }),</code>       |
| [line 779](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L779) | 3 @ 59                  | <code>role("Office assistant", "occupation:office-clerk", 3),</code>                    |
| [line 780](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L780) | 1 @ 59, 22 @ 72         | <code>role("Budget analyst", "profession:budget-analyst", 1, { minAge: 22 }),</code>    |
| [line 790](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L790) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 792](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L792) | 0 @ 55, 30 @ 68         | <code>role("County clerk", "profession:county-clerk", 0, { minAge: 30 }),</code>        |
| [line 793](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L793) | 0 @ 62                  | <code>role("Deputy county clerk", "occupation:office-clerk", 0),</code>                 |
| [line 801](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L801) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 803](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L803) | 5 @ 59                  | <code>role("Police officer", "profession:police-officer", 5, {</code>                   |
| [line 804](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L804) | 21 @ 17                 | <code>minAge: 21,</code>                                                                |
| [line 807](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L807) | 1 @ 61                  | <code>role("Emergency dispatcher", "occupation:dispatcher", 1),</code>                  |
| [line 815](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L815) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 817](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L817) | 1 @ 53                  | <code>role("Firefighter", "profession:firefighter", 1, { rigidity: "rigid" }),</code>   |
| [line 825](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L825) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 827](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L827) | 3 @ 62                  | <code>role("Maintenance worker", "trade:maintenance-worker", 3),</code>                 |
| [line 828](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L828) | 1 @ 62                  | <code>role("Equipment operator", "trade:equipment-operator", 1),</code>                 |
| [line 829](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L829) | 2 @ 51                  | <code>role("Bus driver", "occupation:bus-driver", 2),</code>                            |
| [line 837](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L837) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 839](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L839) | 2 @ 66                  | <code>role("Public health nurse", "profession:registered-nurse", 2, {</code>            |
| [line 840](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L840) | 21 @ 17                 | <code>minAge: 21,</code>                                                                |
| [line 842](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L842) | 2 @ 54, 22 @ 67         | <code>role("Caseworker", "profession:social-worker", 2, { minAge: 22 }),</code>         |
| [line 850](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L850) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 852](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L852) | 2 @ 60, 22 @ 73         | <code>role("State caseworker", "profession:social-worker", 2, { minAge: 22 }),</code>   |
| [line 853](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L853) | 2 @ 55                  | <code>role("Office clerk", "occupation:office-clerk", 2),</code>                        |
| [line 854](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L854) | 2 @ 70                  | <code>role("Highway maintenance worker", "trade:maintenance-worker", 2),</code>         |
| [line 862](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L862) | 1 @ 14                  | <code>outlets: 1,</code>                                                                |
| [line 864](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L864) | 3 @ 55                  | <code>role("Mail carrier", "occupation:mail-carrier", 3),</code>                        |
| [line 865](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L865) | 1 @ 55                  | <code>role("Postal clerk", "occupation:postal-clerk", 1),</code>                        |

### src/simulation/living-world/town-employment.ts — FULL_TIME_HOURS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| [line 872](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L872) | 35 @ 26, 45 @ 30        | <code>const FULL_TIME_HOURS = [35, 45] as const;</code> |

### src/simulation/living-world/town-employment.ts — PART_TIME_HOURS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| [line 873](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L873) | 16 @ 26, 29 @ 30        | <code>const PART_TIME_HOURS = [16, 29] as const;</code> |

### src/simulation/living-world/town-employment.ts — TOWN_MEDIAN_TENURE_BY_AGE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------- |
| [line 884](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L884) | 20 @ 6, 0.8 @ 10        | <code>[20, 0.8],</code>       |
| [line 885](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L885) | 25 @ 6, 1.5 @ 10        | <code>[25, 1.5],</code>       |
| [line 886](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L886) | 35 @ 6, 3 @ 10          | <code>[35, 3.0],</code>       |
| [line 887](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L887) | 45 @ 6, 4.7 @ 10        | <code>[45, 4.7],</code>       |
| [line 888](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L888) | 55 @ 6, 7 @ 10          | <code>[55, 7.0],</code>       |
| [line 889](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L889) | 65 @ 6, 9.6 @ 10        | <code>[65, 9.6],</code>       |
| [line 890](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L890) | 9.9 @ 16                | <code>[Infinity, 9.9],</code> |

### src/simulation/living-world/town-employment.ts — medianTenureYears

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 894](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L894) | 1 @ 68                  | <code>return TOWN_MEDIAN_TENURE_BY_AGE.find(([below]) =&gt; age &lt; below)![1];</code> |

### src/simulation/living-world/town-employment.ts — TOWN_PART_TIME_SHARE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| [line 908](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L908) | 0.45 @ 15               | <code>restaurant: 0.45,</code>          |
| [line 909](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L909) | 0.35 @ 11               | <code>retail: 0.35,</code>              |
| [line 910](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L910) | 0.5 @ 15                | <code>recreation: 0.5,</code>           |
| [line 911](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L911) | 0.3 @ 20                | <code>"personal-care": 0.3,</code>      |
| [line 912](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L912) | 0.3 @ 8                 | <code>inn: 0.3,</code>                  |
| [line 913](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L913) | 0.25 @ 24               | <code>"building-services": 0.25,</code> |
| [line 914](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L914) | 0.25 @ 16               | <code>"care-home": 0.25,</code>         |
| [line 915](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L915) | 0.15 @ 21               | <code>"private-school": 0.15,</code>    |
| [line 916](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L916) | 0.08 @ 20               | <code>"public-school": 0.08,</code>     |
| [line 917](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L917) | 0.3 @ 17                | <code>congregation: 0.3,</code>         |
| [line 918](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L918) | 0.15 @ 9                | <code>farm: 0.15,</code>                |
| [line 919](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L919) | 0.15 @ 13               | <code>hospital: 0.15,</code>            |
| [line 920](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L920) | 0.2 @ 11                | <code>clinic: 0.2,</code>               |
| [line 921](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L921) | 0.2 @ 21                | <code>"campaign-staff": 0.2,</code>     |
| [line 922](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L922) | 0.2 @ 15                | <code>organizing: 0.2,</code>           |

### src/simulation/living-world/town-employment.ts — TOWN_PART_TIME_DEFAULT

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| [line 924](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L924) | 0.08 @ 39               | <code>export const TOWN_PART_TIME_DEFAULT = 0.08;</code> |

### src/simulation/living-world/town-employment.ts — countyDisplayName

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| [line 942](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L942) | 2 @ 33, 1 @ 53          | <code>return match ? &#96;${title(match[2]!)} ${title(match[1]!)}&#96; : title(listed);</code> |

### src/simulation/living-world/town-employment.ts — townWorkplaceFor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| [line 951](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L951) | 1 @ 47                  | <code>if (employer) return WORKPLACE.get(employer[1]!) ?? null;</code> |

### src/simulation/living-world/town-employment.ts — SECTOR_WORKPLACES

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| [line 964](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L964) | 1 @ 19                  | <code>"11": [["farm", 1]],</code>              |
| [line 965](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L965) | 1 @ 21                  | <code>"21": [["quarry", 1]],</code>            |
| [line 966](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L966) | 1 @ 22                  | <code>"22": [["utility", 1]],</code>           |
| [line 967](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L967) | 1 @ 27                  | <code>"23": [["construction", 1]],</code>      |
| [line 968](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L968) | 1 @ 28                  | <code>"31": [["manufacturing", 1]],</code>     |
| [line 969](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L969) | 1 @ 24                  | <code>"42": [["wholesale", 1]],</code>         |
| [line 970](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L970) | 1 @ 21                  | <code>"44": [["retail", 1]],</code>            |
| [line 971](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L971) | 1 @ 23                  | <code>"48": [["trucking", 1]],</code>          |
| [line 972](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L972) | 1 @ 26                  | <code>"51": [["information", 1]],</code>       |
| [line 974](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L974) | 2 @ 14                  | <code>["bank", 2],</code>                      |
| [line 975](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L975) | 1 @ 19                  | <code>["insurance", 1],</code>                 |
| [line 977](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L977) | 1 @ 21                  | <code>"53": [["realty", 1]],</code>            |
| [line 978](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L978) | 1 @ 27                  | <code>"54": [["professional", 1]],</code>      |
| [line 979](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L979) | 1 @ 30                  | <code>"55": [["regional-office", 1]],</code>   |
| [line 980](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L980) | 1 @ 32                  | <code>"56": [["building-services", 1]],</code> |
| [line 981](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L981) | 1 @ 29                  | <code>"61": [["private-school", 1]],</code>    |
| [line 983](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L983) | 4 @ 18                  | <code>["hospital", 4],</code>                  |
| [line 984](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L984) | 3 @ 16                  | <code>["clinic", 3],</code>                    |
| [line 985](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L985) | 2 @ 19                  | <code>["care-home", 2],</code>                 |
| [line 987](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L987) | 1 @ 25                  | <code>"71": [["recreation", 1]],</code>        |
| [line 989](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L989) | 6 @ 20                  | <code>["restaurant", 6],</code>                |
| [line 990](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L990) | 1 @ 13                  | <code>["inn", 1],</code>                       |
| [line 993](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L993) | 3 @ 16                  | <code>["repair", 3],</code>                    |
| [line 994](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L994) | 2 @ 23                  | <code>["personal-care", 2],</code>             |
| [line 995](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L995) | 2 @ 22                  | <code>["congregation", 2],</code>              |
| [line 996](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L996) | 1 @ 20                  | <code>["organizing", 1],</code>                |
| [line 997](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L997) | 1 @ 15                  | <code>["union", 1],</code>                     |
| [line 998](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L998) | 1 @ 22                  | <code>["party-office", 1],</code>              |
| [line 999](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L999) | 1 @ 24                  | <code>["campaign-staff", 1],</code>            |

### src/simulation/living-world/town-employment.ts — LOCAL_GROUP_WORKPLACES

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| [line 1008](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1008) | 1 @ 19                  | <code>["city-hall", 1],</code>             |
| [line 1009](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1009) | 1 @ 23                  | <code>["public-school", 1],</code>         |
| [line 1011](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1011) | 1 @ 24                  | <code>"13": [["city-hall", 1]],</code>     |
| [line 1012](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1012) | 1 @ 28                  | <code>"21": [["public-health", 1]],</code> |
| [line 1013](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1013) | 1 @ 28                  | <code>"25": [["public-school", 1]],</code> |
| [line 1014](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1014) | 1 @ 28                  | <code>"29": [["public-health", 1]],</code> |
| [line 1015](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1015) | 1 @ 28                  | <code>"31": [["public-health", 1]],</code> |
| [line 1017](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1017) | 3 @ 16                  | <code>["police", 3],</code>                |
| [line 1018](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1018) | 2 @ 14                  | <code>["fire", 2],</code>                  |
| [line 1021](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1021) | 1 @ 22                  | <code>["public-works", 1],</code>          |
| [line 1022](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1022) | 1 @ 23                  | <code>["public-school", 1],</code>         |
| [line 1024](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1024) | 1 @ 24                  | <code>"43": [["city-hall", 1]],</code>     |
| [line 1025](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1025) | 1 @ 27                  | <code>"47": [["public-works", 1]],</code>  |
| [line 1026](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1026) | 1 @ 27                  | <code>"49": [["public-works", 1]],</code>  |
| [line 1027](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1027) | 1 @ 27                  | <code>"53": [["public-works", 1]],</code>  |

### src/simulation/living-world/town-employment.ts — townWorkplaceWeights

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| [line 1065](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1065) | 0 @ 68                  | <code>const sum = places.reduce((total, [, share]) =&gt; total + share, 0);</code> |
| [line 1067](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1067) | 0 @ 45                  | <code>weights.set(key, (weights.get(key) ?? 0) + (amount * share) / sum);</code>   |
| [line 1073](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1073) | 1 @ 39                  | <code>spread(mix.state, [["state-office", 1]]);</code>                             |
| [line 1074](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1074) | 1 @ 40                  | <code>spread(mix.federal, [["post-office", 1]]);</code>                            |

### src/simulation/living-world/town-employment.ts — NOT_WORKING

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------ |
| [line 1089](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1089) | 0.6 @ 22                | <code>studentWithoutJob: 0.6,</code> |
| [line 1090](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1090) | 0.35 @ 18               | <code>retiredFrom62: 0.35,</code>    |
| [line 1091](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1091) | 0.15 @ 17               | <code>parentAtHome: 0.15,</code>     |
| [line 1092](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1092) | 0.04 @ 19               | <code>lookingForWork: 0.04,</code>   |

### src/simulation/living-world/town-employment.ts — laborStatus

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| [line 1110](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1110) | 24 @ 44                 | <code>if (resident.enrolled && resident.age &lt;= 24)</code>                                     |
| [line 1112](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1112) | 62 @ 23                 | <code>if (resident.age &gt;= 62 && draw &lt; NOT_WORKING.retiredFrom62) return "retired";</code> |

### src/simulation/living-world/town-employment.ts — yearsBefore

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| [line 1125](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1125) | 0 @ 34, 4 @ 37          | <code>const year = Number(date.slice(0, 4)) - years;</code> |
| [line 1126](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1126) | 4 @ 27                  | <code>const rest = date.slice(4);</code>                    |

### src/simulation/living-world/town-employment.ts — townResidents

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| [line 1169](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1169) | 6 @ 70                  | <code>if (person && ageOnDate(person.birthDate, world.currentDate) &lt; 6)</code> |

### src/simulation/living-world/town-employment.ts — townEmployerOutlets

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| [line 1263](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1263) | 0 @ 21, 1 @ 62          | <code>for (let outlet = 0; outlet &lt; workplace.outlets; outlet += 1)</code> |

### src/simulation/living-world/town-employment.ts — writeTownEmployer

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| [line 1290](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1290) | 0 @ 56                  | <code>? countyGovernmentUnitsForPlace(place.sourceGeoid)[0]?.unit</code>           |
| [line 1310](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1310) | 0 @ 53                  | <code>const firstStyle = rng.fork("name-style").integer(0, styles.length);</code>  |
| [line 1312](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1312) | 0 @ 22, 4 @ 51, 1 @ 65  | <code>for (let attempt = 0; attempt &lt; styles.length * 4; attempt += 1) {</code> |
| [line 1315](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1315) | 0 @ 20                  | <code>(attempt === 0 && founder?.familyName) &#124;&#124;</code>                   |
| [line 1316](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1316) | 0 @ 27                  | <code>(residents.length &gt; 0</code>                                              |
| [line 1317](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1317) | 0 @ 49                  | <code>? residents[draw.fork("family").integer(0, residents.length)]!</code>        |
| [line 1329](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1329) | 0 @ 50                  | <code>TOWN_STREETS[draw.fork("street").integer(0, TOWN_STREETS.length)]!,</code>   |

### src/simulation/living-world/town-employment.ts — fillTownJobs

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| [line 1376](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1376) | 0 @ 33                  | <code>if (!place &#124;&#124; open.length === 0) return world;</code>                           |
| [line 1387](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1387) | 0 @ 56                  | <code>? countyGovernmentUnitsForPlace(place.sourceGeoid)[0]?.unit</code>                        |
| [line 1390](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1390) | 0 @ 73                  | <code>const weights = [...townWorkplaceWeights(town)].filter(([, w]) =&gt; w &gt; 0);</code>    |
| [line 1413](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1413) | 1 @ 43                  | <code>kindOf.set(organization.id, match[1]!);</code>                                            |
| [line 1447](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1447) | 0 @ 14                  | <code>total: 0,</code>                                                                          |
| [line 1457](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1457) | 0 @ 56                  | <code>hours !== undefined && hours &lt; FULL_TIME_HOURS[0],</code>                              |
| [line 1468](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1468) | 0 @ 71, 1 @ 76          | <code>into.staff.set(organizationId, (into.staff.get(organizationId) ?? 0) + 1);</code>         |
| [line 1472](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1472) | 0 @ 47, 1 @ 52          | <code>(into.partTime.get(organizationId) ?? 0) + 1,</code>                                      |
| [line 1476](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1476) | 0 @ 53, 1 @ 58          | <code>into.byKind.set(kind, (into.byKind.get(kind) ?? 0) + 1);</code>                           |
| [line 1480](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1480) | 0 @ 49, 1 @ 54          | <code>(into.byRole.get(&#96;${kind}&#124;${title}&#96;) ?? 0) + 1,</code>                       |
| [line 1482](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1482) | 1 @ 19                  | <code>into.total += 1;</code>                                                                   |
| [line 1485](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1485) | 0 @ 44                  | <code>counted().staff.get(organizationId) ?? 0;</code>                                          |
| [line 1499](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1499) | 0 @ 67                  | <code>const total = fits.reduce((sum, entry) =&gt; sum + entry.weight, 0);</code>               |
| [line 1500](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1500) | 0 @ 18                  | <code>if (total &lt;= 0) return null;</code>                                                    |
| [line 1503](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1503) | 0 @ 75                  | <code>sum + (counted().byRole.get(&#96;${workplace.key}&#124;${entry.title}&#96;) ?? 0),</code> |
| [line 1504](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1504) | 0 @ 7                   | <code>0,</code>                                                                                 |
| [line 1507](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1507) | 1 @ 40                  | <code>(entry.weight / total) * (held + 1) -</code>                                              |
| [line 1508](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1508) | 0 @ 67                  | <code>(counted().byRole.get(&#96;${workplace.key}&#124;${entry.title}&#96;) ?? 0);</code>       |
| [line 1511](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1511) | 0 @ 7                   | <code>)[0]!;</code>                                                                             |
| [line 1535](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1535) | 0 @ 31                  | <code>return already.length &gt; 0</code>                                                       |
| [line 1538](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1538) | 0 @ 13                  | <code>)[0]!</code>                                                                              |
| [line 1545](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1545) | 0 @ 28                  | <code>if (outlets.length === 0) return null;</code>                                             |
| [line 1560](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1560) | 0 @ 60                  | <code>market?.townPay !== undefined && market.townJobs &gt; 0</code>                            |
| [line 1562](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1562) | 0 @ 13                  | <code>: 0;</code>                                                                               |
| [line 1592](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1592) | 365.25 @ 72             | <code>? addDays(today, -Math.round(medianTenureYears(resident.age) * 365.25))</code>            |
| [line 1603](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1603) | 65 @ 25                 | <code>resident.age &gt;= 65 &#124;&#124;</code>                                                 |
| [line 1604](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1604) | 0 @ 52                  | <code>(counted().partTime.get(organizationId) ?? 0) &lt;</code>                                 |
| [line 1606](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1606) | 1 @ 22                  | <code>(staff + 1) -</code>                                                                      |
| [line 1607](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1607) | 0.5 @ 13                | <code>0.5);</code>                                                                              |
| [line 1651](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1651) | 0 @ 30                  | <code>return jobs.length === 0 ? next : createWorkRelationships(next, jobs);</code>             |
| [line 1672](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1672) | 0 @ 28                  | <code>return jobs.length === 0 ? next : createWorkRelationships(next, jobs);</code>             |
| [line 1683](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1683) | 0 @ 25                  | <code>if (fits.length === 0) return null;</code>                                                |
| [line 1684](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1684) | 2 @ 48                  | <code>const pick = fits[Math.floor(fits.length / 2)]!;</code>                                   |
| [line 1685](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1685) | 1 @ 37                  | <code>pool.splice(pool.indexOf(pick), 1);</code>                                                |
| [line 1703](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1703) | 0 @ 18, 1 @ 34, 1 @ 67  | <code>for (let n = 0; n &lt; Math.max(1, organizationIds.length); n += 1) {</code>              |
| [line 1706](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1706) | 0 @ 33, 0 @ 38          | <code>if ((held.get(heldKey) ?? 0) &gt; 0) {</code>                                             |
| [line 1707](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1707) | 1 @ 48                  | <code>held.set(heldKey, held.get(heldKey)! - 1);</code>                                         |
| [line 1729](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1729) | 0 @ 73                  | <code>const totalWeight = weights.reduce((sum, [, weight]) =&gt; sum + weight, 0);</code>       |
| [line 1733](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1733) | 1 @ 48                  | <code>(weight / totalWeight) * (census.total + 1) -</code>                                      |
| [line 1734](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1734) | 0 @ 34                  | <code>(census.byKind.get(key) ?? 0);</code>                                                     |
| [line 1738](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1738) | 0 @ 34                  | <code>.filter(([, gap]) =&gt; gap &gt; 0)</code>                                                |
| [line 1741](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1741) | 0 @ 30, 0 @ 65          | <code>Number(past?.has(b[0]) ?? false) - Number(past?.has(a[0]) ?? false) &#124;&#124;</code>   |
| [line 1742](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1742) | 1 @ 13, 1 @ 20          | <code>b[1] - a[1] &#124;&#124;</code>                                                           |
| [line 1743](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1743) | 0 @ 13, 0 @ 32          | <code>a[0].localeCompare(b[0]),</code>                                                          |
| [line 1763](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1763) | 0 @ 26                  | <code>return jobs.length === 0 ? next : createWorkRelationships(next, jobs);</code>             |

### src/simulation/living-world/town-employment.ts — heldTownRoles

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| [line 1775](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1775) | 1 @ 46                  | <code>workplaceOf.set(organization.id, match[1]!);</code> |
| [line 1798](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1798) | 0 @ 41, 1 @ 46          | <code>counts.set(key, (counts.get(key) ?? 0) + 1);</code> |

### src/simulation/living-world/town-employment.ts — describeTownEmployment

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| [line 1812](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1812) | 0 @ 15                  | <code>employed: 0,</code>                                                        |
| [line 1813](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1813) | 0 @ 14                  | <code>student: 0,</code>                                                         |
| [line 1814](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1814) | 0 @ 14                  | <code>retired: 0,</code>                                                         |
| [line 1815](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1815) | 0 @ 23                  | <code>"parent-at-home": 0,</code>                                                |
| [line 1816](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1816) | 0 @ 25                  | <code>"looking-for-work": 0,</code>                                              |
| [line 1819](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1819) | 0 @ 20                  | <code>let workingAge = 0;</code>                                                 |
| [line 1820](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1820) | 0 @ 18                  | <code>let employed = 0;</code>                                                   |
| [line 1823](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1823) | 1 @ 19                  | <code>workingAge += 1;</code>                                                    |
| [line 1825](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1825) | 1 @ 19                  | <code>employed += 1;</code>                                                      |
| [line 1826](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1826) | 1 @ 28                  | <code>byStatus.employed += 1;</code>                                             |
| [line 1829](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-employment.ts#L1829) | 1 @ 72                  | <code>byStatus[status === "employed" ? "looking-for-work" : status] += 1;</code> |

### src/simulation/living-world/local-elections.ts — LOCAL_ELECTIONS_PROFILE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column                            | Exact expression                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| [line 138](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L138) | 28 @ 19                                            | <code>filingLeadDays: 28,</code>                                       |
| [line 139](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L139) | 56 @ 20                                            | <code>primaryLeadDays: 56,</code>                                      |
| [line 140](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L140) | 21 @ 24                                            | <code>minimumCandidateAge: 21,</code>                                  |
| [line 142](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L142) | 0.2 @ 33, 0.45 @ 38, 0.2 @ 44, 0.1 @ 49, 0.05 @ 54 | <code>challengersAgainstIncumbent: [0.2, 0.45, 0.2, 0.1, 0.05],</code> |
| [line 144](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L144) | 0 @ 27, 0.15 @ 30, 0.45 @ 36, 0.25 @ 42, 0.15 @ 48 | <code>candidatesForOpenSeat: [0, 0.15, 0.45, 0.25, 0.15],</code>       |
| [line 146](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L146) | 1.35 @ 18                                          | <code>incumbentEdge: 1.35,</code>                                      |
| [line 148](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L148) | 0.12 @ 19, 0.32 @ 31                               | <code>turnout: { low: 0.12, high: 0.32 },</code>                       |
| [line 150](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L150) | 0.75 @ 15                                          | <code>adultShare: 0.75,</code>                                         |

### src/simulation/living-world/local-elections.ts — SEASONS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| [line 173](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L173) | 6 @ 43                  | <code>"even-year-june-consolidated": { month: 6, years: "even" },</code>      |
| [line 174](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L174) | 8 @ 45                  | <code>"even-year-august-consolidated": { month: 8, years: "even" },</code>    |
| [line 175](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L175) | 5 @ 42                  | <code>"even-year-may-consolidated": { month: 5, years: "even" },</code>       |
| [line 176](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L176) | 11 @ 31                 | <code>"odd-year-autumn": { month: 11, years: "odd" },</code>                  |
| [line 177](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L177) | 4 @ 31                  | <code>"odd-year-spring": { month: 4, years: "odd" },</code>                   |
| [line 178](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L178) | 4 @ 29                  | <code>"spring-annual": { month: 4, years: "every" },</code>                   |
| [line 179](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L179) | 4 @ 32                  | <code>"spring-even-year": { month: 4, years: "even" },</code>                 |
| [line 180](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L180) | 4 @ 35                  | <code>"annual-spring-april": { month: 4, years: "every" },</code>             |
| [line 181](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L181) | 5 @ 33                  | <code>"annual-spring-may": { month: 5, years: "every" },</code>               |
| [line 182](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L182) | 10 @ 37                 | <code>"annual-autumn-october": { month: 10, years: "every" },</code>          |
| [line 183](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L183) | 11 @ 36                 | <code>"autumn-gubernatorial": { month: 11, years: "even" },</code>            |
| [line 184](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L184) | 3 @ 38                  | <code>"town-meeting-day-march": { month: 3, years: "every" },</code>          |
| [line 185](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L185) | 3 @ 39                  | <code>"town-meeting-day-spring": { month: 3, years: "every" },</code>         |
| [line 186](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L186) | 6 @ 39                  | <code>"quadrennial-summer-june": { month: 6, years: "fourth" },</code>        |
| [line 187](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L187) | 8 @ 46                  | <code>"quadrennial-late-summer-august": { month: 8, years: "fourth" },</code> |

### src/simulation/living-world/local-elections.ts — CADENCE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| [line 191](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L191) | 1 @ 10                  | <code>every: 1,</code>  |
| [line 192](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L192) | 2 @ 9                   | <code>even: 2,</code>   |
| [line 193](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L193) | 2 @ 8                   | <code>odd: 2,</code>    |
| [line 194](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L194) | 4 @ 11                  | <code>fourth: 4,</code> |

### src/simulation/living-world/local-elections.ts — pad

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| [line 198](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L198) | 2 @ 33                  | <code>return String(value).padStart(2, "0");</code> |

### src/simulation/living-world/local-elections.ts — firstTuesday

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| [line 202](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L202) | 11 @ 17                 | <code>if (month === 11) return novemberGeneralElectionDay(year);</code> |
| [line 203](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L203) | 1 @ 18, 7 @ 28, 1 @ 38  | <code>for (let day = 1; day &lt;= 7; day += 1) {</code>                 |
| [line 204](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L204) | 1 @ 50                  | <code>const date = new Date(Date.UTC(year, month - 1, day));</code>     |
| [line 205](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L205) | 2 @ 30                  | <code>if (date.getUTCDay() === 2)</code>                                |

### src/simulation/living-world/local-elections.ts — yearFits

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| [line 213](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L213) | 2 @ 39, 0 @ 45          | <code>if (years === "even") return year % 2 === 0;</code> |
| [line 214](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L214) | 2 @ 38, 1 @ 44          | <code>if (years === "odd") return year % 2 === 1;</code>  |
| [line 215](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L215) | 4 @ 17, 0 @ 23          | <code>return year % 4 === 0;</code>                       |

### src/simulation/living-world/local-elections.ts — nextTownElectionDay

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| [line 236](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L236) | 2 @ 21                  | <code>cadenceYears: 2,</code>                                             |
| [line 242](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L242) | 11 @ 35                 | <code>const rule = season ?? { month: 11, years: "odd" as const };</code> |
| [line 244](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L244) | 0 @ 39, 4 @ 42, 1 @ 57  | <code>for (let year = Number(onDate.slice(0, 4)); ; year += 1) {</code>   |

### src/simulation/living-world/local-elections.ts — seatNumber

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| [line 260](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L260) | 1 @ 31                  | <code>return match ? Number(match[1]) : null;</code> |

### src/simulation/living-world/local-elections.ts — seatIsUp

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| [line 270](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L270) | 1 @ 27                  | <code>const cycles = Math.max(1, Math.round(termYears / cadenceYears));</code> |
| [line 272](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L272) | 0 @ 35                  | <code>return (cycle + n) % cycles === 0;</code>                                |

### src/simulation/living-world/local-elections.ts — localCampaignSeat

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| [line 295](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L295) | 0 @ 21                  | <code>if (mayor) return 0;</code>                                                           |
| [line 297](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L297) | 0 @ 44                  | <code>const seatCount = rules?.seats?.value ?? 0;</code>                                    |
| [line 298](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L298) | 4 @ 48                  | <code>const termYears = rules?.termYears?.value ?? 4;</code>                                |
| [line 299](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L299) | 0 @ 42, 4 @ 45          | <code>const year = Number(electionDate.slice(0, 4));</code>                                 |
| [line 300](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L300) | -1 @ 77                 | <code>const { cadenceYears } = nextTownElectionDay(unit, addDays(electionDate, -1));</code> |
| [line 302](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L302) | 1 @ 16, 1 @ 40          | <code>for (let n = 1; n &lt;= seatCount; n += 1)</code>                                     |
| [line 319](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L319) | 0 @ 13                  | <code>return up[0] ?? null;</code>                                                          |

### src/simulation/living-world/local-elections.ts — campaignSeats

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| [line 331](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L331) | 0 @ 55, 4 @ 58          | <code>if (!contest &#124;&#124; Number(contest.electionDate.slice(0, 4)) !== year) continue;</code> |

### src/simulation/living-world/local-elections.ts — withdrawTownRaceForCampaign

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| [line 382](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L382) | 0 @ 43, 4 @ 46          | <code>const year = contest.electionDate.slice(0, 4);</code> |

### src/simulation/living-world/local-elections.ts — pick

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 427](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L427) | 0 @ 71                  | <code>let point = rng.next() * shares.reduce((sum, share) =&gt; sum + share, 0);</code> |
| [line 428](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L428) | 0 @ 20, 1 @ 55          | <code>for (let index = 0; index &lt; shares.length; index += 1) {</code>                |
| [line 430](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L430) | 0 @ 17                  | <code>if (point &lt; 0) return index;</code>                                            |
| [line 432](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L432) | 1 @ 26                  | <code>return shares.length - 1;</code>                                                  |

### src/simulation/living-world/local-elections.ts — unitFromKey

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| [line 526](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L526) | 1 @ 37                  | <code>const unit = governmentUnit(match[1]!);</code>         |
| [line 527](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L527) | 2 @ 37                  | <code>return unit ? { unit, rest: match[2]! } : null;</code> |

### src/simulation/living-world/local-elections.ts — countParts

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------- |
| [line 539](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L539) | 1 @ 37                  | <code>electionDate: makeIsoDate(match[1]!),</code> |
| [line 540](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L540) | 2 @ 24                  | <code>seat: Number(match[2]),</code>               |
| [line 541](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L541) | 3 @ 18                  | <code>stage: match[3] as DueParts["stage"],</code> |

### src/simulation/living-world/local-elections.ts — officeFor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------ |
| [line 553](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L553) | 0 @ 19                  | <code>return seat === 0</code> |

### src/simulation/living-world/local-elections.ts — seatLabelFor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------ |
| [line 562](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L562) | 0 @ 19                  | <code>return seat === 0</code> |

### src/simulation/living-world/local-elections.ts — seatsOf

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------- |
| [line 579](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L579) | 0 @ 22, 0 @ 36          | <code>if (!seats.has(0)) seats.set(0, row);</code> |
| [line 586](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L586) | 1 @ 11                  | <code>let n = 1;</code>                            |
| [line 588](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L588) | 1 @ 31                  | <code>while (seats.has(n)) n += 1;</code>          |

### src/simulation/living-world/local-elections.ts — seatPhrase

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------ |
| [line 596](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L596) | 0 @ 19                  | <code>return seat === 0</code> |

### src/simulation/living-world/local-elections.ts — takeSeat

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| [line 693](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L693) | 0 @ 24                  | <code>roleKind: seat === 0 ? "leader:municipal-mayor" : "leader:municipal-member",</code> |

### src/simulation/living-world/local-elections.ts — scheduleYear

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column          | Exact expression                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| [line 733](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L733) | 0 @ 47, 4 @ 50, 1 @ 56           | <code>const year = Number(world.currentDate.slice(0, 4)) + 1;</code>                  |
| [line 739](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L739) | 1 @ 32, 13 @ 35, 1 @ 59, 29 @ 62 | <code>&#96;${year}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}&#96;,</code> |

### src/simulation/living-world/local-elections.ts — scheduleRace

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                               | Literal value at column | Exact expression                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| [line 817](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L817) | 0 @ 31                  | <code>seatKey: input.seat === 0 ? "chief-executive" : &#96;seat-${input.seat}&#96;,</code> |

### src/simulation/living-world/local-elections.ts — localElectionFilingHandler

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [line 842](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L842)   | 1 @ 41                  | <code>const generalDate = makeIsoDate(match[1]!);</code>                                                                              |
| [line 843](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L843)   | -1 @ 69                 | <code>const day = nextTownElectionDay(unit, addDays(world.currentDate, -1));</code>                                                   |
| [line 846](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L846)   | 0 @ 41, 4 @ 44          | <code>const year = Number(generalDate.slice(0, 4));</code>                                                                            |
| [line 850](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L850)   | 0 @ 14                  | <code>seatIsUp(0, year, day.cadenceYears, chief.termYears.value)</code>                                                               |
| [line 852](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L852)   | 0 @ 18                  | <code>seatsUp.push(0);</code>                                                                                                         |
| [line 853](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L853)   | 0 @ 44                  | <code>const seatCount = rules?.seats?.value ?? 0;</code>                                                                              |
| [line 854](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L854)   | 4 @ 48                  | <code>const termYears = rules?.termYears?.value ?? 4;</code>                                                                          |
| [line 855](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L855)   | 1 @ 16, 1 @ 40          | <code>for (let n = 1; n &lt;= seatCount; n += 1)</code>                                                                               |
| [line 859](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L859)   | 1 @ 32                  | <code>const player = due.entityIds[1];</code>                                                                                         |
| [line 864](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L864)   | 0 @ 15                  | <code>let races = 0;</code>                                                                                                           |
| [line 865](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L865)   | 0 @ 19                  | <code>let primaries = 0;</code>                                                                                                       |
| [line 907](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L907)   | 0 @ 18                  | <code>seat === 0 ? (chief?.termYears.value ?? termYears) : termYears;</code>                                                          |
| [line 910](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L910)   | 0 @ 39                  | <code>const organizationId = seat === 0 ? null : organizationIdFor(next, unit);</code>                                                |
| [line 939](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L939)   | 365.25 @ 66             | <code>termEnds: addDays(generalDate, Math.round(seatTerm * 365.25)),</code>                                                           |
| [line 977](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L977)   | 1 @ 18                  | <code>: Math.max(1, pick(rng, P.candidatesForOpenSeat));</code>                                                                       |
| [line 978](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L978)   | 0 @ 21, 1 @ 47          | <code>for (let slot = 0; slot &lt; filers; slot += 1) {</code>                                                                        |
| [line 994](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L994)   | 0 @ 31                  | <code>if (candidates.length === 0) continue;</code>                                                                                   |
| [line 995](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L995)   | 2 @ 41                  | <code>const primary = candidates.length &gt; 2;</code>                                                                                |
| [line 1007](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1007) | 1 @ 14                  | <code>races += 1;</code>                                                                                                              |
| [line 1008](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1008) | 1 @ 31                  | <code>if (primary) primaries += 1;</code>                                                                                             |
| [line 1012](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1012) | 1 @ 74                  | <code>next = scheduleFiling(next, unit, town, player, addDays(generalDate, 1));</code>                                                |
| [line 1015](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1015) | 1 @ 48                  | <code>&#96;The field closed for ${races} ${races === 1 ? "race" : "races"} in ${unit.name}, ${primaries} with a primary.&#96;,</code> |

### src/simulation/living-world/local-elections.ts — countVotes

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| [line 1041](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1041) | 0 @ 10                  | <code>: [0, roster.households];</code>                                                     |
| [line 1042](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1042) | 0 @ 37, 1 @ 75          | <code>const share = roster.households &gt; 0 ? (to - from) / roster.households : 1;</code> |
| [line 1046](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1046) | 20 @ 25                 | <code>candidates.length * 20,</code>                                                       |
| [line 1050](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1050) | 0.6 @ 18, 0.8 @ 37      | <code>const base = 0.6 + rng.next() * 0.8;</code>                                          |
| [line 1057](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1057) | 0 @ 61                  | <code>const total = support.reduce((sum, value) =&gt; sum + value, 0);</code>              |
| [line 1059](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1059) | 1 @ 14                  | <code>Math.max(1, Math.round((ballots * value) / total)),</code>                           |
| [line 1062](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1062) | 0 @ 16, 1 @ 42          | <code>for (let i = 0; i &lt; votes.length; i += 1)</code>                                  |
| [line 1063](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1063) | 0 @ 18, 1 @ 33, 1 @ 76  | <code>for (let j = 0; j &lt; i; j += 1) if (votes[j] === votes[i]) votes[i]! += 1;</code>  |
| [line 1064](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1064) | 0 @ 61                  | <code>const counted = votes.reduce((sum, value) =&gt; sum + value, 0);</code>              |

### src/simulation/living-world/local-elections.ts — localElectionCountHandler

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [line 1100](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1100) | 0 @ 33                  | <code>const field = living.length &gt; 0 ? living : contest.candidatePersonIds;</code>                                                                                 |
| [line 1118](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1118) | 0 @ 16                  | <code>votes: 0,</code>                                                                                                                                                 |
| [line 1119](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1119) | 0 @ 20                  | <code>voteShare: 0,</code>                                                                                                                                             |
| [line 1123](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1123) | 0 @ 41                  | <code>let winner: EntityId &#124; null = counted[0]!.candidatePersonId;</code>                                                                                         |
| [line 1148](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1148) | 0 @ 33, 2 @ 36          | <code>advancing = counted.slice(0, 2).map((row) =&gt; row.candidatePersonId);</code>                                                                                   |
| [line 1149](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1149) | 0 @ 24                  | <code>winner = counted[0]!.candidatePersonId;</code>                                                                                                                   |
| [line 1179](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1179) | 2 @ 30                  | <code>advancing.length === 2</code>                                                                                                                                    |
| [line 1180](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1180) | 0 @ 39, 1 @ 74          | <code>? &#96;${nameOf(next, advancing[0]!)} and ${nameOf(next, advancing[1]!)} advance from a field of ${contest.candidatePersonIds.length} for ${phrase}.&#96;</code> |
| [line 1183](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1183) | 2 @ 30                  | <code>if (advancing.length === 2) {</code>                                                                                                                             |

### src/simulation/living-world/local-elections.ts — redistrictAfterCensus

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [line 1298](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1298) | 0 @ 47, 4 @ 50          | <code>const year = Number(world.currentDate.slice(0, 4));</code>                                                         |
| [line 1299](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1299) | 10 @ 22, 1 @ 29         | <code>if (!map &#124;&#124; year % 10 !== 1 &#124;&#124; map.drawnAt &gt;= &#96;${year}-01-01&#96;) return world;</code> |
| [line 1305](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1305) | 1 @ 33                  | <code>reason: &#96;after the ${year - 1} census&#96;,</code>                                                             |

### src/simulation/living-world/local-elections.ts — wardMembers

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------ |
| [line 1311](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1311) | 0 @ 32                  | <code>.filter(([seat]) =&gt; seat &gt; 0)</code> |

### src/simulation/living-world/local-elections.ts — localGovernmentYearHandler

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| [line 1355](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1355) | 1 @ 32                  | <code>const player = due.entityIds[1];</code>                                                                |
| [line 1358](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1358) | 0 @ 19                  | <code>let vacancies = 0;</code>                                                                              |
| [line 1372](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1372) | 365 @ 45                | <code>termEnds: addDays(next.currentDate, 365),</code>                                                       |
| [line 1463](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1463) | 0 @ 11                  | <code>0,</code>                                                                                              |
| [line 1506](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1506) | 1 @ 18                  | <code>vacancies += 1;</code>                                                                                 |
| [line 1511](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/local-elections.ts#L1511) | 1 @ 35                  | <code>&#96;${vacancies} ${vacancies === 1 ? "seat" : "seats"} filled in ${unit.name} this year.&#96;,</code> |

### src/simulation/living-world/town-rent.ts — LANDLORD_SHARES

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column         | Exact expression                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| [line 185](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L185) | 0.3 @ 32, 0.66 @ 47, 0.04 @ 61  | <code>"small-apartment": { person: 0.3, business: 0.66, public: 0.04 },</code> |
| [line 186](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L186) | 0.55 @ 23, 0.42 @ 39, 0.03 @ 53 | <code>rowhouse: { person: 0.55, business: 0.42, public: 0.03 },</code>         |
| [line 187](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L187) | 0.78 @ 31, 0.21 @ 47, 0.01 @ 61 | <code>"suburban-house": { person: 0.78, business: 0.21, public: 0.01 },</code> |
| [line 188](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L188) | 0.8 @ 28, 0.2 @ 43, 0 @ 56      | <code>"large-house": { person: 0.8, business: 0.2, public: 0 },</code>         |
| [line 189](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L189) | 0.6 @ 28, 0.4 @ 43, 0 @ 56      | <code>"mobile-home": { person: 0.6, business: 0.4, public: 0 },</code>         |
| [line 190](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L190) | 0.92 @ 32, 0.08 @ 48, 0 @ 62    | <code>"rural-farmhouse": { person: 0.92, business: 0.08, public: 0 },</code>   |

### src/simulation/living-world/town-rent.ts — BEDROOM_SHARES

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column                            | Exact expression                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| [line 201](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L201) | 0.1 @ 23, 0.45 @ 28, 0.37 @ 34, 0.08 @ 40, 0 @ 46  | <code>"small-apartment": [0.1, 0.45, 0.37, 0.08, 0],</code> |
| [line 202](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L202) | 0 @ 14, 0.08 @ 17, 0.42 @ 23, 0.42 @ 29, 0.08 @ 35 | <code>rowhouse: [0, 0.08, 0.42, 0.42, 0.08],</code>         |
| [line 203](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L203) | 0 @ 22, 0.03 @ 25, 0.2 @ 31, 0.55 @ 36, 0.22 @ 42  | <code>"suburban-house": [0, 0.03, 0.2, 0.55, 0.22],</code>  |
| [line 204](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L204) | 0 @ 19, 0 @ 22, 0.05 @ 25, 0.4 @ 31, 0.55 @ 36     | <code>"large-house": [0, 0, 0.05, 0.4, 0.55],</code>        |
| [line 205](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L205) | 0 @ 19, 0.08 @ 22, 0.5 @ 28, 0.4 @ 33, 0.02 @ 38   | <code>"mobile-home": [0, 0.08, 0.5, 0.4, 0.02],</code>      |
| [line 206](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L206) | 0 @ 23, 0.03 @ 26, 0.22 @ 32, 0.5 @ 38, 0.25 @ 43  | <code>"rural-farmhouse": [0, 0.03, 0.22, 0.5, 0.25],</code> |

### src/simulation/living-world/town-rent.ts — RENT_SPREAD

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------- |
| [line 215](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L215) | 0.25 @ 9                | <code>home: 0.25,</code>  |
| [line 216](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L216) | 0.05 @ 10               | <code>world: 0.05,</code> |

### src/simulation/living-world/town-rent.ts — PUBLIC_HOUSING_RENT_OF_INCOME

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| [line 220](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L220) | 0.3 @ 46                | <code>export const PUBLIC_HOUSING_RENT_OF_INCOME = 0.3;</code> |

### src/simulation/living-world/town-rent.ts — PUBLIC_HOUSING_MINIMUM_RENT_MINOR

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| [line 222](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L222) | 5000 @ 50               | <code>export const PUBLIC_HOUSING_MINIMUM_RENT_MINOR = 5_000;</code> |

### src/simulation/living-world/town-rent.ts — PUBLIC_HOUSING_FLAT_RENT_OF_FMR

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| [line 224](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L224) | 0.8 @ 48                | <code>export const PUBLIC_HOUSING_FLAT_RENT_OF_FMR = 0.8;</code> |

### src/simulation/living-world/town-rent.ts — AFFORDABLE_RENT_OF_INCOME

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------- |
| [line 226](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L226) | 0.3 @ 42                | <code>export const AFFORDABLE_RENT_OF_INCOME = 0.3;</code> |

### src/simulation/living-world/town-rent.ts — AFFORDABLE_LIMIT_OF_VERY_LOW

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| [line 228](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L228) | 1.2 @ 45                | <code>export const AFFORDABLE_LIMIT_OF_VERY_LOW = 1.2;</code> |

### src/simulation/living-world/town-rent.ts — HUD_FAMILY_SIZE_FACTORS

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column                                                        | Exact expression                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [line 231](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L231) | 0.7 @ 3, 0.8 @ 8, 0.9 @ 13, 1 @ 18, 1.08 @ 21, 1.16 @ 27, 1.24 @ 33, 1.32 @ 39 | <code>0.7, 0.8, 0.9, 1, 1.08, 1.16, 1.24, 1.32,</code> |

### src/simulation/living-world/town-rent.ts — INCLUSIONARY_SET_ASIDE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| [line 241](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L241) | 0.15 @ 39               | <code>export const INCLUSIONARY_SET_ASIDE = 0.15;</code> |

### src/simulation/living-world/town-rent.ts — RENT_STABILIZATION_CAP

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| [line 249](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L249) | 0.05 @ 53, 0.1 @ 65     | <code>export const RENT_STABILIZATION_CAP = { overPrices: 0.05, most: 0.1 } as const;</code> |

### src/simulation/living-world/town-rent.ts — RENT_STABILIZATION_MEASURED

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------ |
| [line 259](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L259) | 0.8 @ 22                | <code>coveredMovesRatio: 0.8,</code> |

### src/simulation/living-world/town-rent.ts — RENT_STABILIZATION_CITYWIDE

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------- |
| [line 275](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L275) | 0.051 @ 13              | <code>rentRise: 0.051,</code>    |
| [line 276](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L276) | 365 @ 18                | <code>actsAfterDays: 365,</code> |

### src/simulation/living-world/town-rent.ts — rentLawLevel

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| [line 290](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L290) | 1 @ 19                  | <code>if (!id) return 1;</code>                                |
| [line 296](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L296) | 1 @ 12                  | <code>return 1;</code>                                         |
| [line 299](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L299) | 1 @ 30                  | <code>if (now === before) return 1;</code>                     |
| [line 301](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L301) | 1 @ 7                   | <code>? 1 + RENT_STABILIZATION_CITYWIDE.rentRise</code>        |
| [line 302](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L302) | 1 @ 7, 1 @ 12           | <code>: 1 / (1 + RENT_STABILIZATION_CITYWIDE.rentRise);</code> |

### src/simulation/living-world/town-rent.ts — EVICTION

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------ |
| [line 336](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L336) | 2 @ 21                  | <code>fileAtMonthsOwed: 2,</code>                |
| [line 337](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L337) | 3 @ 32                  | <code>conciliatoryLandlordFilesAt: 3,</code>     |
| [line 338](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L338) | 3 @ 36                  | <code>conciliatoryLandlordSettlesUpTo: 3,</code> |
| [line 339](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L339) | 4 @ 24                  | <code>lawyerKeepsHomeUpTo: 4,</code>             |
| [line 340](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L340) | 6 @ 15                  | <code>planMonths: 6,</code>                      |
| [line 341](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L341) | 0.5 @ 19                | <code>planLimitOfPay: 0.5,</code>                |
| [line 342](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L342) | 2 @ 35                  | <code>conciliatoryJudgeGivesTimeUpTo: 2,</code>  |
| [line 344](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L344) | 3 @ 16                  | <code>quietMonths: 3,</code>                     |

### src/simulation/living-world/town-rent.ts — EVICTION_MEASURED

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------- |
| [line 357](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L357) | 0.42 @ 26               | <code>evictedWithoutCounsel: 0.42,</code> |
| [line 358](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L358) | 0.16 @ 23               | <code>evictedWithCounsel: 0.16,</code>    |

### src/simulation/living-world/town-rent.ts — parseRow

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| [line 381](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L381) | 0 @ 14, 0 @ 20          | <code>values[0] ?? 0,</code>                |
| [line 382](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L382) | 1 @ 14, 0 @ 20          | <code>values[1] ?? 0,</code>                |
| [line 383](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L383) | 2 @ 14, 0 @ 20          | <code>values[2] ?? 0,</code>                |
| [line 384](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L384) | 3 @ 14, 0 @ 20          | <code>values[3] ?? 0,</code>                |
| [line 385](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L385) | 4 @ 14, 0 @ 20          | <code>values[4] ?? 0,</code>                |
| [line 387](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L387) | 5 @ 22                  | <code>veryLow4: values[5] ?? null,</code>   |
| [line 388](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L388) | 6 @ 18                  | <code>low4: values[6] ?? null,</code>       |
| [line 389](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L389) | 7 @ 24                  | <code>population: values[7] ?? null,</code> |

### src/simulation/living-world/town-rent.ts — loadRows

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| [line 406](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L406) | 0 @ 29                  | <code>const key = entry.slice(0, split);</code>                        |
| [line 409](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L409) | 1 @ 56                  | <code>list.push([town, parseRow(key, entry.slice(split + 1))]);</code> |

### src/simulation/living-world/town-rent.ts — hudRentRowFor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column                | Exact expression                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| [line 431](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L431) | 0 @ 46                                 | <code>const county = countyGeoidsForPlace(geoid)[0];</code>                             |
| [line 437](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L437) | 0 @ 34                                 | <code>if (!towns &#124;&#124; towns.length === 0) return null;</code>                   |
| [line 438](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L438) | 0 @ 46                                 | <code>const name = (place.displayName.split(",")[0] ?? "").trim().toLowerCase();</code> |
| [line 442](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L442) | 1 @ 25                                 | <code>if (same) return same[1];</code>                                                  |
| [line 443](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L443) | 0 @ 16                                 | <code>let weight = 0;</code>                                                            |
| [line 444](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L444) | 0 @ 18, 0 @ 21, 0 @ 24, 0 @ 27, 0 @ 30 | <code>const rents = [0, 0, 0, 0, 0];</code>                                             |
| [line 445](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L445) | 0 @ 17                                 | <code>let veryLow = 0;</code>                                                           |
| [line 446](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L446) | 0 @ 13                                 | <code>let low = 0;</code>                                                               |
| [line 447](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L447) | 0 @ 21                                 | <code>let limitWeight = 0;</code>                                                       |
| [line 449](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L449) | 1 @ 24, 1 @ 45                         | <code>const w = Math.max(1, row.population ?? 1);</code>                                |
| [line 467](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L467) | 0 @ 29                                 | <code>veryLow4: limitWeight &gt; 0 ? Math.round(veryLow / limitWeight) : null,</code>   |
| [line 468](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L468) | 0 @ 25                                 | <code>low4: limitWeight &gt; 0 ? Math.round(low / limitWeight) : null,</code>           |

### src/simulation/living-world/town-rent.ts — veryLowIncomeLimit

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column   | Exact expression                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| [line 479](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L479) | 1 @ 25                    | <code>const size = Math.max(1, people);</code>                 |
| [line 481](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L481) | 8 @ 13                    | <code>size &lt;= 8</code>                                      |
| [line 483](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L483) | 7 @ 33, 0.08 @ 38, 8 @ 53 | <code>: HUD_FAMILY_SIZE_FACTORS[7] + 0.08 * (size - 8);</code> |

### src/simulation/living-world/town-rent.ts — interpolateFactor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------- |
| [line 490](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L490) | 1 @ 43                  | <code>const a = HUD_FAMILY_SIZE_FACTORS[low - 1]!;</code>  |
| [line 491](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L491) | 1 @ 44                  | <code>const b = HUD_FAMILY_SIZE_FACTORS[high - 1]!;</code> |

### src/simulation/living-world/town-rent.ts — affordableRentMinor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column  | Exact expression                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| [line 504](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L504) | 0 @ 31, 1 @ 35, 1.5 @ 50 | <code>const people = bedrooms === 0 ? 1 : bedrooms * 1.5;</code>                         |
| [line 508](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L508) | 12 @ 75                  | <code>((limit * AFFORDABLE_LIMIT_OF_VERY_LOW * AFFORDABLE_RENT_OF_INCOME) / 12) *</code> |
| [line 509](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L509) | 100 @ 7                  | <code>100,</code>                                                                        |

### src/simulation/living-world/town-rent.ts — normal

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| [line 516](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L516) | 1e-12 @ 22              | <code>const u = Math.max(1e-12, rng.fork("u").next());</code>                |
| [line 518](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L518) | -2 @ 21, 2 @ 49         | <code>return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);</code> |

### src/simulation/living-world/town-rent.ts — pick

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| [line 526](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L526) | 0 @ 67                  | <code>const total = entries.reduce((sum, [, weight]) =&gt; sum + weight, 0);</code> |
| [line 530](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L530) | 0 @ 17                  | <code>if (point &lt; 0) return key;</code>                                          |
| [line 532](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L532) | -1 @ 22, 0 @ 26         | <code>return entries.at(-1)![0];</code>                                             |

### src/simulation/living-world/town-rent.ts — drawBedrooms

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| [line 542](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L542) | 1 @ 26, 0 @ 30, 2 @ 53  | <code>const need = people &lt;= 1 ? 0 : Math.ceil(people / 2);</code>              |
| [line 545](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L545) | 0.25 @ 36               | <code>if (bedrooms &lt; need) weight *= 0.25;</code>                               |
| [line 546](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L546) | 1 @ 27, 0.5 @ 40        | <code>if (bedrooms &gt; need + 1) weight *= 0.5;</code>                            |
| [line 549](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L549) | 0 @ 63                  | <code>const total = weights.reduce((sum, weight) =&gt; sum + weight, 0);</code>    |
| [line 550](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L550) | 0 @ 16, 4 @ 35          | <code>if (total &lt;= 0) return Math.min(4, need);</code>                          |
| [line 552](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L552) | 0 @ 23, 1 @ 65          | <code>for (let bedrooms = 0; bedrooms &lt; weights.length; bedrooms += 1) {</code> |
| [line 554](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L554) | 0 @ 17                  | <code>if (point &lt; 0) return bedrooms;</code>                                    |
| [line 556](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L556) | 4 @ 19                  | <code>return Math.min(4, need);</code>                                             |

### src/simulation/living-world/town-rent.ts — rentPriceLevel

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| [line 569](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L569) | 0 @ 72                  | <code>const base = macroMonthHistory(world, "national", world.currentDate)[0];</code>    |
| [line 570](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L570) | 0 @ 43, 1 @ 53          | <code>if (!now &#124;&#124; !base &#124;&#124; base.priceIndex &lt;= 0) return 1;</code> |

### src/simulation/living-world/town-rent.ts — marketRentMinor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| [line 591](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L591) | 0 @ 34, 4 @ 46          | <code>const fmr = row.rents[Math.max(0, Math.min(4, bedrooms))]!;</code> |
| [line 602](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L602) | 100 @ 32                | <code>return Math.round(dollars) * 100;</code>                           |

### src/simulation/living-world/town-rent.ts — townLeases

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------- |
| [line 661](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L661) | 1 @ 30                  | <code>bedrooms: Number(match[1]),</code>     |
| [line 662](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L662) | 2 @ 21                  | <code>regime: match[2] as RentRegime,</code> |

### src/simulation/living-world/town-rent.ts — termsOn

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| [line 674](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L674) | 1 @ 37, 0 @ 49, 1 @ 61  | <code>for (let index = history.length - 1; index &gt;= 0; index -= 1)</code> |

### src/simulation/living-world/town-rent.ts — PERIODS_PER_YEAR

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------- |
| [line 733](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L733) | 52 @ 11                 | <code>weekly: 52,</code>      |
| [line 734](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L734) | 26 @ 13                 | <code>biweekly: 26,</code>    |
| [line 735](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L735) | 24 @ 16                 | <code>semimonthly: 24,</code> |
| [line 736](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L736) | 12 @ 12                 | <code>monthly: 12,</code>     |

### src/simulation/living-world/town-rent.ts — monthlyPayByPerson

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 764](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L764) | 1 @ 52                  | <code>const perYear = match ? PERIODS_PER_YEAR[match[1]!] : undefined;</code>           |
| [line 770](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L770) | 0 @ 34, 12 @ 78         | <code>(byPerson.get(personId) ?? 0) + (record.amount.minorUnits * perYear) / 12,</code> |

### src/simulation/living-world/town-rent.ts — householdMonthlyIncome

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------- |
| [line 782](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L782) | 0 @ 15                  | <code>let total = 0;</code> |

### src/simulation/living-world/town-rent.ts — townIndex

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                         | Literal value at column | Exact expression                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| [line 941](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L941) | 30 @ 24                 | <code>if (member.age &lt; 30) continue;</code> |

### src/simulation/living-world/town-rent.ts — firstOfNextMonth

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| [line 1041](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1041) | 12 @ 15                 | <code>month === 12</code>                                                  |
| [line 1042](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1042) | 1 @ 19                  | <code>? &#96;${year + 1}-01-01&#96;</code>                                 |
| [line 1043](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1043) | 1 @ 35, 2 @ 47          | <code>: &#96;${year}-${String(month + 1).padStart(2, "0")}-01&#96;,</code> |

### src/simulation/living-world/town-rent.ts — monthsBetween

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| [line 1050](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1050) | 12 @ 22                 | <code>return (ty - fy) * 12 + (tm - fm);</code> |

### src/simulation/living-world/town-rent.ts — endTownLeases

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| [line 1139](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1139) | 0 @ 25                  | <code>if (leases.length === 0) return world;</code> |

### src/simulation/living-world/town-rent.ts — chooseLeaseholder

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| [line 1202](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1202) | 18 @ 61                 | <code>const adults = household.filter((member) =&gt; member.age &gt;= 18);</code> |
| [line 1203](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1203) | 0 @ 25                  | <code>if (adults.length === 0) return null;</code>                                |
| [line 1206](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1206) | -1 @ 26, -1 @ 50        | <code>(pay.get(b.id) ?? -1) - (pay.get(a.id) ?? -1) &#124;&#124;</code>           |
| [line 1209](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1209) | 0 @ 5                   | <code>)[0]!.id;</code>                                                            |

### src/simulation/living-world/town-rent.ts — startTownLeases

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| [line 1234](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1234) | 0 @ 29                  | <code>if (candidates.length === 0) return world;</code>                               |
| [line 1247](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1247) | 0 @ 39, 1 @ 44          | <code>held.set(key, (held.get(key) ?? 0) + 1);</code>                                 |
| [line 1253](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1253) | 0 @ 71, 1 @ 76          | <code>affordableLet.set(lease.town, (affordableLet.get(lease.town) ?? 0) + 1);</code> |
| [line 1301](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1301) | 0 @ 39, 1 @ 44          | <code>held.set(key, (held.get(key) ?? 0) + 1);</code>                                 |
| [line 1310](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1310) | 100 @ 45                | <code>const fmrMinor = row.rents[bedrooms]! * 100;</code>                             |
| [line 1316](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1316) | 0 @ 34                  | <code>affordableLet.get(town) ?? 0,</code>                                            |
| [line 1331](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1331) | 12 @ 16, 100 @ 61       | <code>income * 12 &lt;= limit * AFFORDABLE_LIMIT_OF_VERY_LOW * 100</code>             |
| [line 1335](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1335) | 0 @ 59, 1 @ 64          | <code>affordableLet.set(town, (affordableLet.get(town) ?? 0) + 1);</code>             |
| [line 1358](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1358) | -1 @ 45                 | <code>const from = replaces ? addDays(dueOn, -1) : tenure.startedAt;</code>           |
| [line 1376](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1376) | -1 @ 49                 | <code>const flow = next.history.resourceFlows.at(-1)!;</code>                         |

### src/simulation/living-world/town-rent.ts — bedroomLabel

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| [line 1405](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1405) | 0 @ 23                  | <code>return bedrooms === 0</code>                                        |
| [line 1407](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1407) | 1 @ 42                  | <code>: &#96;${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}&#96;;</code> |

### src/simulation/living-world/town-rent.ts — publicHousingRentMinor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| [line 1416](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1416) | 100 @ 63, 100 @ 70      | <code>Math.round((fmrMinor * PUBLIC_HOUSING_FLAT_RENT_OF_FMR) / 100) * 100;</code>    |
| [line 1419](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1419) | 100 @ 71                | <code>Math.round((monthlyIncomeMinor * PUBLIC_HOUSING_RENT_OF_INCOME) / 100) *</code> |
| [line 1420](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1420) | 100 @ 5                 | <code>100;</code>                                                                     |

### src/simulation/living-world/town-rent.ts — inclusionaryHome

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| [line 1457](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1457) | 0 @ 48                  | <code>row.id.localeCompare(dwelling.id) &lt;= 0)),</code> |

### src/simulation/living-world/town-rent.ts — inclusionarySetAsideOpen

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 1474](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1474) | 1e-9 @ 71               | <code>affordableLet &lt; Math.ceil(coveredHomes * INCLUSIONARY_SET_ASIDE - 1e-9)</code> |

### src/simulation/living-world/town-rent.ts — chooseLandlord

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| [line 1529](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1529) | 0 @ 58                  | <code>const letting = (key: string) =&gt; read.held.get(key) ?? 0;</code>   |
| [line 1535](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1535) | 0 @ 25                  | <code>if (owners.length &gt; 0) {</code>                                    |
| [line 1539](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1539) | -1 @ 32, -1 @ 58        | <code>(read.pay.get(b) ?? -1) - (read.pay.get(a) ?? -1) &#124;&#124;</code> |
| [line 1546](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1546) | 0 @ 22                  | <code>if (firms.length &gt; 0) {</code>                                     |
| [line 1557](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1557) | 0 @ 56                  | <code>const manager = propertyManager(world, town, onDate, 0);</code>       |

### src/simulation/living-world/town-rent.ts — renewedMarketRent

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column    | Exact expression                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| [line 1583](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1583) | 1 @ 14                     | <code>prices - 1 + RENT_STABILIZATION_CAP.overPrices,</code>                        |
| [line 1585](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1585) | 1 @ 45                     | <code>const capped = stabilized && homePrices - 1 &gt; cap;</code>                  |
| [line 1586](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1586) | 100 @ 62, 100 @ 69         | <code>const uncappedMinor = Math.round((oldMinor * homePrices) / 100) * 100;</code> |
| [line 1589](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1589) | 1 @ 33, 100 @ 45, 100 @ 52 | <code>? Math.round((oldMinor * (1 + cap)) / 100) * 100</code>                       |

### src/simulation/living-world/town-rent.ts — renewTownLeases

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column  | Exact expression                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [line 1605](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1605) | 0 @ 25                   | <code>if (leases.length === 0) return world;</code>                                                                                                                    |
| [line 1615](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1615) | 12 @ 18, 12 @ 33, 0 @ 40 | <code>if (months &lt; 12 &#124;&#124; months % 12 !== 0) continue;</code>                                                                                              |
| [line 1616](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1616) | 12 @ 27                  | <code>const year = months / 12;</code>                                                                                                                                 |
| [line 1633](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1633) | 100 @ 76                 | <code>amount = publicHousingRentMinor(income, row.rents[lease.bedrooms]! * 100);</code>                                                                                |
| [line 1638](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1638) | 100 @ 36, 100 @ 43       | <code>amount = Math.round(amount / 100) * 100;</code>                                                                                                                  |
| [line 1641](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1641) | -365 @ 40                | <code>const lastYear = addDays(dueOn, -365);</code>                                                                                                                    |
| [line 1666](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1666) | 100 @ 89, 1 @ 102        | <code>reason = &#96;Rent stabilization under ${designation} held the increase to ${(cap * 100).toFixed(1)}% (the landlord sought ${dollarsOf(uncapped)}).&#96;;</code> |

### src/simulation/living-world/town-rent.ts — dollarsOf

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| [line 1694](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1694) | 100 @ 19                | <code>return (minor / 100).toLocaleString("en-US", {</code> |
| [line 1697](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1697) | 0 @ 28                  | <code>maximumFractionDigits: 0,</code>                      |

### src/simulation/living-world/town-rent.ts — filingsByLease

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 1717](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1717) | 0 @ 28, -1 @ 42         | <code>else if (list.length &gt; 0 && list.at(-1)!.resolvedOn === null)</code>           |
| [line 1718](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1718) | 1 @ 26, -1 @ 45         | <code>list[list.length - 1] = { ...list.at(-1)!, resolvedOn: event.occurredAt };</code> |

### src/simulation/living-world/town-rent.ts — payTownRent

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| [line 1738](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1738) | 0 @ 25                  | <code>if (leases.length === 0) return world;</code>                                    |
| [line 1760](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1760) | 0 @ 49                  | <code>const owed = owedBefore.get(leaseFlowId) ?? 0;</code>                            |
| [line 1799](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1799) | 0 @ 34                  | <code>transferredAmount: money(0, currency),</code>                                    |
| [line 1806](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1806) | 0 @ 30                  | <code>const balance = Math.max(0, position.liquidBalance.minorUnits);</code>           |
| [line 1814](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1814) | 0 @ 52                  | <code>status: paid === rent ? "completed" : paid &gt; 0 ? "partial" : "missed",</code> |
| [line 1821](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1821) | 0 @ 27, 0 @ 63          | <code>const owed = Math.max(0, owedBefore.get(lease.flow.id) ?? 0);</code>             |
| [line 1823](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1823) | 0 @ 18                  | <code>if (toward &gt; 0) {</code>                                                      |
| [line 1844](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1844) | 0 @ 25                  | <code>if (inputs.length === 0) return next;</code>                                     |

### src/simulation/living-world/town-rent.ts — arrearsFlowOwing

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| [line 1878](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1878) | -1 @ 67                 | <code>return { world: next, arrears: next.history.resourceFlows.at(-1)! };</code> |

### src/simulation/living-world/town-rent.ts — actOnArrears

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 1941](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1941) | -1 @ 30, -1 @ 68        | <code>const open = history.at(-1)?.resolvedOn === null ? history.at(-1)! : null;</code> |
| [line 1943](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1943) | 18 @ 63                 | <code>const adults = household.filter((member) =&gt; member.age &gt;= 18);</code>       |
| [line 1946](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1946) | 0 @ 25                  | <code>if (owed.owed === 0) {</code>                                                     |
| [line 1974](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1974) | -1 @ 38                 | <code>const lastResolved = history.at(-1)?.resolvedOn ?? null;</code>                   |

### src/simulation/living-world/town-rent.ts — fileAtMonths

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| [line 1997](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L1997) | 0 @ 63                  | <code>personTrait(world, landlord.personId, "conflict").value &lt; 0</code> |

### src/simulation/living-world/town-rent.ts — (module)

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| [line 2018](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2018) | -1 @ 24, 0 @ 28, 1 @ 32 | <code>readonly judgeLean: -1 &#124; 0 &#124; 1 &#124; null;</code> |

### src/simulation/living-world/town-rent.ts — evictionCaseFacts

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column                 | Exact expression                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| [line 2051](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2051) | 0 @ 36, 0 @ 64                          | <code>const monthsBehind = owed.rent &gt; 0 ? owed.owed / owed.rent : 0;</code>         |
| [line 2055](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2055) | 0 @ 63                                  | <code>personTrait(world, landlord.personId, "conflict").value &lt; 0 &&</code>          |
| [line 2065](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2065) | 0 @ 56                                  | <code>(sum, member) =&gt; sum + (read.pay.get(member.id) ?? 0),</code>                  |
| [line 2066](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2066) | 0 @ 5                                   | <code>0,</code>                                                                         |
| [line 2098](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2098) | 0 @ 71                                  | <code>personTrait(world, lease.leaseholderId, "reliability").value &gt;= 0;</code>      |
| [line 2111](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2111) | 0 @ 45, -1 @ 50, 0 @ 65, 1 @ 69, 0 @ 73 | <code>conflict === null ? null : conflict &lt; 0 ? -1 : conflict &gt; 0 ? 1 : 0,</code> |

### src/simulation/living-world/town-rent.ts — decideEvictionCase

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| [line 2121](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2121) | -1 @ 40                 | <code>const lenient = facts.judgeLean === -1;</code> |

### src/simulation/living-world/town-rent.ts — recordEvictionNotice

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| [line 2232](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2232) | -1 @ 38                 | <code>eventId: next.history.events.at(-1)!.id,</code> |

### src/simulation/living-world/town-rent.ts — rentOwedMinor

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------- |
| [line 2293](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2293) | 0 @ 14                  | <code>let owed = 0;</code>             |
| [line 2303](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2303) | 0 @ 19                  | <code>return Math.max(0, owed);</code> |

### src/simulation/living-world/town-rent.ts — rentOwedByLeaseholder

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| [line 2317](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2317) | 0 @ 48                  | <code>return lease ? rentOwedMinor(world, lease) : 0;</code> |

### src/simulation/living-world/town-rent.ts — openEvictionCase

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| [line 2342](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2342) | -1 @ 62                 | <code>const open = filingsByLease(world).get(lease.flow.id)?.at(-1);</code> |

### src/simulation/living-world/town-rent.ts — canPayRentOwed

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------- |
| [line 2375](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2375) | 0 @ 12                  | <code>owed &gt; 0 &&</code> |

### src/simulation/living-world/town-rent.ts — payRentOwed

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| [line 2418](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2418) | 0 @ 16                  | <code>if (owed === 0 &#124;&#124; !terms &#124;&#124; arrearsPaidOn(world, lease, onDate)) return world;</code> |
| [line 2425](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2425) | 0 @ 42                  | <code>const toward = Math.min(owed, Math.max(0, position.liquidBalance.minorUnits));</code>                     |
| [line 2426](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2426) | 0 @ 18                  | <code>if (toward === 0) return world;</code>                                                                    |
| [line 2446](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2446) | -1 @ 61                 | <code>const open = filingsByLease(paid).get(lease.flow.id)?.at(-1);</code>                                      |
| [line 2450](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2450) | 18 @ 38                 | <code>).filter((member) =&gt; member.age &gt;= 18);</code>                                                      |

### src/simulation/living-world/town-rent.ts — moveOutBeforeHearing

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------- |
| [line 2470](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2470) | 18 @ 38                 | <code>).filter((member) =&gt; member.age &gt;= 18);</code> |

### src/simulation/living-world/town-rent.ts — bedroomHome

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------- |
| [line 2485](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2485) | 0 @ 29                  | <code>return lease.bedrooms === 0</code> |

### src/simulation/living-world/town-rent.ts — householdName

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| [line 2502](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2502) | 0 @ 32, 1 @ 63          | <code>return midSentence ? &#96;${name[0]!.toLowerCase()}${name.slice(1)}&#96; : name;</code> |

### src/simulation/living-world/town-rent.ts — rentEvent

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| [line 2550](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2550) | -1 @ 43                 | <code>const eventId = next.history.events.at(-1)!.id;</code> |

### src/simulation/living-world/town-rent.ts — endTenancy

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| [line 2579](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2579) | -1 @ 27                 | <code>eventId: h.events.at(-1)!.id,</code> |

### src/simulation/living-world/town-rent.ts — median

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| [line 2649](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2649) | 0 @ 25                  | <code>if (values.length === 0) return null;</code>          |
| [line 2651](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2651) | 1 @ 35                  | <code>const middle = sorted.length &gt;&gt; 1;</code>       |
| [line 2652](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2652) | 2 @ 26                  | <code>return sorted.length % 2</code>                       |
| [line 2654](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2654) | 1 @ 24, 2 @ 49          | <code>: (sorted[middle - 1]! + sorted[middle]!) / 2;</code> |

### src/simulation/living-world/town-rent.ts — townRentSnapshot

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                           | Literal value at column | Exact expression                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| [line 2678](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2678) | 0 @ 13                  | <code>person: 0,</code>                                                               |
| [line 2679](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2679) | 0 @ 15                  | <code>business: 0,</code>                                                             |
| [line 2680](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2680) | 0 @ 13                  | <code>public: 0,</code>                                                               |
| [line 2683](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2683) | 0 @ 13                  | <code>market: 0,</code>                                                               |
| [line 2684](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2684) | 0 @ 13                  | <code>public: 0,</code>                                                               |
| [line 2685](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2685) | 0 @ 17                  | <code>affordable: 0,</code>                                                           |
| [line 2690](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2690) | 0 @ 14                  | <code>let paid = 0;</code>                                                            |
| [line 2691](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2691) | 0 @ 15                  | <code>let short = 0;</code>                                                           |
| [line 2692](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2692) | 0 @ 17                  | <code>let unknown = 0;</code>                                                         |
| [line 2694](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2694) | 1 @ 64                  | <code>byLandlord[landlordKindOf(world, lease.flow.recipient)] += 1;</code>            |
| [line 2695](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2695) | 1 @ 31                  | <code>byRegime[lease.regime] += 1;</code>                                             |
| [line 2701](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2701) | 1 @ 15                  | <code>paid += 1;</code>                                                               |
| [line 2704](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2704) | 1 @ 16                  | <code>short += 1;</code>                                                              |
| [line 2705](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2705) | 1 @ 56                  | <code>else if (outcome?.status === "blocked") unknown += 1;</code>                    |
| [line 2710](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2710) | 0 @ 37                  | <code>if (income !== null && income &gt; 0)</code>                                    |
| [line 2722](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2722) | 0 @ 24                  | <code>burdens.length &gt; 0</code>                                                    |
| [line 2723](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/living-world/town-rent.ts#L2723) | 0.3 @ 47                | <code>? burdens.filter((burden) =&gt; burden &gt; 0.3).length / burdens.length</code> |

### src/simulation/resource-income.ts — PERIODS

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                | Literal value at column | Exact expression              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------- |
| [line 22](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L22) | 260 @ 10                | <code>daily: 260,</code>      |
| [line 23](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L23) | 52 @ 11                 | <code>weekly: 52,</code>      |
| [line 24](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L24) | 26 @ 13                 | <code>biweekly: 26,</code>    |
| [line 25](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L25) | 24 @ 16                 | <code>semimonthly: 24,</code> |
| [line 26](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L26) | 12 @ 12                 | <code>monthly: 12,</code>     |
| [line 27](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L27) | 4 @ 14                  | <code>quarterly: 4,</code>    |
| [line 28](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L28) | 1 @ 13                  | <code>annually: 1,</code>     |

### src/simulation/resource-income.ts — payPeriodsPerYear

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                | Literal value at column | Exact expression     |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------- |
| [line 34](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L34) | 1 @ 9                   | <code>)?.[1];</code> |

### src/simulation/resource-income.ts — monthlyIncomeByPerson

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                  | Literal value at column       | Exact expression                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------- |
| [line 84](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L84)   | 0 @ 49                        | <code>amounts.set(person, (amounts.get(person) ?? 0) + amount);</code>    |
| [line 99](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L99)   | 365.25 @ 51                   | <code>(outcome.transferredAmount.minorUnits * 365.25) /</code>            |
| [line 100](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L100) | 12 @ 14                       | <code>(12 * daysBetween(options.since, onDate)),</code>                   |
| [line 125](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L125) | 12 @ 59                       | <code>add(flow, (latest!.amount.minorUnits * periods) / 12);</code>       |
| [line 129](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L129) | -30 @ 36                      | <code>const since = addDays(onDate, -30);</code>                          |
| [line 141](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/resource-income.ts#L141) | 365.25 @ 51, 12 @ 62, 30 @ 67 | <code>(outcome.transferredAmount.minorUnits * 365.25) / (12 * 30),</code> |

### src/simulation/living-world/town-compensation.ts — settleTownCompensations

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| [line 108](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L108) | 0 @ 62                  | <code>balance === undefined ? due : Math.min(due, Math.max(0, balance));</code> |
| [line 118](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L118) | 0 @ 31                  | <code>status: moved &gt; 0 ? ("partial" as const) : ("missed" as const),</code> |

### src/simulation/living-world/town-compensation.ts — applyMinimumAtPeriod

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| [line 179](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L179) | 2 @ 5                   | <code>2;</code>                                                                     |
| [line 180](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L180) | 52 @ 58                 | <code>let amount = Math.round((setting.hourlyMinor * hours * 52) / periods);</code> |
| [line 203](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L203) | 100 @ 36, 40 @ 52       | <code>Math.round((floor.annual * 100 * hours) / (40 * periods)),</code>             |

### src/simulation/living-world/town-compensation.ts — compensationPlan

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                                 | Literal value at column | Exact expression                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [line 271](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L271) | 2 @ 7                   | <code>2</code>                                                                                                                                                                                                         |
| [line 272](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L272) | 0 @ 7                   | <code>: 0;</code>                                                                                                                                                                                                      |
| [line 303](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L303) | 1 @ 51                  | <code>historySequenceExclusive: worked.sequence + 1,</code>                                                                                                                                                            |
| [line 319](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L319) | 60 @ 68                 | <code>? Math.round((setting.hourlyMinor * path.sessionMinutes) / 60)</code>                                                                                                                                            |
| [line 320](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L320) | 0 @ 11                  | <code>: 0;</code>                                                                                                                                                                                                      |
| [line 379](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L379) | 0 @ 20                  | <code>let jailedDays = 0;</code>                                                                                                                                                                                       |
| [line 381](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L381) | 1 @ 74                  | <code>for (let date = periodStart; date &lt;= periodEnd; date = addDays(date, 1)) {</code>                                                                                                                             |
| [line 383](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L383) | 0 @ 39                  | <code>workdaysBetween(date, date) &gt; 0 &&</code>                                                                                                                                                                     |
| [line 387](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L387) | 1 @ 23                  | <code>jailedDays += 1;</code>                                                                                                                                                                                          |
| [line 390](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L390) | 0 @ 27                  | <code>absence && workdays &gt; 0 && !jobPaysSickLeave(world, workId)</code>                                                                                                                                            |
| [line 392](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L392) | 0 @ 9                   | <code>: 0;</code>                                                                                                                                                                                                      |
| [line 416](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L416) | 0 @ 52                  | <code>.reduce((sum, missed) =&gt; sum + missed.minutes, 0);</code>                                                                                                                                                     |
| [line 417](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L417) | 60 @ 45, 5 @ 62         | <code>const paidMinutes = role ? (weeklyHours * 60 * workdays) / 5 : null;</code>                                                                                                                                      |
| [line 419](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L419) | 0 @ 34                  | <code>paidMinutes && paidMinutes &gt; 0</code>                                                                                                                                                                         |
| [line 424](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L424) | 0 @ 9                   | <code>: 0;</code>                                                                                                                                                                                                      |
| [line 426](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L426) | 0 @ 20, 0 @ 44          | <code>unpaidDays === 0 && idTripFraction === 0</code>                                                                                                                                                                  |
| [line 435](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L435) | 0 @ 52, 0 @ 78          | <code>const caring = !!absence && absence.caringDays &gt; 0 && absence.sickDays === 0;</code>                                                                                                                          |
| [line 439](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L439) | 0 @ 33                  | <code>absence && sickUnpaidDays &gt; 0</code>                                                                                                                                                                          |
| [line 444](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L444) | 0 @ 9                   | <code>: 0;</code>                                                                                                                                                                                                      |
| [line 446](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L446) | 0 @ 19                  | <code>coveredDays &gt; 0 ? residenceStateKey(world, recipientId) : null;</code>                                                                                                                                        |
| [line 454](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L454) | 0 @ 60                  | <code>caring: absence!.seriousOwnDaysSinceOnset.length === 0,</code>                                                                                                                                                   |
| [line 470](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L470) | 0 @ 22, 0 @ 46          | <code>unpaidDays === 0 && idTripFraction === 0</code>                                                                                                                                                                  |
| [line 472](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L472) | 0 @ 31                  | <code>: amount.minorUnits &gt; 0</code>                                                                                                                                                                                |
| [line 478](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L478) | 0 @ 22, 0 @ 46          | <code>unpaidDays === 0 && idTripFraction === 0</code>                                                                                                                                                                  |
| [line 480](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L480) | 0 @ 28                  | <code>: idTripFraction &gt; 0</code>                                                                                                                                                                                   |
| [line 482](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L482) | 0 @ 26                  | <code>: jailedDays &gt; 0</code>                                                                                                                                                                                       |
| [line 488](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L488) | 0 @ 22, 0 @ 46          | <code>unpaidDays === 0 && idTripFraction === 0</code>                                                                                                                                                                  |
| [line 490](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L490) | 0 @ 28                  | <code>: idTripFraction &gt; 0</code>                                                                                                                                                                                   |
| [line 492](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-compensation.ts#L492) | 1 @ 77, 0 @ 112         | <code>: &#96;Pay for the period, less ${unpaidDays} unpaid ${unpaidDays === 1 ? "day" : "days"} ${jailedDays &gt; 0 ? "in custody or otherwise absent" : caring ? "home with a sick child" : "out sick"}.&#96;,</code> |

### src/simulation/living-world/town-pay.ts — HOURS_PER_YEAR

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------ |
| [line 119](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L119) | 2080 @ 24               | <code>const HOURS_PER_YEAR = 2_080;</code> |

### src/simulation/living-world/town-pay.ts — CATCH_UP_LIMIT_DAYS

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------------- |
| [line 121](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L121) | 400 @ 29                | <code>const CATCH_UP_LIMIT_DAYS = 400;</code> |

### src/simulation/living-world/town-pay.ts — PERIODS_PER_YEAR

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------- |
| [line 134](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L134) | 52 @ 11                 | <code>weekly: 52,</code>      |
| [line 135](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L135) | 26 @ 13                 | <code>biweekly: 26,</code>    |
| [line 136](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L136) | 24 @ 16                 | <code>semimonthly: 24,</code> |
| [line 137](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L137) | 12 @ 12                 | <code>monthly: 12,</code>     |

### src/simulation/living-world/town-pay.ts — PERCENTILE_POINTS

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column                     | Exact expression                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------- |
| [line 142](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L142) | 10 @ 28, 25 @ 32, 50 @ 36, 75 @ 40, 90 @ 44 | <code>const PERCENTILE_POINTS = [10, 25, 50, 75, 90] as const;</code> |

### src/simulation/living-world/town-pay.ts — townPayAreas

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------- |
| [line 195](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L195) | 0 @ 18, 2 @ 21          | <code>geoid?.slice(0, 2) ??</code>                                              |
| [line 202](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L202) | 0 @ 54                  | <code>const county = geoid ? countyGeoidsForPlace(geoid)[0] : undefined;</code> |

### src/simulation/living-world/town-pay.ts — townPayPercentile

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column                   | Exact expression                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| [line 216](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L216) | 25 @ 20, 50 @ 25, 1 @ 39, 0 @ 51, 20 @ 69 | <code>const byTenure = 25 + 50 * Math.min(1, Math.max(0, tenureYears) / 20);</code> |
| [line 217](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L217) | 90 @ 19, 10 @ 32, 2 @ 55, 1 @ 59, 15 @ 64 | <code>return Math.min(90, Math.max(10, byTenure + (draw * 2 - 1) * 15));</code>     |

### src/simulation/living-world/town-pay.ts — interpolate

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------- |
| [line 222](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L222) | 0 @ 16, 1 @ 23, 1 @ 58  | <code>for (let i = 0; i + 1 &lt; PERCENTILE_POINTS.length; i += 1) {</code> |
| [line 224](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L224) | 1 @ 40                  | <code>const high = PERCENTILE_POINTS[i + 1]!;</code>                        |
| [line 227](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L227) | 1 @ 25                  | <code>const b = cells[i + 1];</code>                                        |

### src/simulation/living-world/town-pay.ts — stateMedianAnnualWage

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------ |
| [line 271](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L271) | 50 @ 65                 | <code>const median = byArea.get(area)?.[PERCENTILE_POINTS.indexOf(50)];</code> |

### src/simulation/living-world/town-pay.ts — townJobRate

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------- |
| [line 309](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L309) | 100 @ 59                | <code>hourlyMinor: Math.round(Math.max(hourly, minimum) * 100),</code> |

### src/simulation/living-world/town-pay.ts — sizeGroup

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------------------- |
| [line 362](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L362) | 10 @ 15                 | <code>if (staff &lt; 10) return "1–9";</code>       |
| [line 363](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L363) | 20 @ 15                 | <code>if (staff &lt; 20) return "10–19";</code>     |
| [line 364](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L364) | 50 @ 15                 | <code>if (staff &lt; 50) return "20–49";</code>     |
| [line 365](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L365) | 100 @ 15                | <code>if (staff &lt; 100) return "50–99";</code>    |
| [line 366](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L366) | 250 @ 15                | <code>if (staff &lt; 250) return "100–249";</code>  |
| [line 367](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L367) | 500 @ 15                | <code>if (staff &lt; 500) return "250–499";</code>  |
| [line 368](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L368) | 1000 @ 15               | <code>if (staff &lt; 1000) return "500–999";</code> |

### src/simulation/living-world/town-pay.ts — townPayPeriod

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------- |
| [line 393](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L393) | 0 @ 35                  | <code>const base = overall[name] ?? 0;</code>                                       |
| [line 395](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L395) | 0 @ 15                  | <code>base &lt;= 0</code>                                                           |
| [line 396](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L396) | 0 @ 11                  | <code>? 0</code>                                                                    |
| [line 400](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L400) | 0 @ 67                  | <code>const total = weights.reduce((sum, [, weight]) =&gt; sum + weight, 0);</code> |
| [line 407](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L407) | 0 @ 16                  | <code>if (roll &lt; 0) return PERIOD_OF_BLS[name]!;</code>                          |

### src/simulation/living-world/town-pay.ts — lastDayOfMonth

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| [line 418](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L418) | 0 @ 47                  | <code>const last = new Date(Date.UTC(year, month, 0)).getUTCDate();</code>                         |
| [line 420](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L420) | 2 @ 39, 2 @ 72          | <code>&#96;${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}&#96;,</code> |

### src/simulation/living-world/town-pay.ts — payPeriodEndingOn

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------- |
| [line 431](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L431) | 5 @ 27                  | <code>if (weekday(date) !== 5) return null;</code>                                            |
| [line 434](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L434) | 7 @ 56                  | <code>daysBetween(makeIsoDate("2000-01-07"), date) / 7,</code>                                |
| [line 436](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L436) | 2 @ 29, 0 @ 35          | <code>if ((weeks + phase) % 2 !== 0) return null;</code>                                      |
| [line 439](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L439) | -6 @ 54, -13 @ 59       | <code>startsAt: addDays(date, period === "weekly" ? -6 : -13),</code>                         |
| [line 444](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L444) | 8 @ 33, 10 @ 36         | <code>const day = Number(date.slice(8, 10));</code>                                           |
| [line 445](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L445) | 15 @ 43                 | <code>if (period === "semimonthly" && day === 15)</code>                                      |
| [line 446](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L446) | 0 @ 50, 8 @ 53          | <code>return { startsAt: makeIsoDate(&#96;${date.slice(0, 8)}01&#96;), endsAt: date };</code> |
| [line 451](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L451) | 0 @ 37, 8 @ 40          | <code>? makeIsoDate(&#96;${date.slice(0, 8)}16&#96;)</code>                                   |
| [line 452](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L452) | 0 @ 37, 8 @ 40          | <code>: makeIsoDate(&#96;${date.slice(0, 8)}01&#96;),</code>                                  |

### src/simulation/living-world/town-pay.ts — nextPaydayDate

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------- |
| [line 459](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L459) | 1 @ 16, 7 @ 24, 1 @ 32  | <code>for (let n = 1; n &lt;= 7; n += 1) {</code>    |
| [line 462](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L462) | 5 @ 25                  | <code>weekday(next) === 5 &#124;&#124;</code>        |
| [line 463](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L463) | 8 @ 18, 10 @ 21         | <code>next.slice(8, 10) === "15" &#124;&#124;</code> |

### src/simulation/living-world/town-pay.ts — weeklyHoursOf

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------ |
| [line 563](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L563) | 2 @ 42                  | <code>return (minimumHours + maximumHours) / 2;</code> |

### src/simulation/living-world/town-pay.ts — termsByPayFlow

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------- |
| [line 593](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L593) | 0 @ 24                  | <code>if (terms.length &gt; 0) byFlow.set(flow.id, terms);</code> |

### src/simulation/living-world/town-pay.ts — termsOn

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------- |
| [line 603](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L603) | 1 @ 37, 0 @ 49, 1 @ 61  | <code>for (let index = history.length - 1; index &gt;= 0; index -= 1)</code> |

### src/simulation/living-world/town-pay.ts — payNoteOf

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------- |
| [line 621](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L621) | 1 @ 19                  | <code>period: match[1] as TownPayPeriod,</code> |
| [line 622](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L622) | 2 @ 25, 0 @ 31          | <code>phase: Number(match[2] ?? 0),</code>      |

### src/simulation/living-world/town-pay.ts — startTownJobPay

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [line 653](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L653) | 0 @ 71, 1 @ 76          | <code>staff.set(work.organizationId, (staff.get(work.organizationId) ?? 0) + 1);</code>                                                                                                                                                                                                                                                                                                                                                                                             |
| [line 682](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L682) | -31 @ 38                | <code>const earliest = addDays(since, -31);</code>                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| [line 690](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L690) | 365.25 @ 60             | <code>const tenure = daysBetween(work.startedAt, startsAt) / 365.25;</code>                                                                                                                                                                                                                                                                                                                                                                                                         |
| [line 716](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L716) | 0 @ 35, 100 @ 40        | <code>floorMinor: (minimum ?? 0) * 100,</code>                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [line 727](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L727) | 0 @ 66                  | <code>const floorHourlyMinor = floor ? floorHourlyMinorOf(floor) : 0;</code>                                                                                                                                                                                                                                                                                                                                                                                                        |
| [line 736](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L736) | 1 @ 38                  | <code>staff.get(organizationId) ?? 1,</code>                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [line 745](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L745) | 2 @ 25                  | <code>.next() * 2,</code>                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [line 747](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L747) | 0 @ 11                  | <code>: 0;</code>                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [line 750](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L750) | 52 @ 36                 | <code>(hourlyMinor * weeklyHours * 52) / PERIODS_PER_YEAR[period],</code>                                                                                                                                                                                                                                                                                                                                                                                                           |
| [line 752](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L752) | 0 @ 22                  | <code>if (perPeriod &lt;= 0) continue;</code>                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [line 766](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L766) | 100 @ 55, 2 @ 68        | <code>note: &#96;${TOWN_PAY_VERSION}: $${(hourlyMinor / 100).toFixed(2)} an hour${hourlyMinor &gt; rate.hourlyMinor ? " (the state's minimum teacher salary)" : rate.floored ? " (the minimum wage)" : ""}${gap && hourlyMinor === rate.hourlyMinor ? &#96;, ${UNCOVERED_PAY_NOTE}&#96; : ""} for ${weeklyHours} hours a week, paid ${period}; the ${Math.round(rate.percentile)}th percentile for SOC ${rate.soc} in OEWS area ${rate.area} (${TOWN_PAY_META.wages}).&#96;,</code> |

### src/simulation/living-world/town-pay.ts — raiseTownPayToMinimum

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------- |
| [line 835](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L835) | 0 @ 19                  | <code>laws.size === 0 &&</code>                                                 |
| [line 865](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L865) | -1 @ 49                 | <code>let current = termsByFlow.get(flow.id)?.at(-1);</code>                    |
| [line 877](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L877) | 1 @ 32                  | <code>let day = addDays(after, 1);</code>                                       |
| [line 879](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L879) | 1 @ 26                  | <code>day = addDays(day, 1)</code>                                              |
| [line 881](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L881) | -1 @ 57                 | <code>if (!payPeriodEndingOn(note.period, addDays(day, -1), note.phase))</code> |
| [line 899](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L899) | 100 @ 44                | <code>const hourly = setting.hourlyMinor / 100;</code>                          |
| [line 903](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L903) | 100 @ 30, 52 @ 51       | <code>(Math.round(hourly * 100) * weeklyHours * 52) /</code>                    |
| [line 912](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L912) | 2 @ 39                  | <code>const rate = &#96;$${hourly.toFixed(2)} an hour&#96;;</code>              |
| [line 930](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L930) | -1 @ 52                 | <code>current = next.history.resourceFlowTerms.at(-1)!;</code>                  |

### src/simulation/living-world/town-pay.ts — floorHourlyMinorOf

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                        | Literal value at column | Exact expression                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------- |
| [line 965](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L965) | 100 @ 55                | <code>return Math.round((floor.annual / HOURS_PER_YEAR) * 100);</code> |

### src/simulation/living-world/town-pay.ts — raiseTeacherPayToFloor

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                          | Literal value at column | Exact expression                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| [line 1007](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1007) | -1 @ 49                 | <code>let current = termsByFlow.get(flow.id)?.at(-1);</code>                    |
| [line 1017](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1017) | 1 @ 32                  | <code>let day = addDays(after, 1);</code>                                       |
| [line 1019](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1019) | 1 @ 26                  | <code>day = addDays(day, 1)</code>                                              |
| [line 1021](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1021) | -1 @ 57                 | <code>if (!payPeriodEndingOn(note.period, addDays(day, -1), note.phase))</code> |
| [line 1028](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1028) | 52 @ 52                 | <code>(floorHourlyMinorOf(floor) * weeklyHours * 52) /</code>                   |
| [line 1051](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1051) | -1 @ 52                 | <code>current = next.history.resourceFlowTerms.at(-1)!;</code>                  |

### src/simulation/living-world/town-pay.ts — payTownPaydays

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                          | Literal value at column | Exact expression                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------- |
| [line 1072](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1072) | 0 @ 24                  | <code>if (flows.length === 0) return world;</code> |
| [line 1084](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1084) | 1 @ 38                  | <code>let onDate = addDays(earliest, 1);</code>    |
| [line 1086](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1086) | 1 @ 32                  | <code>onDate = addDays(onDate, 1)</code>           |

### src/simulation/living-world/town-pay.ts — townHourlyPayCents

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                                          | Literal value at column | Exact expression                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------- |
| [line 1124](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1124) | 0 @ 21                  | <code>if (held.size === 0) return [];</code> |
| [line 1138](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1138) | 0 @ 18                  | <code>if (hours &lt;= 0) continue;</code>    |
| [line 1142](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/living-world/town-pay.ts#L1142) | 52 @ 12                 | <code>(52 * hours),</code>                   |

### src/simulation/job-market.ts — JOB_TIMING

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| [line 100](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L100) | 7 @ 37, 28 @ 49         | <code>recruitmentWindowDays: { minimum: 7, maximum: 28 },</code> |
| [line 101](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L101) | 3 @ 30, 7 @ 42          | <code>offerReplyDays: { minimum: 3, maximum: 7 },</code>         |

### src/simulation/job-market.ts — JOB_MARKET_PLACEHOLDER

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| [line 115](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L115) | 0.08 @ 16               | <code>offerSpread: 0.08,</code>                             |
| [line 120](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L120) | 2 @ 28, 7 @ 40          | <code>decisionDays: { minimum: 2, maximum: 7 },</code>      |
| [line 125](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L125) | 1 @ 29, 7 @ 41          | <code>startLeadDays: { minimum: 1, maximum: 7 },</code>     |
| [line 127](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L127) | 2 @ 25                  | <code>missedStartGraceDays: 2,</code>                       |
| [line 132](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L132) | 3 @ 33, 7 @ 45          | <code>followUpStartDays: { minimum: 3, maximum: 7 },</code> |
| [line 134](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L134) | 30 @ 18                 | <code>fullTimeHours: 30,</code>                             |

### src/simulation/job-market.ts — JOB_TURNOVER

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column      | Exact expression                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| [line 153](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L153) | 0.033 @ 26                   | <code>monthlySeparationRate: 0.033,</code>                             |
| [line 154](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L154) | 6789100 @ 36, 340110988 @ 48 | <code>localGovernmentStaffPerResident: 6_789_100 / 340_110_988,</code> |
| [line 159](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L159) | 91 @ 20                      | <code>newEmployerDays: 91,</code>                                      |

### src/simulation/job-market.ts — PUBLIC_BODY_ROLE_PLACEHOLDER

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| [line 173](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L173) | 2164 @ 16               | <code>hourlyMinor: 2164,</code>                                   |
| [line 174](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L174) | 37 @ 32, 40 @ 50        | <code>weeklyHours: { minimumHours: 37, maximumHours: 40 },</code> |

### src/simulation/job-market.ts — MINIMUM_APPLICANT_AGE

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| [line 181](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L181) | 16 @ 38                 | <code>export const MINIMUM_APPLICANT_AGE = 16;</code> |

### src/simulation/job-market.ts — WEEK_DAYS

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------- |
| [line 193](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L193) | 7 @ 19                  | <code>const WEEK_DAYS = 7;</code> |

### src/simulation/job-market.ts — CATCH_UP_LIMIT_WEEKS

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| [line 194](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L194) | 520 @ 30                | <code>const CATCH_UP_LIMIT_WEEKS = 520;</code> |

### src/simulation/job-market.ts — annualFromTerms

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| [line 238](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L238) | 12 @ 20                 | <code>return minor * 12;</code>                                    |
| [line 239](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L239) | 52 @ 53                 | <code>if (cadence === "schedule:weekly") return minor * 52;</code> |

### src/simulation/job-market.ts — townEmployerRoles

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| [line 288](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L288) | 52 @ 11                 | <code>52 *</code>                                                                   |
| [line 289](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L289) | 2 @ 78                  | <code>((role.weeklyHours.minimumHours + role.weeklyHours.maximumHours) / 2),</code> |
| [line 297](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L297) | 1 @ 13                  | <code>1,</code>                                                                     |
| [line 303](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L303) | 1 @ 11                  | <code>: 1,</code>                                                                   |
| [line 332](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L332) | 0 @ 37, 1 @ 42          | <code>holders: (entry?.holders ?? 0) + 1,</code>                                    |

### src/simulation/job-market.ts — activeRole

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------- |
| [line 379](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L379) | -1 @ 20                 | <code>return roles.at(-1) ?? null;</code> |

### src/simulation/job-market.ts — staffPay

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| [line 400](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L400) | 0 @ 38                  | <code>if (annual === null &#124;&#124; annual &lt;= 0) continue;</code> |

### src/simulation/job-market.ts — append

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------- |
| [line 425](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L425) | 1 @ 50                  | <code>nextSequence: world.history.nextSequence + 1,</code> |

### src/simulation/job-market.ts — recordJobOpening

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| [line 445](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L445) | 0 @ 35                  | <code>input.pay.amount.minorUnits &lt; 0</code> |

### src/simulation/job-market.ts — note

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| [line 531](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L531) | -1 @ 58                 | <code>return { world: next, eventId: next.history.events.at(-1)!.id };</code> |

### src/simulation/job-market.ts — latestApplicationStep

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| [line 558](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L558) | -1 @ 53                 | <code>return applicationSteps(world, applicationId).at(-1) ?? null;</code> |

### src/simulation/job-market.ts — roleComesOpen

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| [line 749](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L749) | 0 @ 25                  | <code>listings.length === 0 &&</code>                                                    |
| [line 756](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L756) | 52 @ 5, 12 @ 11, 1 @ 62 | <code>52 / (12 * JOB_TURNOVER.monthlySeparationRate * Math.max(1, role.holders)),</code> |

### src/simulation/job-market.ts — offerTerms

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| [line 776](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L776) | -1 @ 10                 | <code>.at(-1);</code>                                                                  |
| [line 781](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L781) | 1 @ 33, 1 @ 74          | <code>const spread = wentUnfilled ? 1 + JOB_MARKET_PLACEHOLDER.offerSpread : 1;</code> |
| [line 788](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L788) | 50000 @ 46              | <code>roundTo(role.annualMinor * spread, 50_000),</code>                               |
| [line 796](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L796) | 2 @ 71                  | <code>(role.weeklyHours.minimumHours + role.weeklyHours.maximumHours) / 2;</code>      |
| [line 799](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L799) | 52 @ 33, 5 @ 63         | <code>roundTo((role.annualMinor / 52 / fullTimeHours) * spread, 5),</code>             |

### src/simulation/job-market.ts — openWeeklyListings

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                             | Literal value at column | Exact expression                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| [line 833](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L833) | 2 @ 64                  | <code>: Math.ceil(JOB_TIMING.recruitmentWindowDays.maximum / 2),</code> |

### src/simulation/job-market.ts — payPhrase

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [line 1125](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1125) | 100 @ 43                | <code>const dollars = pay.amount.minorUnits / 100;</code>                                                                          |
| [line 1127](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1127) | 0 @ 73                  | <code>return &#96;$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })} a year&#96;;</code>                            |
| [line 1128](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1128) | 2 @ 79, 2 @ 105         | <code>const amount = &#96;$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&#96;;</code> |

### src/simulation/job-market.ts — daysInLine

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| [line 1161](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1161) | 0 @ 14                  | <code>let days = 0;</code>                                              |
| [line 1179](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1179) | 0 @ 22                  | <code>days += Math.max(0, daysBetween(work.startedAt, endedAt));</code> |

### src/simulation/job-market.ts — beginWork

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| [line 1473](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1473) | -1 @ 51                 | <code>const work = next.history.workRelationships.at(-1)!;</code> |
| [line 1481](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1481) | 52 @ 52                 | <code>? Math.round(opening.pay.amount.minorUnits / 52)</code>     |

### src/simulation/job-market.ts — hireAtAdultStart

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| [line 1602](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1602) | 19 @ 67                 | <code>if (!person &#124;&#124; ageOnDate(person.birthDate, world.currentDate) &lt; 19)</code> |
| [line 1604](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1604) | 0 @ 60                  | <code>if (activeWorkRelationshipsAt(world, person.id).length &gt; 0) return world;</code>     |
| [line 1614](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1614) | -1 @ 10                 | <code>.at(-1);</code>                                                                         |
| [line 1616](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1616) | 18 @ 33                 | <code>dateAtAge(person.birthDate, 18),</code>                                                 |
| [line 1618](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1618) | 1 @ 41                  | <code>...(lastEnded ? [addDays(lastEnded, 1)] : []),</code>                                   |
| [line 1621](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1621) | -1 @ 10                 | <code>.at(-1)!;</code>                                                                        |
| [line 1642](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1642) | 35 @ 41, 45 @ 59        | <code>expectedWeekly: { minimumHours: 35, maximumHours: 45 },</code>                          |
| [line 1651](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1651) | -1 @ 51                 | <code>const work = next.history.workRelationships.at(-1)!;</code>                             |
| [line 1660](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1660) | 12 @ 27, 52 @ 33        | <code>Math.round((monthly * 12) / 52),</code>                                                 |
| [line 1661](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1661) | 40 @ 5                  | <code>40,</code>                                                                              |

### src/simulation/job-market.ts — retireSupersededFirstJob

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| [line 1746](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1746) | 18 @ 67                 | <code>if (!person &#124;&#124; ageOnDate(person.birthDate, world.currentDate) &lt; 18)</code> |

### src/simulation/job-market.ts — payFirstJob

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [line 1819](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1819) | 2 @ 74                  | <code>const hours = Math.round((weekly.minimumHours + weekly.maximumHours) / 2);</code>                                                                                    |
| [line 1831](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1831) | 100 @ 127, 2 @ 140      | <code>&#96;A first job, paid weekly from ${world.currentDate} for ${hours} hours at the minimum wage where it is, $${(hourlyMinor / 100).toFixed(2)} an hour.&#96;,</code> |

### src/simulation/job-market.ts — advanceApplication

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| [line 1846](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1846) | 0 @ 20, 6 @ 31, 1 @ 43  | <code>for (let guard = 0; guard &lt; 6; guard += 1) {</code>         |
| [line 1862](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1862) | 1 @ 46                  | <code>occurredAt: addDays(latest.replyBy!, 1),</code>                |
| [line 1874](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1874) | 1 @ 44                  | <code>const occurredAt = addDays(missedOn, 1);</code>                |
| [line 1880](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1880) | 0 @ 63                  | <code>rivalsFor(next, application, occurredAt).length === 0);</code> |

### src/simulation/job-market.ts — raiseWeeklyPayToMinimum

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [line 1966](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1966) | 2 @ 49                  | <code>const hours = (minimumHours + maximumHours) / 2;</code>                           |
| [line 1967](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1967) | 0 @ 16                  | <code>if (hours &lt;= 0) return world;</code>                                           |
| [line 1979](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1979) | 1 @ 13                  | <code>week += 1</code>                                                                  |
| [line 1981](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1981) | 1 @ 54                  | <code>const weekStart = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);</code>          |
| [line 1992](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L1992) | 100 @ 45, 2 @ 58        | <code>const rate = &#96;$${(setting.hourlyMinor / 100).toFixed(2)} an hour&#96;;</code> |
| [line 2010](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2010) | -1 @ 50                 | <code>current = next.history.resourceFlowTerms.at(-1)!;</code>                          |

### src/simulation/job-market.ts — settleWeeklyRecordedPay

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| [line 2044](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2044) | 0 @ 21                  | <code>let paidWeeks = 0;</code>                                                     |
| [line 2048](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2048) | 1 @ 74                  | <code>daysBetween(flow.startsAt, outcome.periodStartsAt) / WEEK_DAYS + 1;</code>    |
| [line 2055](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2055) | 1 @ 15                  | <code>) + 1</code>                                                                  |
| [line 2056](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2056) | 1 @ 11                  | <code>: 1;</code>                                                                   |
| [line 2057](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2057) | 1 @ 44                  | <code>const firstWeek = Math.max(paidWeeks + 1, firstNewWeek);</code>               |
| [line 2062](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2062) | 1 @ 15                  | <code>week += 1</code>                                                              |
| [line 2064](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2064) | 1 @ 61                  | <code>const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);</code> |
| [line 2068](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2068) | -1 @ 54                 | <code>if (!isActiveOn(next, work.id, addDays(dueOn, -1))) break;</code>             |
| [line 2075](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2075) | -1 @ 44                 | <code>const periodEndsAt = addDays(dueOn, -1);</code>                               |

### src/simulation/job-market.ts — settleHouseholdAdultJobPay

Pinned source: `1e1651136c316661a42cbd5d83c9a614eab19823`.

| Source location                                                                                                                               | Literal value at column | Exact expression                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| [line 2102](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2102) | 18 @ 69                 | <code>if (!child &#124;&#124; ageOnDate(child.birthDate, earliestDueExclusive) &gt;= 18)</code>      |
| [line 2107](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2107) | 1 @ 26                  | <code>if (primary.length !== 1) return world;</code>                                                 |
| [line 2109](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2109) | 0 @ 60                  | <code>for (const adultId of peopleInHouseholdAt(world, primary[0]!.household.id)) {</code>           |
| [line 2112](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2112) | 18 @ 66                 | <code>if (!adult &#124;&#124; ageOnDate(adult.birthDate, next.currentDate) &lt; 18) continue;</code> |
| [line 2124](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2124) | 18 @ 45                 | <code>ageOnDate(child.birthDate, dueOn) &lt; 18 &&</code>                                            |
| [line 2127](https://github.com/lamontaes/Political-Game-Git/blob/1e1651136c316661a42cbd5d83c9a614eab19823/src/simulation/job-market.ts#L2127) | -1 @ 37                 | <code>asOfDate: addDays(dueOn, -1),</code>                                                           |

### src/simulation/living-world/labor-decision.ts — unit

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                            | Literal value at column | Exact expression                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| [line 30](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L30) | 0 @ 42, 1 @ 54          | <code>const unit = (value: number) =&gt; Math.max(0, Math.min(1, value));</code> |

### src/simulation/living-world/labor-decision.ts — sigmoid

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                            | Literal value at column | Exact expression                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| [line 31](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L31) | 1 @ 36, 1 @ 41          | <code>const sigmoid = (value: number) =&gt; 1 / (1 + Math.exp(-value));</code> |

### src/simulation/living-world/labor-decision.ts — laborDemand

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                            | Literal value at column                 | Exact expression                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| [line 37](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L37) | 1 @ 26                                  | <code>const needs = Math.max(1, input.householdMonthlyNeedsMinor);</code>                     |
| [line 38](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L38) | 0 @ 28                                  | <code>const support = Math.max(0, input.otherHouseholdIncomeMinor);</code>                    |
| [line 39](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L39) | 1 @ 27                                  | <code>const ownPay = Math.max(1, input.expectedMonthlyPayMinor);</code>                       |
| [line 42](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L42) | 0 @ 38                                  | <code>const schoolHoursNeeded = Math.max(0, input.schoolHours);</code>                        |
| [line 44](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L44) | 1 @ 27                                  | <code>financialNecessity + (1 - financialNecessity) * commitment;</code>                      |
| [line 46](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L46) | 40 @ 46                                 | <code>schoolHoursNeeded / (schoolHoursNeeded + 40 * independentNeed);</code>                  |
| [line 49](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L49) | 5 @ 26, 20 @ 30, 80 @ 44, 8 @ 62        | <code>const remainingYears = 5 + 20 * sigmoid((80 - input.age) / 8);</code>                   |
| [line 51](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L51) | 0 @ 14                                  | <code>Math.max(0, input.retirementMonthlyIncomeMinor) +</code>                                |
| [line 52](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L52) | 0 @ 14, 12 @ 40                         | <code>Math.max(0, input.savingsMinor) / (12 * remainingYears) +</code>                        |
| [line 59](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L59) | 65 @ 21, 2 @ 26, 1 @ 31, 4 @ 47, 3 @ 73 | <code>(input.age - (65 + 2 * (1 - physical) - 4 * health * physical)) / 3,</code>             |
| [line 62](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L62) | 1 @ 6, 0.2 @ 10                         | <code>(1 - 0.2 * commitment);</code>                                                          |
| [line 64](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L64) | 0 @ 14                                  | <code>Math.max(0, input.childcareMonthlyCostMinor) /</code>                                   |
| [line 65](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L65) | 0 @ 24                                  | <code>(ownPay + Math.max(0, input.childcareMonthlyCostMinor));</code>                         |
| [line 67](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L67) | 0 @ 14                                  | <code>Math.max(0, input.caregivingHours) /</code>                                             |
| [line 68](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L68) | 0 @ 15, 40 @ 43                         | <code>(Math.max(0, input.caregivingHours) + 40 * financialNecessity);</code>                  |
| [line 72](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L72) | 0.5 @ 6, 0.5 @ 12                       | <code>(0.5 + 0.5 * childcareBurden) *</code>                                                  |
| [line 73](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L73) | 0.5 @ 6, 0.5 @ 12                       | <code>(0.5 + 0.5 * unit(input.caregivingPreference));</code>                                  |
| [line 74](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L74) | 0 @ 26                                  | <code>const hours = Math.max(0, input.employerHours);</code>                                  |
| [line 80](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L80) | 1 @ 6, 0.5 @ 10                         | <code>(1 - 0.5 * health * physical);</code>                                                   |
| [line 90](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L90) | 1 @ 62, 1 @ 69, 0 @ 73, 0 @ 77          | <code>const principalActivity = [...allocation].sort((a, b) =&gt; b[1] - a[1])[0]![0];</code> |

### src/simulation/living-world/labor-decision.ts — townLaborPlan

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                              | Literal value at column         | Exact expression                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------- |
| [line 212](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L212) | 0 @ 73                          | <code>const membership = householdMembershipsAt(world, resident.personId)[0];</code>         |
| [line 223](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L223) | 5 @ 70                          | <code>person && ageOnDate(person.birthDate, world.currentDate) &lt; 5,</code>                |
| [line 234](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L234) | 0 @ 55, 0 @ 59                  | <code>.reduce((sum, id) =&gt; sum + (forecast.get(id) ?? 0), 0);</code>                      |
| [line 240](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L240) | 0 @ 30                          | <code>const occupation = works[0]?.role.occupationClassification ?? "";</code>               |
| [line 242](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L242) | 0.8 @ 9                         | <code>? 0.8</code>                                                                           |
| [line 244](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L244) | 0.6 @ 11                        | <code>? 0.6</code>                                                                           |
| [line 245](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L245) | 0.15 @ 11                       | <code>: 0.15;</code>                                                                         |
| [line 255](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L255) | 1 @ 42, 0.6 @ 73, 0 @ 79        | <code>limitation === "incapacitated" ? 1 : limitation === "limited" ? 0.6 : 0,</code>        |
| [line 257](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L257) | 0 @ 8                           | <code>}, 0);</code>                                                                          |
| [line 260](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L260) | 0.5 @ 39, 2 @ 66, 4 @ 71        | <code>reliability.recordId === null ? 0.5 : (reliability.value + 2) / 4;</code>              |
| [line 271](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L271) | 1 @ 11                          | <code>? 1</code>                                                                             |
| [line 273](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L273) | 0.75 @ 13                       | <code>? 0.75</code>                                                                          |
| [line 275](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L275) | 0.5 @ 15                        | <code>? 0.5</code>                                                                           |
| [line 276](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L276) | 0.25 @ 15                       | <code>: 0.25;</code>                                                                         |
| [line 278](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L278) | 0.5 @ 9                         | <code>? 0.5 +</code>                                                                         |
| [line 280](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L280) | 1 @ 13                          | <code>? 1</code>                                                                             |
| [line 282](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L282) | -1 @ 16                         | <code>? -1</code>                                                                            |
| [line 283](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L283) | 0 @ 15                          | <code>: 0) *</code>                                                                          |
| [line 285](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L285) | 2 @ 11                          | <code>2</code>                                                                               |
| [line 286](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L286) | 0.5 @ 9                         | <code>: 0.5;</code>                                                                          |
| [line 290](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L290) | 0 @ 7                           | <code>0,</code>                                                                              |
| [line 294](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L294) | 36 @ 61, 0 @ 66                 | <code>const schoolHours = resident.enrolled ? actualSchool &#124;&#124; 36 : 0;</code>       |
| [line 301](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L301) | 0 @ 9                           | <code>0,</code>                                                                              |
| [line 304](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L304) | 0 @ 42, 98 @ 46, 3 @ 72         | <code>actualCare &#124;&#124; (youngest === null ? 0 : 98 * Math.exp(-youngest / 3));</code> |
| [line 307](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L307) | 0 @ 27                          | <code>let childcareWeekly = 0;</code>                                                        |
| [line 318](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L318) | 2 @ 65                          | <code>preschool + (infant - preschool) * Math.exp(-youngest / 2);</code>                     |
| [line 330](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L330) | 18 @ 70                         | <code>ageOnDate(world.people[id]!.birthDate, world.currentDate) &gt;= 18,</code>             |
| [line 334](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L334) | 100 @ 75                        | <code>(workResearch.retirementCashEstimate.nationalConditionalMedianUsd * 100) /</code>      |
| [line 335](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L335) | 1 @ 18                          | <code>Math.max(1, adults);</code>                                                            |
| [line 342](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L342) | 1 @ 27, 0 @ 50, 10 @ 70         | <code>const coveredCareer = 1 - Math.exp(-Math.max(0, longestCareer) / 10);</code>           |
| [line 345](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L345) | 1 @ 32, 35 @ 51                 | <code>expectedPay * Math.min(1, longestCareer / 35),</code>                                  |
| [line 347](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L347) | 128600 @ 29, 774900 @ 38        | <code>bendPointsMinor: [128_600, 774_900],</code>                                            |
| [line 348](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L348) | 9000 @ 32, 3200 @ 38, 1500 @ 44 | <code>factorsBasisPoints: [9000, 3200, 1500],</code>                                         |
| [line 358](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L358) | 12 @ 9                          | <code>12,</code>                                                                             |
| [line 365](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L365) | 52 @ 53, 12 @ 59                | <code>childcareMonthlyCostMinor: (childcareWeekly * 52) / 12,</code>                         |
| [line 370](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L370) | 40 @ 22                         | <code>employerHours: 40,</code>                                                              |
| [line 374](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L374) | 0 @ 55                          | <code>if (!pay.has(resident.personId) && works.length &gt; 0)</code>                         |
| [line 378](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L378) | 0 @ 18                          | <code>(works[0]!.role.timeDemand.expectedWeekly.minimumHours +</code>                        |
| [line 379](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L379) | 0 @ 19                          | <code>works[0]!.role.timeDemand.expectedWeekly.maximumHours)) /</code>                       |
| [line 380](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L380) | 80 @ 11                         | <code>80,</code>                                                                             |

### src/simulation/living-world/labor-decision.ts — recordedPaidCareerYears

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                              | Literal value at column | Exact expression                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------- |
| [line 402](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L402) | 0 @ 18                  | <code>for (let i = 0; i &lt; states.length; i++) {</code>                 |
| [line 407](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L407) | 1 @ 30                  | <code>const end = states[i + 1]?.effectiveAt ?? world.currentDate;</code> |
| [line 412](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L412) | 0 @ 19                  | <code>let totalDays = 0,</code>                                           |
| [line 430](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/living-world/labor-decision.ts#L430) | 365.25 @ 22             | <code>return totalDays / 365.25;</code>                                   |

### src/simulation/election-turnout.ts — ELECTION_YEAR_TURNOUT_RATIOS

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                               | Literal value at column | Exact expression                 |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------- |
| [line 7](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L7) | 0.91 @ 17               | <code>presidential: 0.91,</code> |
| [line 8](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L8) | 0.72 @ 12               | <code>midterm: 0.72,</code>      |
| [line 9](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L9) | 0.39 @ 13               | <code>offCycle: 0.39,</code>     |

### src/simulation/election-turnout.ts — electionYearKind

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                 | Literal value at column | Exact expression                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------- |
| [line 14](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L14) | 4 @ 17, 0 @ 23          | <code>return year % 4 === 0</code> |
| [line 16](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L16) | 2 @ 14, 0 @ 20          | <code>: year % 2 === 0</code>      |

### src/simulation/election-turnout.ts — electionTurnout

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                 | Literal value at column                | Exact expression                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| [line 32](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L32) | 1 @ 5, 2 @ 9, 0 @ 31, 1 @ 43, 0.5 @ 72 | <code>1 - 2 * Math.abs(Math.max(0, Math.min(1, input.democraticShare)) - 0.5);</code> |
| [line 33](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L33) | 1 @ 22, 0.05 @ 26                      | <code>const engagement = 1 + 0.05 * competitive;</code>                               |
| [line 35](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L35) | 0 @ 5                                  | <code>0,</code>                                                                       |
| [line 37](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L37) | 1 @ 7                                  | <code>1,</code>                                                                       |

### src/simulation/election-turnout.ts — electionLawTurnoutChange

Pinned source: `48631f388627f5697db79a3719b240f5d10bc457`.

| Source location                                                                                                                                 | Literal value at column | Exact expression                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| [line 70](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L70) | 0.015 @ 25              | <code>registrationChange: 0.015 * change(LAW_KEYS.automaticRegistration),</code> |
| [line 71](https://github.com/lamontaes/Political-Game-Git/blob/48631f388627f5697db79a3719b240f5d10bc457/src/simulation/election-turnout.ts#L71) | 0 @ 27                  | <code>identificationChange: 0 * change(LAW_KEYS.photoIdentification),</code>     |

### src/simulation/press/outlets.ts — DAILY_TOWN_RANK

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                | Literal value at column | Exact expression                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| [line 384](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/press/outlets.ts#L384) | 1000 @ 25               | <code>const DAILY_TOWN_RANK = 1_000;</code> |

### src/simulation/press/outlets.ts — WEEKLY_PROFILE_INDEX

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                | Literal value at column | Exact expression                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------- |
| [line 385](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/press/outlets.ts#L385) | 1 @ 30                  | <code>const WEEKLY_PROFILE_INDEX = 1;</code> |

### src/simulation/press/outlets.ts — DAILY_PROFILE_INDEX

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                | Literal value at column | Exact expression                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| [line 386](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/press/outlets.ts#L386) | 2 @ 29                  | <code>const DAILY_PROFILE_INDEX = 2;</code> |

### src/simulation/outcome-web/place-outcome-store.ts — areaResidents

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                  | Literal value at column | Exact expression                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| [line 243](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L243) | 0 @ 26, 1 @ 63          | <code>return [pair.slice(0, colon), Number(pair.slice(colon + 1))];</code>             |
| [line 247](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L247) | 3 @ 60                  | <code>const stateKey = state ? STATE_POPULATION_KEYS[key.slice(3)] : undefined;</code> |

### src/simulation/outcome-web/place-outcome-store.ts — localWeights

Pinned source: `cdffc19020cb17c29cd556ea33697299475d2bd5`.

| Source location                                                                                                                                                  | Literal value at column | Exact expression                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| [line 285](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L285) | 0 @ 23                  | <code>if (counties.size &gt; 0) {</code>                                               |
| [line 288](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L288) | 0 @ 70                  | <code>const county = /^\d{7}$/.test(key) ? countyGeoidsForPlace(key)[0] : null;</code> |
| [line 291](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L291) | 0 @ 53                  | <code>inCounty.set(county, (inCounty.get(county) ?? 0) + people);</code>               |
| [line 296](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L296) | 0 @ 19, 0 @ 35          | <code>if (state === 0 && people === 0) {</code>                                        |
| [line 297](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L297) | 0 @ 24                  | <code>weights.set(key, 0);</code>                                                      |
| [line 300](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L300) | 0 @ 19                  | <code>if (!(state &gt; 0))</code>                                                      |
| [line 305](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L305) | 0 @ 18, 0 @ 76          | <code>? Math.max(0, people - (inCounty.get(key.slice("county:".length)) ?? 0))</code>  |
| [line 313](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L313) | 0 @ 5                   | <code>0,</code>                                                                        |
| [line 315](https://github.com/lamontaes/Political-Game-Git/blob/cdffc19020cb17c29cd556ea33697299475d2bd5/src/simulation/outcome-web/place-outcome-store.ts#L315) | 1 @ 15                  | <code>if (total &gt; 1)</code>                                                         |

### Zero-literal scope entry

`src/simulation/fairness-pay-law.ts` at `48631f388627f5697db79a3719b240f5d10bc457` contains no TypeScript numeric literals. Its removal and missing employer model are described above.
