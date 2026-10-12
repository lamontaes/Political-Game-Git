# Engine: laws (laws as data and their effects) - P11 porting analysis

Tool totals for 159 files: 1,576 units. RULE 517 (8,545 lines), PLUMBING 537 (21,303 lines), DATA 158 (8,610), TYPE 302, DEAD 62 (1,566). Only 74 RULE units are flagged entangled. Paths below are under src/simulation/ unless stated.

## 1. SAMPLE AUDIT

teacher-salary-floor.ts:324 anyTeacherFloorLawEnacted TOOL=PLUMBING YOU=PLUMBING one-line World lookup wrapper
tax-policy.ts:1799 recordTaxEvent TOOL=PLUMBING YOU=PLUMBING builds and appends a history event
effect-records.ts:149 cloneCausalMechanismCatalog TOOL=PLUMBING YOU=PLUMBING deep copy for immutable World
law-exposure.ts:171 recordHeardExposure TOOL=PLUMBING YOU=PLUMBING appends a derived exposure row
lw08-library-materials/index.ts:166 resolveLw08LibraryMaterialsConsequences TOOL=PLUMBING YOU=PLUMBING reads recorded visit plus lawInForce, emits row
policy-semantics.ts:1807 assertMetricValueForDefinition TOOL=PLUMBING YOU=PLUMBING pure validator, throws on mismatch
law-consequences/pay.ts:122 termUnits TOOL=PLUMBING YOU=RULE pure expression-unit inference; duplicate of price-cost copy
law-consequences/price-cost.ts:46 requiredTermUnits TOOL=PLUMBING YOU=RULE identical walker; belongs in one expression library
effect-records.ts:400 validateCausalProcess TOOL=PLUMBING YOU=PLUMBING chronology and provenance validator over World
outcome-web/place-outcome-store.ts:217 keysByJurisdiction TOOL=PLUMBING YOU=PLUMBING lazy module cache of id-to-key map
policy-semantics.ts:189 directPolicyImplementationFactor TOOL=PLUMBING YOU=PLUMBING record constructor, no decision
enacted-rule-changes.ts:469 ruleChangeConsequenceBindingHistoryRecords TOOL=PLUMBING YOU=PLUMBING history getter
policy.ts:702 cloneRecords TOOL=PLUMBING YOU=PLUMBING shallow copy helper
service-delivered-data.ts:5 SERVICE_SELECTOR TOOL=DATA YOU=DATA string key constant
service-delivered-data.ts:402 COUNTY_SERVICE_FAMILIES TOOL=DATA YOU=DATA hand-written county program-to-budget-line table
law-consequence-types.ts:17 LAW_EFFECT_KIND_REGISTRY TOOL=DATA YOU=DATA inventory of effect kind names
service-delivered-data.ts:27 FARM_PAYMENT_QUESTION TOOL=DATA YOU=DATA catalog key string
lw17-person-landings/index.ts:26 MANDATORY_MINIMUM_QUESTION TOOL=RULE YOU=DATA catalog key string, no logic
claim-stances.ts:34 CLAIM_STANCE_EVENT_TAG_PREFIX TOOL=RULE YOU=PLUMBING history tag string
law-effects-noticed.ts:22 LAW_EFFECTS_NOTICED_VERSION TOOL=RULE YOU=PLUMBING save-version label
statutory-tax.ts:78 FEDERAL_INCOME_TAX_KEY TOOL=RULE YOU=DATA identifier string
enacted-rule-changes.ts:1075 enactedRuleChanges TOOL=RULE YOU=PLUMBING joins history enactments into a view
fairness-pay-law.ts:35 SEXUAL_ORIENTATION TOOL=RULE YOU=DATA category key string
election-local-landings/index.ts:9 SOURCE_TAG TOOL=RULE YOU=PLUMBING history tag string
sales-tax-bases.ts:18 recordSalesTaxBases TOOL=RULE YOU=PLUMBING writes events and bases, asserts integrity
enacted-rule-changes.ts:332 describeRuleChangeValue TOOL=RULE YOU=PLUMBING player-prose formatter; belongs to English engine
claim-stances.ts:32 CLAIM_STANCE_TAG_PREFIX TOOL=RULE YOU=PLUMBING history tag string
enacted-duties.ts:67 ENACTED_DUTY_RESEARCH_QUESTION TOOL=RULE YOU=DATA alias for a key string
minimum-wage.ts:393 localSettings TOOL=RULE YOU=PLUMBING WeakMap cache keyed on World object
policy.ts:69 policyIssuesDecidedAt TOOL=DEAD YOU=DEAD only policy-packs.test.ts calls it (grep)
law-consequences/enforcement-priority.ts:36 orderExecutiveEnforcementTargets TOOL=DEAD YOU=DEAD no caller anywhere, not even a test
tax-law-term-keys.ts:45 TAX_CATEGORICAL_LAW_TERMS TOOL=DEAD YOU=DEAD referenced only by its definition

