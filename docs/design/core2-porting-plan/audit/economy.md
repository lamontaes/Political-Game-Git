# Economy engine findings (read-only, origin/main)

Note: the tool's "economy" bucket also holds political files (party-chapters, local-elections, congress-turnover, protests, law-interest-groups, official-views, constitutional-reform, county-budget-hearings) and `time-work.ts` (the activity/work-item scheduler, 66 of 100 units PLUMBING). Those belong to other engines. 1,699 units overall: RULE 657, PLUMBING 522, TYPE 281, DATA 181, DEAD 58.

## 1. SAMPLE AUDIT

src/simulation/living-world/party-chapters.ts:134 ensureHomePartyChapters TOOL=PLUMBING YOU=PLUMBING writes organizations history; political, misfiled
living-world/town-finances.ts:397 recordedBankShapeForCertificate TOOL=PLUMBING YOU=DATA lookup in FDIC row table, throws if missing
job-market.ts:636 jobSearchArea TOOL=PLUMBING YOU=PLUMBING reads home jurisdiction and public-body history
job-market.ts:655 openJobListings TOOL=PLUMBING YOU=PLUMBING filters history.jobOpenings by area
job-market.ts:1103 addStep TOOL=PLUMBING YOU=PLUMBING appends step row and event note
living-world/law-interest-groups.ts:373 joinLawInterestGroup TOOL=PLUMBING YOU=PLUMBING scans goalStates, delegates to organizer
public-budgets/staffing.ts:157 latestRoleTitles TOOL=PLUMBING YOU=PLUMBING whole-history scan building a title map
resource-queries.ts:226 resourceObligationStateHistory TOOL=PLUMBING YOU=PLUMBING filtered history read
living-world/local-elections.ts:1368 localElectionTermStartHandler TOOL=PLUMBING YOU=PLUMBING scheduler handler checking records
career-path7.ts:742 careerExpectedStart TOOL=PLUMBING YOU=PLUMBING history lookup wrapper
quantity.ts:242 safeAdd TOOL=PLUMBING YOU=RULE pure overflow-safe money arithmetic, no World
living-world/town-family-plans.ts:94 FAMILY_PLAN_WEIGHTS TOOL=DATA YOU=DATA tuning weights and age curve
living-world/town-family-plans.ts:146 STEPS TOOL=DATA YOU=DATA importance and confidence lookup table
macro-economy/central-bank.ts:88 CENTRAL_BANK_VERSION TOOL=DATA YOU=PLUMBING version and event-name strings for stable keys
living-world/town-families.ts:159 STAGE_OF_KIND TOOL=RULE YOU=PLUMBING reverse index of partnership kinds
living-world/congress-turnover.ts:116 resultsKey TOOL=RULE YOU=PLUMBING history stable-key string builder
resource-payments.ts:34 datedCashBalanceAt TOOL=RULE YOU=PLUMBING reads resourcePositionAt from history
living-world/town-rent.ts:581 marketRentMinor TOOL=RULE YOU=RULE FMR times town price level; takes World only for level
living-world/town-finances.ts:422 dollars TOOL=RULE YOU=RULE trivial minor-to-dollar conversion
production-catalog.ts:146 createProductionCausalMechanismCatalog TOOL=RULE YOU=PLUMBING returns empty catalog; called at world.ts:487
living-world/town-rent.ts:364 parseRow TOOL=RULE YOU=DATA decodes generated HUD rent string
living-world/congress-turnover.ts:420 jointAssemblyKey TOOL=RULE YOU=PLUMBING stable-key builder
public-budgets/month.ts:601 lawNote TOOL=RULE YOU=PLUMBING wraps record annotation object
living-world/political-reflection-schedule.ts:11 exposureReflectionKey TOOL=RULE YOU=PLUMBING key string
living-world/county-budget-hearings.ts:141 hearingDueKey TOOL=RULE YOU=PLUMBING key string
living-world/town-rent.ts:2657 bedroomHome TOOL=RULE YOU=PLUMBING player prose phrase, belongs to English engine
living-world/constitutional-reform.ts:179 BACKGROUND_SUFFIX TOOL=RULE YOU=PLUMBING key suffix constant
living-world/official-views.ts:92 V TOOL=RULE YOU=PLUMBING "official-view" key prefix
living-world/protests.ts:85 organizeProtest TOOL=DEAD YOU=DEAD only protest-presence/protest-attendance tests call it
living-world/protests.ts:443 holdProtest TOOL=DEAD YOU=DEAD same, tests only
living-world/law-interest-groups.ts:444 actForSharedCauseGroup TOOL=DEAD YOU=DEAD only group-founder.test.ts calls it

