# Six follow-on jobs have research packets and explicit evidence gaps

The six requested handbacks are read and queued below, after outgoing homelessness. Treasury seasonality, health-cost mechanisms and federal notice/appeal rules have inspected evidence. Broad housing effects and several exact place laws remain open. These packets support scoped research review and owner planning; they do not certify all-place production readiness or authorize another team's files.

## Queue and implementing routes

| Priority | Requested packet                                                                       | Route to implementing owners                                           | Research state                                                                                                 |
| -------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 0        | Outgoing homelessness                                                                  | Team 1, coordinator, housing/world-record owners; Team 5 for knowledge | Companion packet has broad observations and bounded intervention estimates; person writer and calibration open |
| 1        | Build 9 steps 2–4: federal money, tax reactions, treasury realism                      | Public-budget owners, Build 12 successor and Team 2 legislative writer | Treasury seasonality verified; program allocation and exact tax authority open                                 |
| 2        | Build 10 steps 1–4: new homes, set-asides, supply, moves                               | Housing/rent owner and Team 3 population/money owner                   | Construction semantics identified; broad U.S. effect evidence and exact local terms open                       |
| 3        | Build 21 steps 1–3: coverage loss, notice, retirement income                           | Health-coverage owner, money owner, Journal owner and Team 5 knowledge | Cost studies and federal notice floor inspected; national calibration and state rules open                     |
| 4        | Build 25 steps 1–4: county/parish elections, changing households, charters, ward votes | Team 3 and election owner, coordinating Team 1 released readers        | Place laws and voter records required; national shares cannot fill legal cells                                 |
| 5        | Build 27 step 4: rulings, news, appeals                                                | Judiciary owner, Team 5 news, Team 8 wording                           | Federal routes inspected; state/territory routes and news attention open                                       |
| 6        | Research 3 steps 1–5: favors, confidants, promises, Journal/death/heir, proof          | Favor/commitment owner, hiring/ties owner, Journal/succession owner    | Source/design handoff read; hand-set decay and inheritance weights excluded                                    |

The coordinator assigns a current implementing owner as a lane frees up. Historical Build numbers identify the source handbacks; they do not create new teams. This queue is communicated in 00. Team 9 owns research paths only and never merges. Team 6 transportation, session-end and parks work is excluded.

## 1. Federal money and governor tax responses