agreement 18/32. Main misclassification: the tool calls string constants (keys, tag prefixes, version labels) RULE because they are "pure helpers", and calls entangled assemblers (enactedRuleChanges, recordSalesTaxBases) and a prose formatter RULE because they contain conditionals. In the other direction it calls two pure expression-unit walkers PLUMBING because they throw. earned-law-pay-integrity.ts validateEarnedLawPayAssessment (126 lines) and law-consequences/legal-outcome.ts:415 assertLegalOutcomeConsequenceIntegrity are tool-RULE but are validators.

## 2. MAP

- Policy catalog and packs. policy-packs.ts (loadPolicyPacks:292), policy-pack-registry.ts, five pack files (policy-pack-us-federal, -federal-positions, -policy-positions at 3,385 lines, -state-and-local, -tax-terms), policy.ts (createPolicyCatalog:150, integrity:168), policy-semantics.ts, policy-proposition-index.ts. Owns World.policyCatalog (issues, propositions, principles, with consequence rows attached). Built at world setup; read by every legislature, voter and opinion path. Data lives in .ts, not JSON.
- Law in force and effective dates. governing/law-in-force.ts:120 (lawInForce: finds the highest-level enacted answer, checks authority, operative date, expiry, court strike-down, falls back to data/research/laws/starting-law-2026), law-hierarchy.ts (12 levels, rank, home-rule vs Dillon), governing/statute-effective-date.ts:288, legislative-effective-date.ts:30. Derived on read from history.legislativeEnactments. Read by minimum-wage, outcome-web, every consequence resolver, press, legislatures.
- Enactment fan-out. enacted-law-effects.ts:244 applyEnactedLawEffects, called at enactment by governing/legislative-clock.ts:1186, municipal-ordinance-procedure.ts:855/932 and presentation/publish-legislative-transition.ts:31. It runs adoptEnactedTaxPolicy (tax-policy.ts:661), appropriations (enacted-appropriations.ts), duties (enacted-duties.ts, compliance by a future-due handler ENACTED_DUTY_COMPLIANCE), eligibility (enacted-eligibility.ts), rule changes (enacted-rule-changes.ts, 1,242 lines: office pay, election dates, term limits, minimum wage fields), program terms (enacted-program-terms.ts), then applyLawConsequences. Writes history.taxProposals/taxPolicies, publicProgramRecords, ruleChange* families.
- Consequence modules. law-consequence-types.ts (kinds, units, scopes), law-consequence-amount.ts:26 (typed expression evaluator), law-consequence-registry.ts and generated law-consequence-module-manifest.ts (8 core kinds: pay, tax, price-cost, coverage-eligibility, right-permission, service-delivered, legal-outcome, institution-rule, plus 12 modules under law-consequences/modules). Driver: enacted-law-effects.ts:802 applyLawConsequences scans every proposition for rows whose `when` matches the activity ("effective", "service", "assessment", payroll). Called from time-work.ts, life.ts, local-economy.ts, living-world/town-pay.ts and town-rent.ts, justice/prosecution.ts, the tax-base writers, crisis/snap-participation-producer.ts. Writes effect stamps and law-effect records (law-effect-stamp.ts, effect-records.ts) and law-term-gap events.
- Taxes. statutory-tax.ts (assessPaycheckTaxes:92, driven from living-world/town-pay.ts:2113), income-tax-withholding.ts, state-income-tax-law.ts, federal-top-income-tax-law.ts, payroll-tax-bases.ts, paycheck-tax-bases.ts, sales-tax-bases.ts (from cost-of-living.ts:591), property-tax-bases.ts (annual day, self-rescheduling), tax-policy.ts (2,174 lines: proposals, policies, power evidence, collection transition tax:collect-assessment), local/state-tax-authority.ts. Writes history.taxBases, taxProposals, taxPolicies and money transfers to public accounts.
- Benefits, programs, pay floors. public-benefit-formulas.ts, paid-leave-*.ts, state-paid-leave-law.ts, housing-voucher-eligibility.ts, federal-state-program-payments.ts (from public-budgets/index.ts:241), federal-outlay/defense/farm/rail modules, minimum-wage.ts (federal/state/local setting chain), teacher-salary-floor.ts, student-aid-facts.ts, consumer-loan-law.ts, fairness-pay-law.ts. Read by pay and budget code.
- Outcome web. outcome-web/index.ts (links.json, 221 links; outcomeFactor:801, shapedLinkFactor:735), place-outcome-store.ts + place-outcomes.ts (monthly place measures held in World.placeOutcomes, driven by transition crisis:place-outcomes via crisis/index.ts:107), person-outcome-landings.ts (monthly, loops world.personOrder), environment-energy-landings.ts. Main readers: decisions.ts, mind.ts, cost-of-living.ts, living-world/housing-market.ts, town-finances.ts, town-family-plans.ts, press/law-effect-news.ts.
- Exposure and awareness. law-exposure.ts (felt size, word of mouth, reflection scheduling), law-effects-noticed.ts (pay-change notice), claim-stances.ts and claim-contradictions.ts (player claims vs. law record). Write history.lawExposures and events; feed mind and press.
- Permits and rights. permits.ts and permit-types.ts: applyForPermit is called only by permits.test.ts (grep), so no game path writes a permit. right-permission.ts and permission-records.ts apply rights via consequence rows.