Agreement 15/30. Main error: "pure-helper with no World read" is called RULE, so stable-key builders, string constants, history-record wrappers, prose phrases and one empty-catalog factory become RULE. Opposite error: a tiny pure money-math guard (safeAdd) is called PLUMBING. Economy-math RULE calls (marketRentMinor) were right. DEAD calls were right but mean "tests only", not "unused".

## 2. MAP

- Macro economy (macro-economy/): kernel.ts stepMonth/stepLocalMonth, credit.ts, cycle.ts, policy.ts, producer.ts. Owns `world.macroEconomy` store (types.ts:6190, store.ts) with monthly national and per-scope records. Driven by `macroMonthlyStepHandler` (producer.ts:678, key `economy:monthly-step`, registered campaigns.ts ~2640). Readers: macroConditionsAt in mortgage-financing, town-labor-market, town-rent, housing-market, migration/review+waves, outcome-web, record-in-office, public-budgets/fiscal.
- Central bank (central-bank.ts, rate-choice.ts): board seats, nominations, meetings, policy rate by considerations. Writes people, organizations, events (`economy.policy-rate-decided`). Driven by the monthly step (`holdCentralBankMeeting` :1007).
- Town business and bank books (town-finances.ts, town-business-books.ts, town-businesses.ts, local-economy.ts): quarterly revenue, costs, cash, credit line, closure, bank capital, runs and failure, receipts, household defaults. Writes resource positions, flows, obligations and organization profiles. Driven by the quarterly town review (migration/review.ts) via town-businesses.ts:372 `stepTownFinances` (:1095, 518 lines). local-economy.ts seats real local businesses at the opening.
- Jobs, labor and pay: town-employment.ts (one-time filling, `fillTownJobs` :1380, 445 lines), town-labor-market.ts (quarterly quits, layoffs, hires), job-market.ts (openings, applications, offers, `advanceJobMarket` :2313), town-pay.ts (BLS wage by SOC/area/percentile, paydays via `paydayHandlers()` :649, law pay consequences :1191). Writes workRelationships/roles/statuses, jobOpenings/Applications/Steps, compensation flows and transfers.
- Housing and rent: town-homes.ts (dwellings, occupancy, review), town-rent.ts (leases, rent day via `rentDayHandlers()` :1075, arrears, evictions, inclusionary rent), housing-market.ts (price level), home-purchase.ts, mortgage-financing.ts, opening-mortgages.ts. Writes dwellings, housingTenures, occupancy, obligations. Driven by `townHomeReviewHandler` (migration/review.ts:314), rent day and player action.
- Money records and loans: resources.ts (positions, flows, obligations, dwellings; 34 of 53 units PLUMBING), resource-queries/payments/integrity, household-loans.ts (`householdLoanMonthHandler` :621, key `debt:monthly-servicing`), student-debt.ts, cost-of-living.ts (player and household bills), starting-money.ts.
- Public budgets (public-budgets/): opening.ts (adopted budgets from sourced data), month.ts (`settleGovernmentMonth` :771, 613 lines; `adoptNextYear` :1605), federal-treasury, fiscal, reserve-rule, staffing, cannabis and road-usage revenue. Owns `world.publicBudgets` (types.ts:6197). Driven from index.ts monthly; county-budget-hearings votes levies.
- Moguls (moguls.ts): wealthy people offer money to candidates for a stance; answers, delivery, exposure. Writes events and campaign contributions; driven by press/transitions.ts:48 `produceMogulOffers`, plus player `answerMogulOffer`.

## 3. STOPGAPS

Counts in economy source files: SET BY HAND 0, GAME ASSUMPTION 19, NOT MODELED 3, PLACEHOLDER 13 (two more in public-budgets tests only). data/research/assumption-markers.json holds 330 marker rows.
Important ones:

