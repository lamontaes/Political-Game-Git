# GOVERNING engine findings (read-only analysis, origin/main)

Scope note: units.csv lists 133 source files / ~1,600 units here (RULE 586, DATA 176, PLUMBING 505, DEAD 131, TYPE 420). `src/simulation/nationwide-world/` is split across engines (governing owns local-governments, state-executive-terms/rules, county-row-offices, DC identity; elections owns the turnover handlers). `src/environment/` is 219 units, all scene/venue specs and a reference corpus, none of it simulation.

## 1. SAMPLE AUDIT (31 units; the sample file has 30 newline-counted rows)

src/simulation/crisis/hazard-producer.ts:369 STATE_FIPS TOOL=DATA YOU=DATA per-state code table in .ts
src/environment/environment-scene-spec.ts:679 GEOMETRY_AUTHORITY_GRADES TOOL=DATA YOU=PLUMBING enum membership set for validation
src/environment/environment-scene-spec.ts:504 FORESHORTENED_SURFACE_KINDS TOOL=DATA YOU=DATA two-row list
src/environment/reference/corpus.ts:38 cite TOOL=DEAD YOU=DEAD used only in corpus.ts; corpus reached only by reference.test.ts
src/simulation/office-salary.ts:206 initializeOfficeSalaryFlows TOOL=DEAD YOU=DEAD only office-staff-salary-a41.test.ts calls it
src/environment/reference/corpus.ts:36 current TOOL=DEAD YOU=DEAD date-range constant in same test-only corpus
src/simulation/governing/automatic-legislation.ts:629 hasRegisteredOperativeEffect TOOL=PLUMBING YOU=PLUMBING draft-shape validator, number equalities
src/simulation/governing/chamber-procedure.ts:199 amendmentAccessRule TOOL=PLUMBING YOU=RULE per-chamber fact (US House structured) plus change lookup
src/simulation/crisis/handling-reactions.ts:154 resolveDisasterHandlingReactions TOOL=PLUMBING YOU=PLUMBING loops campaigns, writes support records
src/simulation/civil-personnel-integrity.ts:120 personnelHistoryRecords TOOL=PLUMBING YOU=PLUMBING history table accessor
src/simulation/civil-personnel-start.ts:74 must TOOL=PLUMBING YOU=PLUMBING unwraps writer result or throws
src/simulation/governing/office-continuity.ts:583 senateAppointmentHandler TOOL=PLUMBING YOU=PLUMBING one-line delegate to seatNewMember
src/simulation/governing/state-governing.ts:218 controlledPersonId TOOL=PLUMBING YOU=PLUMBING reads world.control
src/simulation/governing/final-law-term-query.ts:143 structuredQueryDate TOOL=PLUMBING YOU=PLUMBING as-of date gate against world.currentDate
src/simulation/civil-personnel-actions.ts:443 organizationJurisdiction TOOL=PLUMBING YOU=PLUMBING profile lookup
src/simulation/transit-funding.ts:50 resolveTransitFunding TOOL=PLUMBING YOU=PLUMBING adapter over lineages; 365-day window buried inside
src/simulation/crisis/fatal-illness.ts:106 fatalIllnessOnsetHandler TOOL=PLUMBING YOU=PLUMBING due-item wrapper around remainingDaysAfterOnset
src/simulation/governing/committee-assignment.ts:74 committeesForMember TOOL=PLUMBING YOU=RULE pure filter over pure roster dealing; no World
src/simulation/governing/congress-chambers.ts:44 isCongressMeasure TOOL=RULE YOU=RULE thin pure predicate
src/simulation/crisis/death-causes.ts:123 deathCausePhrase TOOL=RULE YOU=DATA prose phrase lookup
src/simulation/municipal-public-work.ts:634 corpusProvenance TOOL=RULE YOU=PLUMBING builds history provenance record
src/simulation/governing/office-consequence.ts:72 endsTerm TOOL=RULE YOU=RULE tiny pure kind predicate
src/simulation/crisis/death-causes.ts:39 MORTALITY_CAUSE_KEY TOOL=RULE YOU=PLUMBING history key constant
src/simulation/governing/law-in-force.ts:524 startingLawTermScope TOOL=RULE YOU=PLUMBING reads a LawInForce row field
src/simulation/civil-personnel-actions.ts:545 positionDescriptor TOOL=RULE YOU=PLUMBING record-text formatter
src/simulation/governing/office-continuity.ts:1530 ageOn TOOL=RULE YOU=RULE pure age arithmetic
src/simulation/governing/state-governing.ts:168 STATE_GOVERNING_VERSION TOOL=RULE YOU=PLUMBING save/record version string
src/environment/environment-scene-spec.ts:1132 isFiniteNumber TOOL=RULE YOU=PLUMBING validator helper
src/simulation/governing/supreme-court-appointment-profile.ts:1 SUPREME_COURT_APPOINTMENTS_VERSION TOOL=RULE YOU=PLUMBING version string
src/simulation/initiator-occasions.ts:126 weekday TOOL=RULE YOU=RULE pure date helper
src/simulation/governing/finding-restitution.ts:259 formatDollars TOOL=RULE YOU=PLUMBING player-text money formatter
agreement 19/31. Main misclassification: the tool calls "pure helper" constants, version strings, formatters and validator helpers RULE because they touch no World. The disagreement runs the other way once: it calls two small pure filters PLUMBING. DEAD flags were right, but "dead" for environment/reference means "test-only", not unused by its own file. Note PLUMBING is generous on `resolveTransitFunding` and `amendmentAccessRule`, which hide real rules.