## 3. STOPGAPS

Markers over 159 files plus outcome-web JSON: SET BY HAND 0, GAME ASSUMPTION 1, NOT MODELED 11 (lines), PLACEHOLDER 6 (lines). Plus data/research/outcome-web/placeholder-ledger.json (15 entries, territory medians for places with no 2024 denominator) and landing-plan.json.

- governing/statute-effective-date.ts:319 GAME ASSUMPTION: an act dated on or before enactment day is moved forward.
- governing/statute-effective-date.ts:35 NOT MODELED: acts that set their own date, emergency clauses.
- governing/law-in-force.ts:69 NOT MODELED: floor preemption; blanket rule applies.
- law-hierarchy.ts:15 NOT MODELED, each with a blanket rule applied.
- law-exposure.ts:50-59 PLACEHOLDER felt-size of non-money law effects (basis "PLACEHOLDER").
- law-exposure.ts:102 PLACEHOLDER pay read over four weeks before exposure.
- law-exposure.ts:197 PLACEHOLDER three-day reflection delay (a fixed constant).
- enacted-law-effects.ts:192 PLACEHOLDER for a law part the world does not understand.
- enacted-rule-changes.ts:179, 878, 911, 954, 1414 NOT MODELED: other courts, executive-office registry per state, committee vs. floor text close, Article V reach to national offices only.
- policy-provisions.ts:29, 38 NOT MODELED: constitutional amendments that write "no"; pending research.
- minimum-wage.ts:404 NOT MODELED: county minimum wages.
- crisis/medicare-drug-negotiation.ts:16 PLACEHOLDER(research: per-person savings).
  Seeded randomness: none in logic. One setup-time seeded pick: world-setup/state-tax-service-profiles.ts:70-80 chooses each state's fictional school-facilities tax rate from 4/4.5/5 percent with SeededRng (a fictional profile, flagged fictional at :22; not an actor decision, but it is a dice-shaped invented value). outcome-web drawnLinkSize (index.ts:779) is named "drawn" but is deterministic (uses recorded central size).
  State and place names in logic: none found for state names or GEOIDs in conditionals. Checks on "US" (federal key) at law-in-force.ts:683, tax-policy.ts:190/501/867, statutory-tax.ts:662 are the federal layer, not a place. Per-place tables live in .ts: area-residents.generated.ts (generated KEY:residents string), COUNTY_SERVICE_FAMILIES, policy packs, and a Kentucky text in governing/institution-authority.ts:138-141.

## 4. KEEPERS

