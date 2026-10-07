# Dupes / wrong-path / never-called audit — 2026-10-07

Checkout: /tmp/wt-merge3 at 7a9b5b9fa (main). Read-only; nothing in it was edited.

## The live clock (what "live" means below)

scripts/dev-lab/world-aging.ts:101 createObserverDayButton
-> src/presentation/observer-world.ts:113 advanceObservedWorld
-> src/presentation/ordinary-life.ts:387 passOrdinaryDays (save catch-ups at :536; a tail at :423-445 that runs ONLY when control.kind === "person")
-> src/simulation/time-work.ts:1110 advanceWorldMinutes
   - at every date change: time-work.ts:2063 applyDateBoundary (job pay for the CONTROLLED person only, then Congress, federal reform, Article V, office lifecycle, courts, crisis repair)
   - due items: future-transitions.ts:452 resolveFutureDueItemsThrough using the registry from campaigns.ts:2354 composeWorldTimeHandlers, plus a hidden fallback chain at future-transitions.ts:353 handlerFor (crisisAmbientHandler, PEOPLE_GOAL_HANDLERS, SPEECH_RETELLING_HANDLERS).

Method: a registry probe script (run from the scratchpad, importing src) checked every one of the 2,461 namespaced key strings in src against every sub-registry and the composed registry. 115 keys have handlers and 114 are in the composed registry; speech:monthly-retelling is reachable only through the fallback. I also counted references for every exported function and ran four read-only sub-investigations (legislative, law effects, everyday life, registries/suffix files). Claims marked (unverified) were not re-run in TypeScript.

## Top 15 duplications, ranked by how much they block laws passing / laws reaching people / everyday life