## 2. MAP

- Executive desk (governor/mayor/president work): executive-work.ts (receive/act/defer/sign/veto actions, inbox sync), executive-work-context.ts, executive-work-entry.ts, executive-governing-kernels.ts + kernel-bank (24 of 92H's 70 workflow kernels compile, 46 refuse), governing/state-governing.ts (4,038 lines: E1 agenda, E2 chief of staff, E3 bill presented, E4 budget, G1 agency report; clemency, orders, regulations as "matters"). Writes history.workItems/workItemStates, executiveDispositions, legislativeActions, evidenceArtifacts, events, futureDueItems. Driven by stateGoverningHandlers() (due items) plus player actions. Readers: presentation/executive-*, player/GoverningBriefing.tsx, campaigns.ts.
- Executive authority: executive-authority-rules.ts, -rule-packs.ts (data via researchRuleTable("executivePacks")), -game-profile.ts (estimates unread places), executive-action-authority.ts:37, governing/question-authority.ts:252 (data/research/powers-catalog), institution-authority.ts. Pure reads; no writes.
- Bill desk: governing/governor-bill-decision.ts:384, item-veto.ts, executive-budget-requests.ts, executive-bill-roster.ts. A governor signs or vetoes by weighing principles, sponsor party, party vote, relationship, override count, chief-of-staff advice (decision traces in history.decisionTraces).
- Office staffing, pay, transition: governing/office-staffing.ts, office-staff-hiring.ts, staff-evidence.ts, civil-personnel*.ts (sourced discipline/appeal/reinstatement procedures from civil-personnel-sources.generated.ts, 3,886 lines), office-pay.ts (Book of the States rows plus rank-weighted estimate), office-salary.ts (weekly pay flows through history.resourceFlows), office-transition.ts, office-workflow.ts. Tables: history.personnelRecords, officeStaffPositions/Incumbencies, workRelationships, resourceFlows. Driven by paydayHandlers and the player's Personnel panel.
- Office continuity and succession: governing/office-continuity.ts (death/incapacity notices -> VP succession, House special election, Senate appointment, VP/Chief Justice nominations), office-consequence.ts, supreme-court-appointments.ts, chief-justice-vacancy.ts, federal-tenures.ts, crisis-office-continuity.ts. Driven by officeContinuityHandlers() and crisis notices.
- Public programs and services: governing/public-program.ts (appropriation -> commitment -> installment -> outturn), program-governing.ts (enacted measure -> appropriation), repair-funding.ts, public-program-transit.ts, transit-service.ts, transit-funding.ts, county-services.ts, public-service-producer.ts (residents weigh asking on payment day), public-service-requests.ts, monthly-service-receipts.ts, service-delivery-response.ts, constituent-casework-routing.ts, municipal-public-work.ts (install a city government, attend meetings, propose ordinances). Tables: history.publicProgramRecords, policyRealizations, effectActivations, metricStates, resourceTransferOutcomes, futureDueItems. Drivers: publicProgramHandlers(), publicServiceHandlers(), createTransitTransitionRegistry(), countyBudgetHearingHandlers(), councilActHandlers().
- Crisis (non-health): crisis/hazard-producer.ts (monthly storm sampling from STORM_CATALOG), disaster.ts (damage, state request, federal declaration, repair queue), handling-reactions.ts, international.ts (tension cycles, War Powers 2/60/30-day clocks), outside-shock.ts, official-funeral.ts, offices.ts, records.ts (history.crisisRecords). Driven by createCrisisTransitionRegistry().
- Nationwide structure: nationwide-world/state-executives.ts (generated incumbents per state), state-executive-term-rules/-terms, executive-term-limits, local-governments.ts, county-row-offices, government-units.ts (Census units), local-institutions.ts. Mostly data resolvers; writes incumbents on world creation.
- src/environment/: scene specs and Drive inventory. No World. Presentation-only; port as asset data, not engine.

## 3. STOPGAPS

Marker counts over 133 files: SET BY HAND 0; GAME ASSUMPTION 3; NOT MODELED 2; PLACEHOLDER 9; UNRESEARCHED 9 (other spellings); ESTIMATED FROM AVERAGE 9; "game-profile" 92 mentions; "fictional" 51. data/ JSON imported by these files: 0 markers.
Most important:

- governing/office-continuity.ts:181,1347,1380,1395 PLACEHOLDER Senate vacancy appointment, governor's successor, unknown filling route, VP nomination/confirmation pace.
- governing/office-staff-hiring.ts:97 PLACEHOLDER legislator staff profile (two positions for every member).
- governing/office-consequence.ts:361 PLACEHOLDER resignation news tiers (owner direction, not sourced).
- governing/officeholder-principles.ts:19,195 PLACEHOLDER principle weight thresholds and lean points.
- governing/state-governing.ts:1079 PLACEHOLDER no governor clemency deadline.
- governing/constituent-views.ts:29 GAME ASSUMPTION moderate versus slight at two-to-one; also uses UNRESEARCHED_ISSUE_RECORD weights.
- governing/item-veto.ts GAME ASSUMPTION (header): floor-amendment sections count as vetoable items.
- office-pay.ts:47,264 GAME ASSUMPTION judge pay reading and raise timing; :268 NOT MODELED Congress pay by statute.
- nationwide-world/executive-term-rules-in-world.ts:35 NOT MODELED term change for sitting holder.
- crisis/disaster.ts:662 UNRESEARCHED governor request with no damage; PROVISIONAL_DISASTER_POLICY (:68) and PROVISIONAL_INTERNATIONAL_POLICY (international.ts:58) carry every day count and share.
- crisis/handling-reactions.ts:39 DISASTER_HANDLING_ESTIMATE, epidemic.ts:89 EPIDEMIC_ESTIMATE, official-funeral.ts:50: ESTIMATED FROM AVERAGE tables (marked correctly).
- state-funded-service-game-profiles.ts:10,70-190 fictional KY/MN/NV profiles (5%, 4.5% rates, 24/12 and 134/67-member panels).
- governing/committee-assignment.ts, office-staffing.ts: authored rosters/positions, no source.
  Dice and seeded picks:
- crisis/disaster.ts:148-150,289-290,480,502,521: seeded micro-draw against a policy probability decides which home is damaged or destroyed, who dies, who is injured, which organization is hit. This is a no-dice violation.
- crisis/hazard-producer.ts:258-327: Poisson draw per state/family/month then rng.pick of a recorded episode. Hazard-record driven, but a monthly chance. Rate is real; outcome is a draw.
- nationwide-world/presidential-turnover.ts:398-404 drawState weighted by electors for an invented nominee's home; governing/constitutional-amendments.ts:109 per-state ratification delay drawn between min and max days (spread, not decision).
- governing/office-continuity.ts:660,777 and state-governing.ts:1794, nationwide-world/state-executives.ts:285,424, civil-personnel-start.ts:165: SeededRng names, identities, birthdates for invented people (allowed: seeded pick among real options, though parentage is not used).
- executive-authority-game-profile.ts:145-156 FNV hash of jurisdiction key picks among read states' values for unread places (allowed as a spread, but hash by key).
- Decisions through evaluateDecision use randomness "none" (public-service-producer.ts:204), so governor, resident and counterparty choices are not dice.
  Place names in logic:
- transit-funding.ts:79 message "compiled only for Alaska" plus legacy compiled-state gate (legislation-transit-families.ts:12, data-driven); state-funded-service-game-profiles.ts:10 type union of US-KY/US-MN/US-NV with per-state rows; nationwide-world/chief-executive-commencements.ts:27-93 AK/FL/LA/ME/VA rows; government-unit-names.ts:100 LA/AK unit nouns; local-governments.ts:262 New England list; political-culture.ts:31 territory list; state-jurisdiction-id.ts:11 "us-ky-commonwealth-placeholder" id; executive-governing-kernel-bank.ts titles (Texas pattern etc., strings); crisis/hazard-producer.ts STATE_FIPS. These are mostly per-place tables in .ts, not branching on a name; transit-funding.ts:79 and the KY/MN/NV profiles are real special cases.

## 4. KEEPERS

1. nationwide-world/state-executive-term-rules.ts:450-543 (generalElectionDay, nextRegularElection, commencementAfter, termDatesAfterElection, regularTermWindowOn): pure calendar math from a term-rule row. Input: rule row plus year. Not entangled.
2. nationwide-world/executive-term-limits.ts:76,210 (parseTermLimitCode, checkExecutiveTermLimit): consecutive/lifetime term-limit check. :133 and :179 read World for prior terms; take a list of past terms instead.
3. executive-action-authority.ts:37 decideExecutiveActionAuthority: order/regulation clause vs office pack and delegating law, with refusal reasons. Inputs: pack, clause, law. Pure.
4. governing/question-authority.ts:252 questionAuthority: yes/no/unknown from powers catalog, home-rule and state gate. Needs catalog rows and jurisdiction level; slightly World-typed (policyCatalog).
5. governing/governor-bill-decision.ts:179-384 governorConsiderations/evaluateGovernorBill: the signing reasons list. Entangled in World reads of votes, relationships and principles; becomes an offer scorer on core2's shared chooser.
6. governing/budget-stakes.ts:42-91 fiscal-year distance weight as a consideration. Needs fiscal-year start and today.
7. governing/constituent-views.ts:44 plus distinguishable (z=1.96 lean test). Needs per-voter views as a list.
8. office-pay.ts:139 estimatedStatePay (rank-by-region-then-income reciprocal weights) and office-salary.ts:131 annualPay fallback chain. Needs office, state, sourced rows; only a cache key reads World.
9. crisis/disaster-warrants.ts:16,27 stateRequestWarranted/federalDeclarationWarranted. Pure; replace ranks with a continuous damage-need measure.
10. governing/staff-evidence.ts:95 staffAssessment: what a hiring office can know of a candidate. Needs career/education evidence rows.
11. governing/committee-assignment.ts:48 committeeRosters: deterministic seniority dealing, no World.
12. civil-personnel-actions.ts:96,219,678 procedureApplicability, personnelAuthority, assessPersonnelDiscipline over civil-personnel-jurisdiction-rules.json: sourced procedure gates; need position/incumbency rows and procedure rows.
    Also: executive-governing-kernels.ts:699 compileExecutiveGoverningPlan (pure, 345 lines), governing/public-program.ts installment/outturn arithmetic (cash and authority checks).

## 5. CORE2 MODULE INPUTS

State owned (Maps keyed by id): offices (key, jurisdiction, holder, term start/end, powers pack id); matters/workItems (office, family, options, status, deadline); programs (appropriation, commitments, installments, capacity units); positions and incumbencies (office staff, civil-service class); pay flows; crisis episodes (hazard, damage, response stage, repair queue); international crises; personnel matters. Indexes: officesByJurisdiction, officeByHolder, mattersByOffice, commitmentsByProgram, positionsByOrganization, residentsByServiceArea (so the payment-day ask loop stops scanning every adult).
Acts (actor, target, prerequisite, effect): sign/veto/return a bill (governor, measure, in action window, writes disposition); delegate/defer matter; appoint chief of staff or staff (holder, candidate, open position, writes incumbency and employment); issue executive order or regulation (authority check passes); commit appropriation (office with standing, program, cash and authority present, schedules installments); request public service (resident, operator, living in service area, books trip); attend council meeting / propose ordinance (member or resident, standing); open/route constituent case; issue discipline, appeal, reinstate (appointing authority, employee, procedure applicability); request disaster declaration (governor), grant it (president); respond to international crisis (president).
Effects: money transfer from public account, relationship and knowledge updates, work relationship start/end, pay start, program capacity change, damage and repair progress.
Events (typed): office.vacated, office.succeeded, office.term-began, bill.signed/vetoed (public, news), program.committed, installment.posted/failed (public record), service.delivered, personnel.discipline-issued, hazard.declared, disaster.declared/denied (news), crisis.escalated, war-powers.report-due.
Calendar: calendar tier for election days, term commencements (term-rules rows), fiscal-year start, session timetable from governing-calendar.ts, payday four-weekly, installments on due date, quarterly local agenda, War Powers 2/60/30-day clocks. Daily tier: player-circle residents' asks; weekly: hazard repair cycle.
Reusable data: data/research/powers-catalog/{catalog,question-powers}.json, civil-personnel-jurisdiction-rules.json, county-row-offices-by-state.json, county-governing-bodies.json, places/local-institutions.json (11 MB), money/place-population-acs-2024.json, state-household-income-cps-2023.json, executivePacks rule table, office-pay.generated.ts, government-units.generated.ts, storm-catalog.generated, chief-executive-baseline.generated.ts.

## 6. DEPENDENCIES AND RISKS

Needs first: people/households/relationships, work and organizations, money accounts, calendar/due items, decision chooser with considerations, law-in-force and legislation (measures, enactments), elections (office holders and results), press/news emit. Legislatures engine for chambers and votes (governor weighs members' votes).
Riskiest:

1. state-governing.ts (4,038 lines) and executive-governing-kernel-bank.ts (3,612): huge, matter-by-tag linkage (`matter:<event id>`), 5 families in one file; port by family.
2. History-coupled adapters: transit-funding.ts, program-governing.ts (appropriationFromEnactedMeasure 350 lines), automatic-legislation.ts read legislative lineages/drafts; core2 needs a measure/enactment contract first.
3. civil-personnel-integrity.ts and assertWorldIntegrity calls (disaster.ts, others): whole-world validation that core2 drops; invariants must become module tests.
4. Dice: disaster damage/death/injury draws and monthly Poisson hazards must become exposure-driven (building age, elevation, hazard record) before port.
5. Per-place tables in .ts (state-funded-service-game-profiles, chief-executive-commencements, STATE_FIPS, 3,886-line civil-personnel sources) and KY/MN/NV/Alaska special cases against one-rule-all-places.
6. Save format: IDs, `stableKey` strings, `governing:*` transition keys and version constants (STATE_GOVERNING_VERSION) are persisted; core2 loses old saves unless mapped.
7. Speed: produceResidentServiceRequests loops every adult of a place on payment day; scheduled-conflict checks per person.

## 7. LIFE-REPLAY STEPS

- office-service (wes-moore governor-service, AOC us-house): partly. This engine owns governors, mayors and executive term data (state-executives.ts, term rules); legislators belong to legislatures/elections. Lacks: a seating act that takes an existing real person and a start date (it currently invents incumbents, state-executives.ts:285-300).
- office-succession (LBJ 1963): supplies it fully for the VP-to-President route (office-continuity.ts, statutoryPresidentialSuccessor:1036); governor succession is a PLACEHOLDER (:1347) and Senate appointment pace is hand-set.
- law-signature (LBJ civil rights, voting rights): supplies governor-bill-decision for governors only; no presidential signing decision by a real named person with sourced reasons; missing a president bill-desk (presentation window exists, executive-bill-roster).
- public-appointment (LBJ NYA director): partly; staff-hiring and civil-personnel give appointments to positions in offices and agencies, but no federal agency-director appointment with a confirmation path.
- military-authorization-request (Tonkin) and military-deployment (Moore Afghanistan): partly. crisis/international.ts has tension, force-posture and War Powers records but no request-for-authorization act nor an individual's deployment record; military-deployment belongs elsewhere (not found in this engine).
- reelection-decision (LBJ decline): lacks; governor candidacy intent exists (state-executive-turnover.ts:72 recordGovernorCandidacyIntent) for governors, nothing for a president declining.
- employment (aide, teacher, Robin Hood CEO): supplies only public-office staffing and civil-service positions; ordinary employment belongs to economy.
- chamber-leadership, legislative-proposal, candidacy, election-result: other engines (legislatures/elections); governing provides the term windows and succession they feed.
- cause-participation, partnership, residence-move, education-*, family-loss, health-shock, business-formation, military-service: not this engine (health-shock only via crisis mortality, which belongs to health).