1. law-consequence-amount.ts:26 evaluateLawAmount. Typed expression tree (term/record/capacity/exposure/sum/min/max/difference/product/ratio) with unit checks; refuses missing inputs ("unavailable facts never become zero"). Inputs: expression plus four maps. Pure, no World. Port as is; fold in the two duplicate termUnits walkers (pay.ts:122, price-cost.ts:46).
2. outcome-web/index.ts:735 shapedLinkFactor (elasticity, linear, threshold, diminishing) and :801 outcomeFactor. Math is pure; outcomeFactor reads World only through outcomeMeasure(...).read, lawInForce and the place store. Would take a reader interface (measure, place, date) instead of World.
3. governing/law-in-force.ts:120 lawInForce plus governs/candidate logic and law-hierarchy.ts (lawLevelRank, outranks, localInstrumentMayChange:127). Entangled: scans enactedByQuestion(World), calls mayAnswerQuestion, struck-down check. Would take an enactment table keyed by proposition id and an authority function.
4. income-tax-withholding.ts:373 annualTax, :392 withholdingForPaycheck, :281 stateIncomeTaxSchedule, :65 federalIncomeTaxScheduleFor; statutory-tax.ts:636 taxAt (BigInt half-up) and :614 taxableWages. Inputs: wages, periods, bracket schedule, wage cap/floor and paid-so-far. Pure except schedule lookup.
5. governing/statute-effective-date.ts:288 stateStatuteOperativeAt and legislative-effective-date.ts:30. Pure date math from a rule row plus a date context; no World.
6. minimum-wage.ts:468 minimumWageSettingAt / :553 minimumHourlyAt (federal vs. state vs. city, dated matrix). Reads data/research/money/minimum-wage-dated-matrix-2026.json and law in force; takes World for the enacted layer only.
7. outcome-web/person-outcome-landings.ts:177 matchesOutcomeRecipientRule. Pure predicate over an OutcomeLandingPerson fact bag; the 388-line outcomeRecipientsAt:291 that builds those facts is the entangled part (becomes indexed queries).
8. enacted-coverage.ts:193 resolveCoverage and enacted-program-terms.ts:90-186 (programLastDay, programHasEnded): clause text to coverage and sunset dates. Pure.
9. law-exposure.ts:86 lawExposureFeltSize and :295 monthlyPay: how big a law change feels. Pure but carries the PLACEHOLDER constants.
10. public-benefit-formulas.ts, paid-leave-benefits.ts:86 paidLeaveBenefitRate, state-paid-leave-law.ts:76 paidLeavePremium: formulas over income; entangled with World reads for income, replaceable by arguments.
11. tax-policy.ts:603 taxLevyText aside, the taxable-base and previewTax:784 logic (pure) and effectiveTaxPolicy:765 (selects the policy in force on a date).

## 5. CORE2 MODULE INPUTS

State owned (Maps by id, with indexes): propositions (by key, by issue, by level), enactments (by proposition id, by jurisdiction), tax proposals and policies (by jurisdiction + series key, sorted by effective date), tax bases (by payer, by year), programs and appropriations (by program key, by jurisdiction), duties and eligibility (by measure id, by body kind), rule overrides (by office key + field), place outcome series (by place + measure, monthly), lawExposures (by person, by measure), permit applications (by person). These are small compared with people; most never need a durable log. Keep only what a player can see: enactments, tax changes, program changes (public record and news), and exposure rows for the player circle.
Acts offered to ordinary people (as ActOffers): file for a permit (actor person or business; prerequisite: permit rule exists in law in force; effect: application row, official decides on the rule), apply for a benefit (SNAP, voucher, paid leave, Medicaid; prerequisite: coverage row and eligibility; effect: money transfer and enrollment), appeal or claim (contradiction), comply or evade a tax (file, pay, delay). To officials: adopt a levy, set a rate, appropriate funds, issue an executive order, enforce or decline (enforcement priority). Legislative act definitions belong to the legislatures engine; this engine supplies effects.
Effects: onEvent("law.enacted") runs tax adoption, appropriation, duty, eligibility, rule-change, and consequence rows; onDay (tier-dependent) assesses paycheck taxes and sales/property bases; monthly place-outcome and landing pass; program ends on programLastDay.
Typed events: law.enacted, law.effective, tax.assessed, tax.rate-changed, program.started/ended, duty.complied/breached, benefit.granted/denied, exposure.noticed, law.consequence-integrity-gap. Public record and news: enactment, tax rate change, program start/end, duty breach, court strike-down. Private: assessments, benefit decisions, exposure.
Calendar: effective dates per act (days-after-enactment, next fixed date), tax year Jan 1 (wage caps), annual property assessment day (self-rescheduling), payday (periodsPerYear), monthly outcome pass (first of month), program sunsets, duty compliance dates. Tier: calendar for pass-level work; daily only for the player circle's own paychecks; husk persons get annual aggregates.
Data to reuse: data/research/outcome-web/links.json (221 links), place-outcome-bases-2024.json, person-recipient-*.json, data/research/laws/starting-law-2026, money/state-income-tax-2026.json, federal-income-tax-schedules.json, minimum-wage-2026.json and dated matrix, local-tax-authority-matrix.json, public-programs-2026.json, state-session-calendars-2026.json, data/laws/justice, data/law-consequences/election-state-landings.json. The 5 policy packs (about 9,000 lines of .ts) should become JSON rows.