- town-finances.ts:180 localDemandHalfLifeDays 1095, PLACEHOLDER (sales response timing)
- town-finances.ts:189 newDemandShare 0, GAME ASSUMPTION
- town-finances.ts:199,207 crowdingPriceResponse 0.1, rivalPriceElasticity 3, PLACEHOLDER
- town-finances.ts:214-226 bank capitalRatio 0.1, lendingCapitalRatio 0.07, frightCapitalRatio 0.05, cushionRebuild 0.25, PLACEHOLDER; these are thresholds (a flip at a line), against the sliding-scale rule
- town-finances.ts:575 which kinds charge sales tax; :715 lender choice; :1764 loans not to town households
- town-business-books.ts:145 which workplaces are businesses
- town-businesses.ts:82 manager age at closing
- town-pay.ts:33 local minimum wages NOT MODELED; :267 worker percentile by tenure; :402 BLS industry per employer kind; :1131 back pay NOT MODELED
- town-employment.ts:226,381,909,971,1014 workplace/role mix, outlet counts, staffing shares
- town-rent.ts:71 prorated first months, deposits, lease terms NOT MODELED
- town-homes.ts:36,110 home-kind shares, move chances (comment says chances; the code is decision-based)
- town-labor-market.ts:147 share of jobs; local-economy.ts:160,193 real business list sample
- housing-market.ts:75 year before supply law acts, PLACEHOLDER; header says no central bank feeds it (stale, central-bank.ts exists)
- home-purchase.ts:148 age-of-majority threshold, PLACEHOLDER
  Seeded randomness:
- town-businesses.ts:761,808 congregation and club closing and founding: a draw against a yearly chance. This is dice (clubs and churches, not shops).
- town-pay.ts:480 pay period drawn once per employer from BLS shares; :1042 biweekly phase. A seeded pick among real options, but dice-shaped.
- moguls.ts:478,550 hash orders which committee a mogul approaches. Hash decides a choice.
- central-bank.ts:241 inflation lean drawn per board member (marked GAME PROFILE); :336,408 invented names, birthdates, chair seat.
- town-employment.ts:1316, local-economy.ts:383, town-rent.ts:876 invented person identities and names.
- Macro: no draws after the start (kernel.ts:115, credit.ts:20); one start draw is persisted.
  Place names in logic: none found. Place facts are in tables keyed by state: reserve-rule.ts:41 STATES, central-bank.ts:122 RESERVE_BANKS (a "new-york" key), per-state minimum wage and tax data.

## 4. KEEPERS

- kernel.ts:136 stepMonth, :201 stepLocalMonth, :291 stepEraConditions, credit.ts:252 stepCredit, cycle.ts: monthly growth, unemployment, inflation, credit tightness. Inputs: previous state, impulses, era. World-free already.
- rate-choice.ts:125 rateConcerns, :204 rateConsiderations, :277 rankRateOptionsWithoutWorld: board member's rate decision from readings and lean. World-free already.
- town-pay.ts:364 townJobRate (+:235 townPayAreas, :503 payPeriodEndingOn): occupation, area, percentile to hourly pay with minimum-wage floor. Needs generated BLS tables and minimum wage by place; mostly pure.
- housing-market.ts:166 homePriceLevels: monthly price series from income, rate, gap, law effect. Pure.
- town-rent.ts:581 marketRentMinor (needs price level instead of World), :2290 decideEvictionCase (pure facts), :756 householdMonthlyIncome, public-housing 30 percent rule.
- town-finances.ts:290 uninsuredDepositShare, :358 recordedBankShape, and the business and bank quarter math inside :1095 stepTownFinances. Entangled: split into a per-business step (sales, costs, cash, credit, closure) and a per-bank step (loss, capital, run, failure) that take numbers.
- town-business-books.ts:110 townBusinessHasRoomToHire: hire only if sales cover pay. Pure.
- job-market.ts:1327 daysInLine, :1368 betterPlaced (hiring rank by seniority, introduction, date), :1570 timeDemandFor. Entangled via history scans; needs a job-history index.
- mortgage-financing.ts:55 mortgageFinancingQuote, home-purchase.ts:74 homePurchaseTerms: need macro conditions and place price, not World.
- public-budgets/month.ts:628 taxLawFactor, :1436 decideShortfallOrder, :1501 decideLawMoneyReaction, reserve-rule.ts:36: officials' budget decisions. Entangled.
- household-loans.ts:848 serviceLoanMonth (177 lines): amortization, arrears, discharge. Entangled.
- starting-money.ts:32-56, :236, local-economy.ts:199,255: opening balance and business income estimates.

## 5. CORE2 MODULE INPUTS