Source: [Build 9 FINAL, September 29, 12:20 p.m.](https://docs.google.com/document/d/1Kzp_EvvyPzJLcHatoEGNsGWbHWVIqB6r6Ssd8r_hWjs/edit). The handback reports no open PR. Its historical watched Utah figures are simulation receipts, not real-world fiscal observations.

**Step 2, federal money to states.** Coordinate `src/simulation/public-budgets/month.ts` and `rules.ts` with the budget owner. Use actual program transfers, eligibility, matching requirements, appropriations and payment dates. Treasury functional outlays are not wholly transfers to states: health includes payments to people/providers, and transportation or education can pay other recipients. A single proportional change across all functional lines would invent allocation unless the budget's grant share is sourced. Preserve payer/recipient identity and the triggering law, reconcile both books and avoid counting the existing federal-aid law factor twice.

Existing `data/research/money/public-budget-bases.json` has broad Census/NASBO revenue and spending anchors. Its 1.1506 factor is a 2025 all-funds-to-2022 spending calibration, not an inflation index or grant formula. Program-specific federal-to-state/territory allocation remains unresearched here. Medicaid match and territorial caps require exact applicable law; unrelated federal cuts cannot automatically reduce every state's grant by the same percentage.

**Step 3, a governor responds with a tax bill.** Reuse existing state legislative writers and tax questions. The governor's principles, obligations, resources and recorded budget gap should produce a reasoned proposal. The legislature and signature route still decide the law. Exact state constitutional tax limits, voting requirements, tax base, effective date and exemptions constrain each proposal. No researched universal gap-to-tax coefficient was found. Smooth fiscal pressure is a design input; no automatic tax increase or threshold is supplied by this packet.

**Step 4, seasonality, growth and debt ceiling.** A fresh [Monthly Treasury Statement Table 1 API read](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1?filter=record_date:eq:2025-09-30&page%5Bsize%5D=1000) contains complete fiscal 2024 and 2025 monthly totals. Select each fiscal-year parent and its twelve `MTH` children, excluding headers and year-to-date rows. Dollar totals sum to the reported annual receipts: $4,918,105,525,514.85 and $5,234,616,386,315.43. The following shares are derived observations, rounded to three decimals, not proposed game coefficients.

| Fiscal month | FY 2024 receipt share | FY 2025 receipt share |
| ------------ | --------------------: | --------------------: |
| October      |                8.203% |                6.242% |
| November     |                5.588% |                5.765% |
| December     |                8.729% |                8.681% |
| January      |                9.705% |                9.806% |
| February     |                5.513% |                5.663% |
| March        |                6.752% |                7.023% |
| April        |               15.782% |               16.241% |
| May          |                6.581% |                7.092% |
| June         |                9.480% |               10.057% |
| July         |                6.718% |                6.466% |
| August       |                6.233% |                6.578% |
| September    |               10.715% |               10.386% |

April's observed share is 15.782%–16.241%, versus an even twelfth of 8.333%. February and November are about 5.5%–5.8%. Two years demonstrate seasonality but do not characterize a complete long-run distribution. Use a longer inspected series before fitting a broad starting spread. Each tax type has different timing; changes in annual receipts also reflect legislation, collections and nominal incomes. Do not equate the two-year receipts change with real GDP growth or a causal tax elasticity.

The ceiling applies to debt subject to the statutory limit, not simply the handback's debt-held-by-the-public series. Reconcile debt definitions and lawful financing before implementing consequences. The [debt-limit statute](https://www.law.cornell.edu/uscode/text/31/3101) was fetched, but a dated January 2026 ceiling and extraordinary-measures record were not established. No arbitrary instant default or debt-to-spending multiplier is authorized.

## 2. Homes, set-asides, supply and moves

Source: [Build 10 FINAL, 12:10 p.m.](https://docs.google.com/document/d/1bNRKlD1Rl45sIpnK492mkscI4qb-JLQllKHIGcDHBq8/edit). The handback reports no open PR.

1. `town-homes.ts` should record actual new homes, with permits, starts, completion dates, financing, capacity and location. The existing lease writer can fill completed rental units. Verify the unit and denominator of the new-large-buildings outcome in the place-outcome data; buildings are not housing units, and permissions are not completions. Census building-permit and construction-completion series are the next primary acquisition; no uniform one-year lag is approved here.
2. Inclusionary requirements apply to covered construction after the law's effective date, subject to exact local terms. `createDwelling` materialization time is not a construction date. The inherited 15% set-aside is not a national legal requirement. Research each applicable ordinance's percentage, project minimum, tenure, affordability level, exemptions, alternatives, duration and enforcement. Preserve existing units and historical leases.
3. `marketRentLevel` should read actual supply and demand without applying another copy of the same supply channel. The cited San Francisco rent-control and Minneapolis observations are individual-city evidence; Auckland or São Paulo cannot stand in for every U.S. place. Broad U.S. reform estimates must identify scope, lag, outcome and counterfactual before calibration.
4. A renter's move decision should read their actual lease advantage, cash, job, household, available alternatives and moving costs. The inherited aggregate renter-moves value of 0.80 is not a person's probability. No replacement relocation coefficient is supplied.

Attempted broad primary sources: [Urban Institute, Land Use Reforms and Housing Costs](https://www.urban.org/research/publication/land-use-reforms-and-housing-costs) and [Grounded Solutions inclusionary-housing inventory](https://groundedsolutions.org/resources/inclusionary-housing-in-the-united-states-prevalence-practices-and-production-in-local-jurisdictions-as-of-2019/). Pages and attempted full PDFs returned HTTP 403. No access bypass was used and remembered headline numbers were not admitted. These are concrete evidence gaps, not production-ready anchors. Coordinate Team 6's housing area when it opens rather than duplicate its authority survey.

## 3. Coverage loss costs a person through care and bills

Sources: [Build 21 FINAL, 12:15 p.m.](https://docs.google.com/document/d/1j07sO6cL_EDBTXx3abbYV1VM1LuucFVeUEnspdAwESg/edit) and [12:20 p.m. addendum](https://docs.google.com/document/d/1cyLGyGI5sdPSsx3b49Fs4svOMwwQTVV6R8W8ZCuaLAk/edit). The addendum reports the Journal illness wording change and no new financial mechanism.

**Step 1.** In `health-coverage.ts`, losing coverage should alter the payer for actual covered care, premiums, bills, debt and treatment choices. Read other coverage and household resources. Do not create a flat debt charge on the loss date.

[Sommers and colleagues, Arkansas work-requirement follow-up](https://pmc.ncbi.nlm.nih.gov/articles/PMC7497731/), 2020, gives descriptive observations for low-income adults ages 30–49 disenrolled in the prior twelve months, 117 respondents, versus 376 continuously covered respondents. Mean medical debt was $2,261 versus $1,752. Among disenrolled respondents, 49.8% reported serious debt-payment problems, 55.9% delayed care and 63.8% delayed medication. The authors expressly classify affordability findings as descriptive. Debt bins use lower-bound imputation, and disenrollment is not wholly attributable to work requirements. The $509 difference is neither a causal estimate nor a national per-person fee.

[Baicker and colleagues, Oregon Medicaid experiment](https://pmc.ncbi.nlm.nih.gov/articles/PMC3701298/), 2013, Table 4, uses lottery assignment to estimate coverage effects among enrollment compliers. About two-year follow-up includes 12,229 survey respondents; cost questions cover the prior year.

| Estimated coverage-gain outcome        | Control mean | Effect and 95% confidence interval        |
| -------------------------------------- | -----------: | ----------------------------------------- |
| Annual out-of-pocket spending          |      $552.80 | −$215.35; −$408.75 to −$21.95             |
| Any medical debt                       |        56.8% | −13.28 percentage points; −21.59 to −4.96 |
| Spending above 30% of household income |         5.5% | −4.48 points; −8.26 to −0.69              |
| Borrowed for bills or skipped payment  |        24.4% | −14.22 points; −21.02 to −7.43            |

The Oregon trial establishes a coverage mechanism within its population; it is not a symmetric estimate of losing coverage. Total medical spending and personal costs differ. Neither single-state study supplies a national/all-place coefficient. Broad national expenditure and insurance distributions remain needed for starting anchors, with age, income, health, plan terms and household composition. Actual bills operate on their actual dates; survey follow-up is not an onset lag.

**Step 2.** The affected person needs accurate notice and saved knowledge before the Journal displays the event. Fresh legal readings: [42 CFR 431.210](https://www.law.cornell.edu/cfr/text/42/431.210) requires action/effective date, specific reasons and supporting regulations, hearing rights, and explanation of continued Medicaid during a hearing request. [42 CFR 431.211](https://www.law.cornell.edu/cfr/text/42/431.211) generally requires notice at least ten days before action, with exceptions in sections 431.213 and 431.214. Those exceptions, state appeal details and dated territorial applicability must be inspected before a universal notice clock is implemented. A sent notice and a person's actual knowledge are separate recorded facts.

**Step 3.** `monthlyPayByPerson` currently reads compensation. Retirement flows must be canonical pension/Social Security payments before eligibility consumes them. Exact MAGI/non-MAGI rules, household definitions, disregards and exemptions determine which income counts. Do not include every retirement flow in every eligibility category by default.

## 4. County, parish and ward elections

Source: [Build 25 FINAL, 12:29 p.m.](https://docs.google.com/document/d/1DJJn_9tHLhRv6g9ZrDGv3DGLhvJ0VXTlXFTNtjHaKVs/edit). The source reports its branch fully merged; that statement does not establish completion of the next steps.

1. Extend `local-elections.ts` to the county units already seated by `ensureCountyGovernmentSeatsForUnit`. The handback identifies 21 Louisiana council-president parish forms with a chief seat. Elections need exact current county/parish charter and state terms, dates, qualifications, district/at-large form, runoff and vacancy rules. A seat's presence proves no election rule.
2. Household formation, births, deaths and moves should use recorded causes to change the roster and support `redistrictAfterCensus`. Do not add a random annual household drift. Broad household/migration distributions are a separate source acquisition; legal apportionment uses the population and date required by the actual law.
3. The inherited ICMA national shares, 68.0% at-large, 18.4% ward and 13.6% mixed, describe a survey; they cannot establish any town's charter. `county-governing-bodies.json` also contains a national-average fallback. Seat counts, ward systems and schedules are legal facts, so each applicable place needs its primary law or charter. Largest unsourced town charters are a bounded next acquisition. Recorded household order is not a researched street map.
4. Actual ward residence, voter eligibility, candidate records and smooth personal decisions must determine ballots. Coordinate the existing vote writer with its owner; the rolled starting support and hand-set population-deviation response are not replaced by a guessed partisan coefficient.

Exact coverage across 56 places is incomplete. Counties do not exist in the same form everywhere; independent cities, boroughs, municipios and territorial municipalities require their own route. No national average is admitted as legal evidence.

## 5. Rulings become news and follow lawful appeal routes

Source: [Build 27 FINAL, 12:15 p.m.](https://docs.google.com/document/d/1xjCY4IhgJTMm13hTwO_THolmVsEbK-rI_YENXuKFG90/edit). Its pending-merge statement is stale: the GitHub connector verified [judicial-review PR 1080](https://github.com/lamontaes/Political-Game-Git/pull/1080) merged at `3f7370187fce24e29a873d1d07d6d789de6994de`. The historical 102-test comment is another owner's receipt, not a test run here.

Step 4 connects `judicial-review.ts` to actual ruling records, sponsor notice, news and lawful appeals. [28 USC 1257](https://www.law.cornell.edu/uscode/text/28/1257) permits Supreme Court certiorari review of final judgments of the highest state court available when a federal question is present, explicitly including the D.C. Court of Appeals. [28 USC 1254](https://www.law.cornell.edu/uscode/text/28/1254) provides certiorari and certification routes from federal courts of appeals. Neither statute makes every ruling an automatic appeal. State-law-only judgments, intermediate review, standing, deadlines and territorial routing need their specific legal sources.

Preserve court, parties, disposition, federal/state grounds, dates and appeal status. Team 5's news reader should consume the recorded ruling; sponsors and parties receive actual notices through the knowledge writer. News readership is not automatic knowledge for everyone, and no salience coefficient was established. The state constitutional clauses and dated precedents in `judicial-review-precedents-2026.json` remain a bounded legal-completion task for the judiciary owner and research queue.

## 6. Favors, Journal by person, death and heir stories

Sources: [Research 3 FINAL, 12:12 p.m.](https://docs.google.com/document/d/1WXMr_-fPI5cVxz_iy9wni2ab4ra4y8DeLpGwXCLZ8Gw/edit) and [full design, 11:44 a.m.](https://docs.google.com/document/d/187VwdZdq7L1xQa1DJSrKF2vh5r8o3ngcXrTh1hdZeS0/edit). Both were read. The full design separates favors, commitments and relationship memory; its historical questions are not new owner blockers without a current unresolved decision.

1. Produce favors from actual need and an available helper's relationship, time, health, temperament and resources. The design cites Census/AmeriCorps 2023 neighbor-favor participation of 54.2% among ages 16 and older, and 2024 ATUS daily help to nonhousehold people. These are annual/day survey checks with different denominators, not daily rolls. The [Census source](https://www.census.gov/library/stories/2024/11/civic-engagement-and-volunteerism.html) returned HTTP 403 in this session; its original figure is a predecessor research receipt, not independently reverified. [ATUS report](https://fraser.stlouisfed.org/files/docs/releases/atus/atus_20250626.pdf) was cited in the predecessor design but not reread here.
2. Confidant circles should reflect meaningful recorded ties across a person's life. The cited [Pew neighbor survey](https://www.pewresearch.org/social-trends/2018/05/22/how-urban-suburban-and-rural-residents-interact-with-their-neighbors/) distinguishes rural/urban setting, tenure and time in place. Those descriptive modifiers cannot automatically create a friendship or supply an inherited confidence score. The design's GSS confidant averages and Toronto tie study retain their original scope and need primary revalidation before numeric use.
3. Actual speech can create a promise only when its words, speaker, beneficiary, audience, obligation and time are recorded. Help, votes, endorsements, jobs, attendance and campaign commitments need their canonical writers; a generic text renderer creates no commitment. Later records establish kept, broken or lapsed status.
4. The Journal filters by person and orders actual entries oldest first. Retained written records differ from fading memory. A death retrospective before heir selection reads the person's actual dates, places, cause, relationships and commitments. Family stories carry the actual teller, listener and source event as secondhand knowledge. An heir does not inherit a parent's friendships, job or office. The design's five forgotten events per twenty years and half-standing inheritance, ranging from a quarter to three quarters, are explicitly hand-set. They are excluded from research-backed calibration.
5. After implementation and merge, owners check annual favor participation, daily helping, tie composition and commitment outcomes against their matching denominators. Historical scenarios are validation examples, not invented events. No watched-world favor or heir outcome was produced by Team 9.

The design's 10/52/104/210-day favor half-lives map donation-return observations into personal obligations. A hospital donation-return rate does not identify the decay of a neighbor's favor; the 104-day value is interpolated. No universal personal-obligation decay coefficient is supplied. Anti-nepotism and public patronage need exact place/role law; the inherited 56-place table includes partial reads and is not certified complete. Preserve meaningful recorded help years after immediate debt fades without inventing measured decay.

## Bounded requests to Teams 1 and 5

Team 1: send unresolved legal/source cells and exact consumer units. Keep legal gaps separate from broad nonlaw starting anchors. The outgoing homelessness packet does not repair the remaining single-place library, identification or lobbying-capacity proxies.

Team 5: a fresh read of [Pew's 2024 local-news attention page](https://www.pewresearch.org/journalism/2024/05/07/attention-to-local-news/) verifies 22% followed local news very closely and 66% at least somewhat closely. The very-close responses were 9% among ages 18–29 and 35% among ages 65 and older. These measure reported general attention, not the chance of learning one story. The observed [methodology link](https://www.pewresearch.org/journalism/2024/05/07/local-news-trends-methodology/) returned HTTP 403. Youth, territories and joint demographic coverage remain unverified. No invented age-by-education joint distribution, stake coefficient or during-play uptake roll is supplied.

The broader midterm model requested by Team 2 is queued behind the assigned packets. It still needs complete fitted parameters, residual distribution, timing and units. The dispatch explicitly rejected guessed GDP/unemployment/inflation weights; none are introduced here.

## Checks and remaining work

These are research-only Markdown packets. Source readers, legal tables and game types were not changed, so no scoped type or behavior-test claim applies. The lead runs formatting, report, spelling, whitespace and release checks for publication and records their actual results in the handback. Full simulations belong on main after merge. Raw temporary source reads remain preserved in cloud scratch; no production rights, source lock or compiled corpus is claimed.

Next research acquisitions are program-level federal transfers, broad construction/reform evidence, national medical-cost distributions, exact county/parish/territory legal routes, and firsthand favor/news survey methods. Any inaccessible source remains an explicit evidence gap. The packets are READY for scoped source review; owners must not treat open legal cells or single-place estimates as complete production calibration.