## 6. DEPENDENCIES AND RISKS

Needs first: people/households/jobs/orgs, money transfer and public accounts, time/due-items, legislatures (enactment records), jurisdictions/government identity, macro-economy readers, public budgets, history/knowledge for exposure.
Riskiest:

1. applyLawConsequences (enacted-law-effects.ts:802) scans propositionOrder for every call, validates rows each call, and accepts `subjectIds: personOrder` at enactment. Violates the speed budget; needs a by-activity index and an event-driven subject list.
2. Whole-world integrity validators (assertWorldIntegrity in sales-tax-bases.ts, enacted-duty-integrity.ts, earned-law-pay-integrity.ts, effect-records.ts validators; about 21,000 PLUMBING lines overall). They must be dropped or converted to tests; their invariants are not documented elsewhere.
3. Save-format assumptions: optional history families (taxBases, lawExposures, ruleChange*, permit*), stableKey idempotency (`sales-base:...`, `law-term-gap:...`), WeakMap caches keyed on World (minimum-wage.ts:393). Old-save compatibility is a stated rule; core2 may drop it deliberately.
4. Policy packs as 9,000+ lines of .ts with per-place rows, plus generated area-residents string; moving to data rows must keep qualified keys (`us-policy-positions:...`) that are baked into consequence rows and links.json causes (`law:<key>`).
5. Monthly person-landings and place outcomes scan every person every month; core2 tiers/indexing must replace the loop while preserving "no landing twice" (linkKey|personId).
6. Dice-shaped setup: state-tax-service-profiles seeded rate pick, and PLACEHOLDER constants in law-exposure (felt size, reflection days) that drive opinion. Both need parameter-table entries.
   Also: ENACTED_DUTY coverage-unknown handling (bodies of unrecorded size) depends on what core2 records for organizations.

## 7. LIFE-REPLAY STEPS

- law-signature: supplies the aftermath (applyEnactedLawEffects fan-out); signing itself is legislatures. Lacks: a typed law.enacted event in core2.
- employment: fully supplies pay terms (minimum wage chain, pay rows, teacher floor), paycheck withholding and payroll taxes, paid leave. Lacks: worker-side apply/appeal acts.
- residence-move: partly (property tax, sales tax at the new place, rent stabilization/price-cost rows, voucher eligibility).
- education-enrollment/completion: partly (tuition freeze, student aid facts, compulsory-age landings, curriculum/library rows).
- family-loss, health-shock: partly (paid leave, coverage-eligibility, Medicaid expansion landings, SNAP participation).
- business-formation: partly. Permits exist only as unused applyForPermit; tax-payer scope (business-tax-payers.ts) and the permit rule rows are missing from play.
- candidacy, election-result, reelection-decision, office-succession, chamber-leadership, office-service, public-appointment: partly through enacted-rule-changes (election dates, term limits, office pay, qualifications), annual-office-pay.ts, election landings modules (state/local/ward), senate-vacancy-law. Lacks: judicial/executive office registries (NOT MODELED).
- legislative-proposal, military-authorization-request: weakly (appropriation records, federal-defense-spending); mostly other engines.
- military-service, military-deployment, partnership, cause-participation: little; partnership touches fairness-pay-law.ts only, military pay not here.