1. **Two pay engines; the job-market one pays only the played person.** (everyday life)
   - Town pay: living-world/town-pay.ts:615 paydayHandler -> :907 startTownJobPay. It only pays `town-employment-v1:` jobs (:924) and `schedule:town-*` schedules (:748, :1748). Live, and covers everyone.
   - Job market: job-market.ts:2155 settleJobPay / :2162 settleRecordedJobPay. Its only callers are time-work.ts:2070 (controlled person), ordinary-life.ts:435 (played child's household) and job-market.ts:2319 advanceJobMarket (returns unless controlled).
   - Effect: in an observer world nobody hired through the job market is paid: the anchor's job (production-world.ts:510), people-goal-review.ts:559 hires and migration/job-offers.ts:512 hires. That also means no withholding and no paid leave, while rent still comes due (town-rent.ts:1848). NPC job-market hires go unpaid in played worlds too.
   - Never settled: local-economy.ts:537 `compensation:wages` flows (settleLocalBusinesses :709 and refreshLocalEconomy :725 have no callers), and character-history.ts:1465 `local-pay` flows.
   - Fix: one payday writer (town-pay) that settles every active paid work relationship, whatever its schedule. Delete settleJobPay's controlled-person gate.

2. **Seven rules for how a member votes.** (laws passing)
   - Live:
     - governing/chamber-votes.ts:889 decideChamberVote -> governing/member-vote-decision.ts:15. A member with no reason answers "present". Used for states, Congress and nominations.
     - governing/council-lawmaking.ts:93 decideCouncilVote: the same rule, but no reason means yea (:140-146). Used for town councils and DC.
     - municipal-ordinance-procedure.ts:332 decideOrdinaryCouncilReading: the core rule with no deference, no party cue and no constituency. Used for compiled councils and county levies.
     - governing/article-v.ts:269/283/297 mostLeanYes / mostLeanNo / leanShare, which bypass the core rule.
     - living-world/constitutional-reform.ts:1012 recordedBallotTally.
   - Not live: legislative-member-decisions.ts:154 (UI only); legislation-scenarios.ts:262 dispositionsFromCounts (authored fallback at legislative-clock.ts:438).
   - Effect: the same bill passes on a council and stalls in a legislature. With everyone "present", a members-voting threshold drops to 0 and a 0–0 vote passes (legislature-rules.ts:226, legislation.ts:1294).
   - Fix: one decideMemberVote that takes a per-body "no-reason default" from the rule pack.

3. **Three constitutional amendment pipelines.** (laws passing)
   - living-world/federal-reform.ts, living-world/constitutional-reform.ts and governing/article-v.ts are all registered (campaigns.ts:2366-2368).
   - Two yearly review schedulers both run from applyDateBoundary: time-work.ts:2084 applyFederalReform and :2086 applyArticleV.
   - Four ratification writers: constitutional-process.ts:1134-1156.
   - Four quorum checks: legislation.ts:2586, municipal-ordinance-procedure.ts:599, constitutional-reform.ts:860, federal-reform.ts:540.
   - Federal ratification admits at most about 12 states (unverified).
   - Fix: one Article V pipeline, reached through one review scheduler.

4. **Five bill-procedure drivers and four enactment-date rules.** (laws passing)
   - Drivers: legislative-clock.ts:647/1306 applyInstitutionStep (states); congress-lawmaking.ts:225; living-world/local-council-meetings.ts:384 moveOrdinances; dc-council-sittings.ts:157 moveActs (skips committee); municipal-ordinance-procedure.ts:1203.
   - Effective dates are worked out separately at legislative-clock.ts:1183, municipal-ordinance-procedure.ts:791 and :895, and legislation.ts:3477.
   - Fix: every body runs applyInstitutionStep with its pack, and one effective-date function.

5. **Two municipal rule-pack resolvers with the same name.** (laws passing locally)
   - municipal-rule-registry.ts:12 recognises the `gus2025:` prefix and adds minority-party rows. Used by legislature-rule-packs.ts:2704 and enacted-law-effects.ts:786.
   - municipal-government.ts:1331 recognises the `:local-ordinance-game/v1` suffix and adds no minority rows. Used by legislative-institutions.ts:87.
   - A second name clash: `municipalRulePackFor` is defined at municipal-government.ts:729 and municipal-election-rule-packs.ts:1218.
   - Fix: keep the registry version and re-export it from municipal-government.

6. **Four law-to-outcome tables.** (laws reaching people)
   - Live: outcome-web/index.ts:138/801 OUTCOME_LINKS, run monthly by place-outcomes.ts:278. People feel it only through crime, births and floods.
   - Dead: governing/law-effect-paths.ts:80/236/257.
   - Test-only: causal-effects.ts:86/164/235.
   - Unwired: policy-semantics.ts:446/577/609 realization.
   - 46 of 118 law links do nothing, and 25 of 79 law questions have no link.
   - Fix: delete law-effect-paths and causal-effects. Fold realization into the outcome web.

7. **Federal law to money, four ways.** (laws reaching people)
   - Dead: public-budgets/federal-treasury.ts:87 FEDERAL_LAW_EFFECTS and :244 settleFederalTreasuryMonth (tests only).
   - Live: federal-top-income-tax-law.ts:44 (per paycheck, one hand-coded question).
   - Live: statutory-wage-tax-rows.ts:4 plus paycheck-law-attribution.ts:10, which attribute the same result a second time.
   - Live: public-budgets/rules.ts:130/183 (aggregate only).
   - Fix: one consequence-registry row per tax or spending question.

8. **Law consequences evaluated outside the shared dispatcher.** (laws reaching people)
   - The shared dispatcher is enacted-law-effects.ts:797 applyLawConsequences.
   - Bypasses: town-pay.ts:1626 raiseTeacherPayToFloor; federal-farm-payments.ts:130; education-study-progression.ts:819 tuition freeze; custodyFloorAt and readJuvenileJurisdictionTerm in the justice code.
   - The minimum-wage question keys are defined twice, at minimum-wage.ts:46-61 and law-consequences/pay-rows.ts:3-7.
   - Fix: register each one as a consequence row.

9. **Hiring engines; job listings exist only for the player.** (everyday life)
   - Hiring: town-employment.ts:1364 fillTownJobs; job-market.ts:1809/1630/1640/1190; career-path7.ts:159 (UI only); local-economy.ts:336 seatLocalBusinesses (at opening).
   - job-market.ts:865 openWeeklyListings runs only through advanceJobMarket, which only presentation code calls.
   - Effect: in an observer world, residents' job search (people-goal-review.ts:576) always stops at "no-listed-opening".
   - Fix: one hiring engine on the clock, with listings for every place.

10. **Annual-pay readers disagree.** (everyday life)
    - town-labor-market.ts:266 recordedAnnualJobPay and job-market.ts:250 annualFromTerms only read weekly and monthly schedules.
    - household-pay.ts:104 reads every schedule.
    - Effect: layoffs (town-labor-market.ts:497) can never pick a worker paid through town pay.
    - Fix: everything reads household-pay.

11. **Due items are resolved through two lookups.** (clock integrity)
    - The composed registry is checked first, then future-transitions.ts:353 handlerFor's fallback.
    - crisisAmbientHandler handles the same 21 `crisis:*` keys as crisis/index.ts:85.
    - PEOPLE_GOAL_HANDLERS is registered twice (campaigns.ts:2452 and future-transitions.ts:362).
    - Composition lets the earlier registry win a shared key with no error (future-transition-registry.ts:101), so a duplicate across registries is never caught.
    - The same registry goes by five names: composeWorldTimeHandlers, createCampaignElectionTransitionRegistry, interruptionHandlers, lifeActivityHandlers, executivePlayHandlers (dead).
    - Fix: one registry, and make a shared key an error.

12. **Rent cap and health coverage each have two paths.** (laws reaching people)
    - Rent: town-rent.ts:1632 renewedMarketRent has cap=Infinity and is dead; the live path is the registry row at :1795.
    - Health: crisis health-coverage pass (crisis/index.ts:99) vs coverage-eligibility.ts:70, which runs only on lease renewal.
    - Fix: delete the dead cap and run coverage eligibility monthly.

13. **About 14 rule-pack resolvers and Congress special cases.**
    - legislature-rule-packs.ts:2646/2693 plus the import-time registerRulePackResolver (:2680).
    - congress-rule-pack.ts:538; legislature-game-profile.ts:906; and others.
    - US_CONGRESS_PACK_ID: 15 references in 6 files, plus the literal "us-congress-v1" at enacted-law-effects.ts:785.
    - isCongressMeasure: 13 uses. isCongressRulePack: 13 uses.
    - Fix: one rulePackById, and remove the import-time registration.

14. **Two campaign contribution models.**
    - campaign-compliance-rules.ts:240 covers Minnesota only.
    - campaign-compliance.ts:507 covers Kentucky only; campaigns.ts:875 sets a pack only for US-KY.
    - Election seating also has two writers: campaigns.ts:1783/1921 and living-world/local-elections.ts:1467.
    - Fix: one data-driven compliance pack for every state.

15. **Three trait-effect paths.**
    - traits/effects/index.ts:64 (generated, 54 files): live.
    - traits/effect-loader.ts:16 (glob): dead.
    - trait-registry.ts:47 EFFECT_PACKS (hand-written): live.
    - facet-thrill-seeking never loads, yet personality-trait-registry.ts:118 lists it as wired.
    - Four catalogue files: personality-catalogue(.generated).ts, personality-trait-registry.ts, trait-registry.ts.
    - Fix: keep only the generated index.

## Category 2 — reached through a wrong path: 19 found

Top 10:
1. time-work.ts:2070 job pay only for the controlled person, so an observer world pays nobody on the job market.
2. job-market.ts:865 listings are opened only for the played person, and only through presentation code (life-opportunities.ts:459).
3. enacted-law-effects.ts:285/895: "effective" consequences are dispatched once, on the enactment date, with empty subjectIds. A law whose operative date is later never lands.
4. state-governing.ts:2465: executive orders record no question answers and never call applyEnactedLawEffects.
5. federal-reform.ts:754-775: a state whose ratification rule is not admitted resolves without rescheduling, so it never acts.
6. constitutional-reform.ts:1020: recordedBallotTally returns null for rule-field changes, so the measure is stuck. :378 hasOpenReform then blocks later reforms, and a ballot is still scheduled after an early quorum return (:860/:992).
7. legislature-rules.ts:226 + legislation.ts:1294: a 0–0 vote passes on compiled councils.
8. local-economy.ts:537 and character-history.ts:1465 write wage flows that nothing ever settles.
9. Fixtures in live code:
   - run-c-working-document.ts:577 builds policy operations with hard-coded 2026-07-01 dates and definitionOrder[0].
   - run-a, run-b and legislative-bargaining fixtures are imported by presentation code.
   - simulation/index.ts:255 has `export *` from portability-fixture.
10. Hard-coded places and placeholder values:
    - campaigns.ts:875 (US-KY only); civil-personnel MN/AK branches.
    - demo.ts:109 and demo-jurisdiction-context.ts:15: Lexington placeholder default.
    - presidential-turnover.ts:787/892: each state repeats its 2024 vote share.
    - income-tax-withholding.ts:73: FEDERAL_INCOME_TAX_2026 used for every year.

Others:
- place-outcomes.ts:239: the monthly pass runs only for CRUNCH46-opening worlds.
- place-outcome-store.ts:213: D.C. has no outcome key.
- relocate.ts:335 + migration/review.ts:288: the observer anchor's household can move away, which stops all town reviews.
- member-agenda.ts:968: one failed placement drops the whole filing batch.
- legislative-clock.ts:1381: blocked steps are terminal (examples at :832, :910, :381).
- enacted-duties.ts:391-397/444: findings are never "complied", and "conditional" coverage reaches nobody.
- coverage eligibility runs only on lease renewal.
- federal-reform.ts:373: the two-thirds count is computed and then dropped.
- vitality-integrity.ts:29: legacy key "vitality:mortality-check" has no handler, so an old save would throw (unverified).

## Category 3 — declared but never invoked

Counts:
- **Handlers defined but not registered: 3**
  - policy-semantics.ts:609 policyRealizationTransitionHandler. Its scheduler, :577 schedulePolicyEstimateRealization, also has no caller.
  - incidents.ts:485 incidentTransitionHandler. Its scheduler, incidents.ts:444 scheduleIncidentTransition, has no caller.
  - presentation/executive-entry.ts:60 executivePlayHandlers.
- **Registered but never scheduled: 2**
  - campaigns.ts:2423 `living-world:development-step` (background developments never step).
  - state-governing.ts:3989 STATE_LEGISLATURE_OPENING. Its only scheduler, state-legislature-opening.ts:178 scheduleNationwideStateLegislatureOpenings, has no caller.
- **Law consequence modules:**
  - 4 of 13 consequence kinds never get their apply function called: right-permission, institution-rule, government-operations (3 rows at government-operations-rows.ts:57 attached to no question), and development-incentive.
  - 6 module manifests register nothing.
- **Exported functions in src/simulation and src/presentation that no other non-test src file references: 526 of 5,477.**
  - 366 are used only by tests, 39 only by scripts, and 121 nowhere.
  - The full lists are in the scratchpad: dead.txt and dead.txt.nowhere.
- **Unreachable files:** 74 per tentacles.md; 58 within simulation and presentation.

Top 10 never-invoked items that matter:
1. policyRealizationTransitionHandler + schedulePolicyEstimateRealization (policy-semantics.ts:609/577)
2. settleFederalTreasuryMonth + FEDERAL_LAW_EFFECTS (federal-treasury.ts:244/87)
3. settleLocalBusinesses / refreshLocalEconomy / settleBusinessMoney (local-economy.ts:709/725/701)
4. Benefit formulas: retiredWorkerBenefitMinor, foodAidBenefitMinor, primaryInsuranceAmountMinor and 3 more (public-benefit-formulas.ts:23-164). No money is ever paid to individuals; SNAP writes participation only.
5. development-step handler (developments.ts:46) and submitPublicComment (:39)
6. scheduleNationwideStateLegislatureOpenings (state-legislature-opening.ts:178)
7. recordDevelopmentIncentiveAward (law-consequences/modules/lw08-development-incentive-cap/index.ts:148)
8. incidentTransitionHandler / scheduleIncidentTransition (incidents.ts:485/444)
9. applyDisasterHandlingReactions (crisis/handling-reactions.ts:162) and actForSharedCauseGroup (living-world/law-interest-groups.ts:444)
10. withHousingSupplyLawStamps (housing-market.ts:257), enforcementPriorityForLaw (state-governing.ts:1756), officeConsequences (office-consequence.ts:569), applyForPermit (permits.ts:41)

Correction to the earlier audit:
- enacted-duties no longer has hasWorkers; coverage is by organization classification.
- US_CONGRESS_PACK_ID is down from 42 lines to 15.
