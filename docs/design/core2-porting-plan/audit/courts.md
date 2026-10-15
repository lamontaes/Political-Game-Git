# Courts and justice: P11 findings

Totals from units.csv: 793 units (RULE 284, PLUMBING 264, TYPE 147, DATA 65, DEAD 33). 83 RULEs are entangled with World. The engine file list also pulls in five governing/ files (Supreme Court appointments, Chief Justice vacancy, court-size law, finding restitution).

## 1. Sample audit

(paths under src/simulation/)

- judiciary/philosophy.ts:174 recordJudicialPhilosophyAtSeating TOOL=PLUMBING YOU=PLUMBING wrapper that writes a World record
- incident-integrity.ts:547 validateMetricValue TOOL=PLUMBING YOU=PLUMBING save-integrity throw on kind/unit mismatch
- judicial-office-work.ts:223 receiveJudicialOfficeWork TOOL=PLUMBING YOU=PLUMBING looks up roles, records an authored event
- judiciary/courts.ts:691 requireSeat TOOL=PLUMBING YOU=PLUMBING lookup in world.judiciary, throws
- justice/clemency.ts:1050 grant TOOL=PLUMBING YOU=PLUMBING writes grant event, builds report text
- justice/court-reasoning.ts:539 mandatoryJailUnderLaw TOOL=PLUMBING YOU=PLUMBING thin wrapper over the binding check
- incident-integrity.ts:28 SEMANTIC_KEY TOOL=PLUMBING YOU=PLUMBING validator regex
- judicial-office-start.ts:27 initializeJudicialOfficePractice TOOL=PLUMBING YOU=PLUMBING custom-start setup writing people and history
- justice/clemency-records.ts:27 PETITIONER_ROLE TOOL=PLUMBING YOU=PLUMBING participant role string for history queries
- judicial-gameplay-kernels.ts:290 compileJudicialGameplayKernel TOOL=PLUMBING YOU=PLUMBING compiles authored workflow rows, validates
- incident-catalog.ts:350 assertSemanticKey TOOL=PLUMBING YOU=PLUMBING validator
- judicial-gameplay-kernels.ts:680 assertDefinition TOOL=PLUMBING YOU=PLUMBING duplicate-key validator
- justice/pretrial.ts:85 recordedChargeBailMinorUnits TOOL=RULE YOU=PLUMBING parses a bail tag off a history event
- justice/appeals.ts:34 APPEAL_DECIDED_EVENT TOOL=RULE YOU=PLUMBING event-type string
- citizenship.ts:18 citizenshipStatusOf TOOL=RULE YOU=PLUMBING cutoff-checked lookup that re-validates history events
- justice/clemency.ts:181 routeFor TOOL=RULE YOU=PLUMBING assembles place, referral, office reads; gate logic is clemencyGateFor
- justice/court-reasoning.ts:52 PLEA TOOL=RULE YOU=PLUMBING option-key constant
- crime/offenders.ts:186 diplomaWeight TOOL=RULE YOU=RULE pure weight from recorded diploma
- justice/appeals.ts:33 APPEAL_FILED_EVENT TOOL=RULE YOU=PLUMBING event-type string
- judiciary/judicial-review.ts:348 justiceVotes TOOL=RULE YOU=RULE per-justice considerations into a decision (entangled)
- justice/jury-catchment.ts:15 juryCountyForPlace TOOL=RULE YOU=RULE plurality county from share data, ties give null
- crime/reporting.ts:198 policeContact TOOL=RULE YOU=PLUMBING counts events by scanning all history
- crime/producer.ts:110 monthKeyOf TOOL=RULE YOU=PLUMBING date.slice(0,7) helper
- judicial-office-work.ts:50 JUDICIAL_OFFICE_CLASSIFICATION TOOL=RULE YOU=PLUMBING tag string
- justice/appeals.ts:222 APPEAL TOOL=RULE YOU=PLUMBING option-key constant
- justice/clemency-rules.ts:292 clemencyModelOf TOOL=DEAD YOU=DEAD only clemency-rules.test.ts calls it
- judiciary/courts.ts:675 vacantSeatsAt TOOL=DEAD YOU=DEAD only courts.test.ts calls it
- citizenship.ts:114 recordCitizenshipTransition TOOL=DEAD YOU=DEAD only citizenship.test.ts calls it
- justice/court-reasoning.ts:65 PUBLIC_TRUST_OFFENSES TOOL=DATA YOU=DATA offense-key set read at :657
- justice/clemency-decisions.ts:11 CLEMENCY_PETITION_DECISION TOOL=DATA YOU=DATA decision declaration row (the "literal 0.94" reason is spurious)
- incident-catalog.ts:36 ZERO_SHARE TOOL=DATA YOU=PLUMBING exact-quantity constant for comparisons