State (Maps by id): accounts/positions by owner and currency; flows and obligations with `obligationsByPayer`/`ByPayee`; leases by tenant household and by dwelling; dwellings by place; loans by borrower; job openings by place and by employer, applications by opening and by person; business books by organization (indexed by place, kind); bank books by bank (indexed by place); macro series by scope (one current record plus ring buffer); public budgets by government and fiscal year; mogul offers by candidate.
Acts: look for work, apply, accept or decline an offer, quit (worker); hire, lay off, raise pay, close (employer); pay rent, ask for time, move out, buy a home, take or repay a loan (household); sign or fight an eviction (tenant and landlord); set a rate vote (board member); propose, amend, adopt or reduce a budget, order shortfall cuts (official); make a mogul offer, answer it (mogul and candidate).
Consequences: money transfers (pay, rent, taxes, debt), job start and end, home tenure change, credit line draw, business or bank closure, price and rent level change, budget line change.
Events: job-started/ended, evicted, business-closed (public record, news), bank-failed (news), recession-began/ended, policy-rate-decided, budget-adopted, mogul-offer-made (public once exposed). Mostly retain results only; keep a log for the player circle and visible places.
Calendar: monthly macro step and loan servicing; paydays (Friday, 15th/last day, month end); rent day on the 1st; quarterly business and bank review; yearly budget adoption by each government's fiscal year; central-bank meeting months. Tiers: macro and budgets calendar-tier; paydays weekly/calendar; individuals daily only for the player circle.
Data to reuse: town-pay/rent/employment/bank-shapes/deposits `*.generated.ts` (about 2.1 MB), data/research/money (minimum wage, debt and credit, opening employer cash buffers, public-budget bases, government budgets), data/research/housing, data/source/{hud-housing, county-business-patterns, bls-*, government-finances, consumer-expenditure}, data/content/economy-visibility.json. Generated tables are .ts; convert to JSON.

Core2 port status (SOL-1258, on pool/P8-part-1): the published branch has the work module and pay transfers (modules/work.ts, work-state.ts), opening employment/jobs (opening-employment.ts, population.ts) and imports `hudRentRowFor` from old town-rent. It records `business books` as not imported (population.ts:489). Per the assignment note, the local v6 work ports business books: funded customer receipts, finite credit, employer closure (the town-finances.ts and town-business-books.ts business half, town-businesses closure). Not covered: labor market (openings, applications, quits, layoffs, hiring), rent, leases and evictions, home prices and purchase, mortgages and household loans, banks and deposits (the bank half of town-finances), public budgets and treasuries, macro economy and central bank, moguls, cost of living, student debt.

## 6. DEPENDENCIES AND RISKS

Needs first: people/households, organizations, calendar and money (resources) in core2; macro before housing, loans and labor; businesses before labor hiring; the elections engine for budget adoption by officials.
Risks:

1. `stepTownFinances` (518 lines) and `settleGovernmentMonth` (613 lines) mix math with history reads and writes; hidden coupling to resource flows, payments and law-pay stamps.
2. `assertTownFinanceIntegrity`, `assertHouseholdLoanIntegrity` (179 lines), resource-integrity (1,056 lines) are whole-world validators; replace by invariants on mutable maps.
3. Money conservation is carried by append-only flows, terms and outcomes; core2 needs one transfer API with the same conservation proof.
4. Old-save and stable-key assumptions (`...:round:opened` keys, versions in stableKeys) must be dropped without breaking cross-engine references.
5. Per-place tables as .ts (about 2.1 MB generated, reserve-rule STATES, RESERVE_BANKS) and threshold policies (bank capital lines).
6. Dice-shaped pieces to redesign: club and congregation churn, pay-period draw, mogul hash order, board-member lean.

## 7. LIFE-REPLAY STEPS

- employment: fully. Needs job-market, town-pay, town-labor-market, employment. Lacks: a core2 labor market with openings and applications, unemployment, funded employers.
- residence-move: partly (rent, lease start/end, move-out, buy a home). The move decision lives in migration/review.ts, another engine. Lacks: rental market with vacancy and rent price per home.
- business-formation: partly. Opening/closing by cash exists; founding by a resident rests on the founder rules and a fixed per-kind outlet table. Lacks: loan-backed founding by choice.
- office-service: partly (office pay, budget and shortfall decisions, reserve rule).
- public-appointment: partly (central bank board nominations and appointments only).
- law-signature: partly (tax, minimum-wage and housing-supply law effects on pay, budgets, prices).
- candidacy: partly (mogul offers, contributions); campaign finance sits elsewhere.
- education-enrollment/completion: minor (student-debt, tuition cost).
- family-loss, partnership, health-shock: minor (income and lease change; no insurance, estate or medical bills).
- election-result, reelection-decision, legislative-proposal, chamber-leadership, office-succession, cause-participation, military-*: not this engine.