agreement 20/31. Main error: the tool calls RULE any small string constant, tag parser or history-scanning helper that has a number or comparison in it (event-type names, option keys, `slice(0,7)`, event counters). Its PLUMBING and DEAD calls were all right. Its DATA reasons ("literal 0.9x") are nonsense even when the class is right.

DEAD caution: by grep, `appealSavedSentence` (justice/appeals.ts:80, 141 lines), `fileJudicialChallenge` (judicial-review.ts:127), `postCashBail` (prosecution.ts:1459), `addJudicialCourt`, `addJointJudicialSeatAllocation`, `advanceClemency` (clemency.ts:1132) have no non-test caller. Appeals and bail-posting are complete but unreachable from play.

## 2. Map

- **Crime production** (crime/producer.ts, offenders.ts, reporting.ts, causes.ts, contract.ts, dated-inputs.ts). A monthly future-due item (`crisis:crime-sample`, scheduled by `ensureCrimeProduction` from presentation/opening-life.ts:457, handler registered in crisis/index.ts:105) accumulates per-target exposure from NCVS rates (assault, robbery, burglary, vandalism only) times outcome-web multipliers, and writes `crime.*` events. It also writes a town police log for unnamed residents. Victims decide whether to report (`decideReport`); the player decides in play (`reportOffenseToPolice`, presentation/adult-life.ts:632). `arrestReferral` (producer.ts:960) picks the highest-weight eligible offender and calls `referForProsecution`. Readers: pressure/causes.ts, press/story-voice.ts, adult-situations.ts, life-opportunities.ts.
- **Prosecution and trial** (justice/prosecution.ts, prosecution-transitions.ts, prosecution-timing.ts, court-reasoning.ts, courtroom-sitting.ts, jury-catchment.ts). All case state is history events (`justice.prosecution-referred`, `justice.charged`, `justice.plea-entered`, `justice.mistrial`, `justice.sentenced`, `justice.case-ended`), scanned by tag. A `justice:prosecution-stage` due item calls `advanceProsecutions`. Prosecutor charges, defendant pleads, jury votes, judge sentences, each through `evaluateDecision` with `randomness: "none"`. Other referral writers: justice/finding-referral.ts (press findings), county-office work.
- **Pretrial and bail** (pretrial.ts, cash-bail.ts, jail-absence.ts, jail-terms.ts). Bail amount comes from enacted law or from comparable charges in history; held and released events; `settleJailAbsences` sets jobs to `temporarily-inactive`. Readers of `jailTermOn`: campaigns.ts:998 and :2789, living-world/town-employment.ts, town-businesses.ts, relationship-absence.ts, campaign-weekly-plans.ts.
- **Sentencing** (sentencing-ranges.ts, sentencing-term.ts, sentencing-applicability.ts, law-consequences/modules/justice-sentencing-landings). Sourced per-place ranges (data/research/justice/sentencing-ranges-2026.json), judge picks among min, presumptive, max.
- **Clemency** (justice/clemency.ts, clemency-rules.ts, clemency-reasoning.ts, clemency-transitions.ts). Data-driven gates per place (data/research/clemency/clemency-gates-2026.json); a petition is a history event with its own due item; the person decides whether to ask (`decideWhetherToAsk`), the holder or board decides. Unseated boards use a hand-set reading (clemency.ts:109).
- **Voting standing and citizenship** (voting-standing.ts, citizenship.ts, citizenship-creation.ts). Felony (>12 months) suspends voting while serving; return follows the law in force. Citizenship is per-person records, seeded at creation; readers include candidacy.ts. No in-game naturalization or loss.
- **Judiciary** (judiciary/courts.ts, opening.ts, court-for.ts, profiles.ts, philosophy.ts, judicial-review.ts, generated/*). `world.judiciary` holds courts, seats, tenures, rule versions. `ensureOpeningJudiciary` seats fictional judges. Only US Supreme Court and Chief Justice seatings exist (governing/supreme-court-appointments.ts:993, chief-justice-vacancy.ts). Judicial review runs on the date boundary (time-work.ts:2124). Each judge gets a recorded philosophy at seating that colors sentencing and review.
- **Judicial office work** (judicial-office-_.ts, judicial-gameplay-kernel_.ts). Authored fictional workflows for a Custom-Start judge-staff player (60 kernels, many mechanic-gated). UI: player/JudicialOfficeWork.tsx.
- **County justice offices** (county-offices.ts, county-office-work.ts, county-office-reflection.ts). Sheriff and prosecutor holders; work summaries read jail population and cases from history.
- **Juvenile court** (juvenile-court.ts, juvenile-law-term.ts): only the adult-court age rule from law, no juvenile docket.
- **Incident framework** (incidents.ts, incident-response.ts, incident-catalog.ts, incident-integrity.ts): generic hazard/crisis incidents and the executive's response work. It belongs with pressure/crisis, not courts; consumers pressure/ladder.ts, IncidentResponsePanel.tsx.

## 3. Stopgaps

Markers in engine files: SET BY HAND 0, GAME ASSUMPTION 0, NOT MODELED 0, PLACEHOLDER 2. ESTIMATED FROM AVERAGE appears 24 times (the project's live marker here).

- justice/clemency.ts:99 PLACEHOLDER UNSEATED_BODY_READING: unseated boards wait 30 days, serve 50%, refuse violent offenses.
- justice/clemency.ts:117 PLACEHOLDER NEARLY_SERVED_DAYS = 60 (nobody petitions this near release).
- justice/prosecution.ts:142 PROSECUTION_ESTIMATE: charge-decision 60 days, two hung juries before dismissal.
- justice/prosecution.ts:172 JAIL_EFFECTS_ESTIMATE: jailed officeholder always removed, jailed candidate never campaigns, everywhere.
- justice/court-reasoning.ts:277 JURY_PANEL_ESTIMATE: 12 jurors in every place.
- justice/jail-absence.ts: employer always holds the job during jail (no employer decision).
- justice/voting-standing.ts: voting suspended while serving a >12-month sentence everywhere.
- crime/contract.ts:41: one national rate table for every town; four offenses only; no vehicle theft, no other crime.
- crime/contract.ts (town log): same expectation for every town, not scaled to population.
- crime/causes.ts:34 CRIME_CAUSE_SEAMS: poverty, policing, enacted law are `not-built`; only unemployment is wired.
- crime/producer.ts:189 VICTIM_EXPOSURE_ESTIMATE, reporting.ts:59 REPORTING_WEIGHTS, offenders.ts:54 OFFENDER_WEIGHTS: hand-tuned point weights.
- judiciary: courts exist for the opening; state and local judges have `termEndsAt` and `retentionDueAt` null (judiciary/opening.ts:208-212). Selection profiles are loaded data only.
- justice/clemency.ts:181 routeFor: sentences do not record felony class, so "prior felonies" gates fall back to counting sentences.
- judicial-office-start.ts:27: age 25 boundary is declared authored, not law.

**Dice / seeds.** `randomness: "none"` on every decision. Seeded draws found: jury panel by lot from the eligible pool (court-reasoning.ts:291, defensible: the law prescribes it); opening judge identity, home and career (judiciary/opening.ts:109-151, seeded pick among real options at creation); opening exposure fraction (crime/producer.ts:461, starting spread, "never decides whether an offense happens"); citizenship starting status pick (citizenship-creation.ts:29); judicial office start identities (judicial-office-start.ts:97). No Math.random.
**Place names / ids in logic.** No state or city names. Federal structural ids `us-supreme-court`, `us-fed`, `us-chief-justice` are hardcoded (courts.ts:140-500, types.ts:83). Court homes are matched by jurisdiction name strings (opening.ts:60-70). Kentucky/Texas/Virginia appear only in citation text in judicial-gameplay-kernel-bank.ts.

## 4. Keepers

1. court-reasoning.ts:137 pleaConsiderations, :343 jurorConsiderations, :580 sentencingConsiderations, :697 evaluateDetention: lists of weighted reasons (direction, importance) from case facts. Entangled (take World for offices, traits, priors). Port as trait/need pulls: inputs are CourtCase facts, the person's offices held, priors count; replace `registeredTraitConsiderations` with the shared chooser.
2. justice/sentencing-term.ts:49 evaluateCustodyTerm and sentencing-ranges.ts:114 sentencingRangeForCase: choose min/presumptive/max in a sourced range; applicability gating (weapon, dwelling, grade). Range lookup is pure (needs CourtCase and JSON); the term choice reads judge principles.
3. justice/clemency-rules.ts:255 clemencyGateFor, :280 clemencyBody (pure over JSON rows) plus clemency.ts:448 decideWhetherToAsk (entangled: sentence, relationships, calendar).
4. crime/producer.ts:427 exposureDays and :242 crimeExposures: deterministic accumulation of exposure into an offense day. exposureDays is pure; crimeExposures reads people, households, offense history. Port as per-place tier data, not whole-world scans.
5. crime/reporting.ts:239 reportConsiderations, offenders.ts:402 offenderWeight and :186 diplomaWeight: victim reports from harm, history and temperament; offender weights from age, work, record, risk tendency. Entangled on relationships and records; need `observe` of those per person.
6. justice/voting-standing.ts:42 isFelonySentence and the standing union: pure given a sentence record.
7. justice/jury-catchment.ts:15 juryCountyForPlace and court-reasoning.ts:225 juryPool: catchment and voir dire (exclude people who know the defendant). Pool needs the relationship index.
8. justice/juvenile-court.ts:30 juvenileCourtAgeRuleAt: age ceiling from law with a peer-mode fallback. Takes World only for the law lookup.
9. justice/pretrial.ts:120 newChargeBailAmount: bail from operative law, else comparable charges in the same court cohort. Entangled; needs a bail table by court and offense instead of a history scan.
10. judiciary/judicial-review.ts:348 justiceVotes and philosophy.ts:313 judicialOutlookConsideration: justice votes from recorded outlook and precedents (data/research/laws/judicial-review-precedents-2026.json).
11. governing/supreme-court-appointments.ts:210 candidateReasons, :360 senatorReasons: nominee and confirmation reasoning (belongs to the governing/appointments port).
12. prosecution-timing.ts:55 prosecutionTimingFor: sourced median days per place.

## 5. Core2 module inputs

**State owned.** `cases` by id (referral, charge, plea, trial, sentence, appeal, status), index by defendant, by court, by prosecutor; `holds` and `jailTerms` by person (so jail checks are O(1)); `courts`, `seats`, `tenures` by id with `courtsByPlace` and `seatsByCourt`; `clemencyPetitions` by person; `crimeExposure` clocks by target; `standing` (voting, citizenship) by person. Retain log only for what the player can see: public charges, trials, verdicts, sentences, clemency grants, judicial appointments and rulings.
**Acts.**

- Ordinary people: commit offense (actor weight from offender weights; target; effect: record incident, perhaps referral); report crime (victim; effect: referral if police can name); plead guilty or go to trial; serve jury duty; post bail (self or other); petition clemency; appeal (needs the missing caller); register as voter after sentence.
- Officials: police refer for prosecution; prosecutor charges or declines; judge sets bail, detains, sentences; clemency holder or board grants or denies; sheriff and prosecutor office work; Senate confirms justice; president nominates.
  **Effects.** Jail leave on jobs; office removal on jail; voting suspension and restoration; bail money transfer and refund; fines; relationship absence; candidate blocked from campaigning.
  **Typed events.** offense-occurred, offense-reported, referred, charged or declined, plea-entered, trial-held, verdict, mistrial, sentenced, held-before-trial, released, clemency-requested/granted/denied, appeal-filed/decided, voting-right-set, judge-seated or vacated. Public record and news: charged, sentenced, verdict, clemency, appointments, judicial review rulings. Private: referrals, plea choices, jail absences.
  **Calendar and tier.** Crime exposure: monthly (calendar tier) per place, with an exact offense day computed. Prosecution stages: due items on charge/trial dates (daily for player circle, otherwise weekly). Courtroom sittings: dated sittings from courtroom-sitting.ts. Clemency: petition court date. Judicial review: the day a law takes effect. Appointments: vacancy-driven. Judicial terms/retention: unbuilt, need election-day/term-end calendar once built.
  **Reusable data.** money-bail-2026.json, sentencing-ranges-2026.json, time-to-disposition-2026.json, clemency-gates-2026.json, judicial-review-precedents-2026.json, starting-law-2026/justice-public-safety.json, judiciary/generated/*.ts (embedded JSON: federal courts, seat counts, selection profiles; move to JSON files).

## 6. Dependencies and risks

**Needs first:** people and relationships, jobs (leave), money (bail), law-in-force lookup, decisions/chooser, offices and governing (office removal, appointments, executive desk for clemency), elections (candidacy), calendar and future-due scheduler, life places and county units.
**Riskiest:**

1. Case state lives only in tagged history events scanned by type and tag (`eventsOfType`, `byReferral`, `sentencesOf`, `policeContact`, `jailPopulationOn`); every query is an O(history) scan. Rebuild as keyed tables; do not port the tag protocol.
2. Crime is rate-first (town rate split across targets, then an offender is attributed). Core2 wants actor-first acts; the two must be reconciled without losing the totals check. Only four offenses, so prosecution/sentencing tables (many offense keys, public-trust offenses) are driven mostly by corruption findings, not crime.
3. Save-format ties: persisted version strings (`local-crime-unresearched-v1`, `prosecution-decided-v3`), tag formats (`justice.referral:`, `justice.cash-bail-amount:`), stable keys. Old saves cannot be read unchanged.
4. Law coupling: pretrial, sentencing, voting and juvenile age read enacted-law propositions and `law-consequences/` landings; porting needs the law engine's core2 shape first.
5. Judicial-office kernels (about 2,700 lines across five files: 60 rows, authored responses, validators) are mostly data and validation; large but low value to port, and tied to Custom Start only.
6. Dice-adjacent spots: jury lot draw, opening judge identity, opening exposure fraction. Need an explicit rule: seeded picks only at creation or among real options.
   Also: dead appeals/bail-posting need callers before they count as ported; per-place tables in .ts (`FEDERAL_PUBLIC_TRUST_RANGES`, `generated/*`).

## 7. Life-replay steps

- **office-service**: partly. County sheriff/prosecutor work (county-office-work.ts) and judicial-office kernels; lacks judge docket service for a seated trial judge.
- **public-appointment**: partly. US Supreme Court and Chief Justice only; lacks state and lower-court appointment, confirmation, term and retention paths.
- **office-succession**: partly. `vacateJudicialSeat` and succession for the top court; lacks lower-bench succession.
- **election-result**: lacks judicial elections and retention (selection profiles are data only).
- **candidacy**: supplies the blockers (jail, citizenship eligibility, voting standing); lacks felony-office qualification by place.
- **employment**: supplies jail leave and its release; lacks employer response.
- **family-loss / health-shock**: partly (incarceration absence from household); no custody or juvenile outcomes.
- **residence-move**: nothing, except jury-county and place catchment reads.
- **law-signature, legislative-proposal, chamber-leadership, military-_, education-_, partnership, business-formation, cause-participation, reelection-decision**: none from this engine; law-signature feeds this engine through pretrial/sentencing/voting/juvenile-age law reads.
