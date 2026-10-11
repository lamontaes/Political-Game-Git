# Legislatures engine: P11 porting analysis

Scope: 107 files, about 40k lines. The tool counts 564 RULE, 468 PLUMBING, 151 DATA and 61 DEAD units. Paths are under `src/simulation/` unless noted. The engine includes `governing/*`, `living-world/{official-views,constitutional-reform,federal-reform,local-council-*,congress*}`, `nationwide-world/*governing-body*` and `patronage/*`.

## 1. SAMPLE AUDIT

- local-ordinance-game-profile.ts:102 localFiscalGameAuthorityForRulePackId TOOL=RULE YOU=PLUMBING parses pack id, looks up catalog units
- legislative-politics.ts:1373 headingLabel TOOL=RULE YOU=PLUMBING one-line English formatting for a section
- legislature-rules.ts:92 knownRule TOOL=RULE YOU=PLUMBING tagged-value constructor, no decision
- patronage/appointments.ts:509 appointmentMotive TOOL=RULE YOU=RULE classifies trade versus shared belief from considerations (entangled)
- legislation-scenarios.ts:726 legislativeScenarioKeysForPlace TOOL=RULE YOU=PLUMBING filters authored fixture list, used by presentation
- municipal-government.ts:1221 buildFloorStages TOOL=RULE YOU=RULE turns a reading into floor-stage rules; pure
- legislation.ts:253 positionOf TOOL=RULE YOU=PLUMBING copies replay state into a read view
- legislative-office-terms.ts:371 legacyExpiryStableKey TOOL=RULE YOU=PLUMBING save-compat key string
- municipal-government.ts:405 lawReading TOOL=RULE YOU=PLUMBING `find` over stored readings
- bill-numbering-derivation.ts:120 DEFAULT_LOWER_NAME TOOL=RULE YOU=DATA a literal chamber name
- favor-collection.ts:57 FAVOR_ASK_OPEN_DAYS TOOL=RULE YOU=RULE tunable (SET BY HAND) feeding ask expiry
- local-ordinance-game-profile.ts:58 fiscalGameUnitMatched TOOL=RULE YOU=PLUMBING catalog uniqueness lookups
- legislative-member-decisions.ts:250 memberConsiderations TOOL=RULE YOU=RULE builds vote reasons from commitments, beliefs and calls (entangled)
- municipal-government.ts:1346 WITHHELD_POWER_INSTRUMENTS TOOL=DATA YOU=DATA power-to-instrument table
- congress-rule-pack.ts:172 EFFECTIVE_ON_ENACTMENT TOOL=DATA YOU=DATA cited source row
- legislative-bargaining-decisions.ts:30 BARGAINING_ANSWER_REQUEST_DECISION TOOL=DATA YOU=DATA decision declaration literal
- legislature-game-profile.ts:592 ORIGINATION_SOURCE TOOL=DATA YOU=DATA source note
- legislation-transit-families.ts:23 TRANSIT_SERVICE_VARIANT TOOL=DATA YOU=DATA program variant from JSON
- legislative-politics.ts:1336 LEGISLATIVE_COMMITMENT_CONDITION_KINDS TOOL=DEAD YOU=DEAD only legislative-commitment-standing.test.ts uses it
- legislation-draft-lineage.ts:252 isBundleMeasure TOOL=DEAD YOU=PLUMBING presentation/legislation-bundle-docket.ts:536 calls it
- constitutional-process.ts:543 proposeCaliforniaConstitutionalMeasure TOOL=DEAD YOU=DEAD only constitutional-saved-world.test.ts calls it
- legislation-draft-lineage.ts:103 recordDraftLineage TOOL=PLUMBING YOU=PLUMBING validates and appends history rows
- legislation-integrity.ts:99 denominatorValueFor TOOL=PLUMBING YOU=PLUMBING validator helper
- municipal-government.ts:524 municipalMeetingReading TOOL=PLUMBING YOU=PLUMBING ranks stored readings by evidence class
- legislative-politics.ts:556 recordLegislativeCommitment TOOL=PLUMBING YOU=PLUMBING validates, then appends a record
- legislature-rules.ts:946 assertRulePackIntegrity TOOL=PLUMBING YOU=PLUMBING 420-line schema validator
- legislation-draft-lineage.ts:70 toParameterRecords TOOL=PLUMBING YOU=PLUMBING record-shape conversion
- constitutional-process.ts:571 requireConstitutionalMeasure TOOL=PLUMBING YOU=PLUMBING history lookup that throws
- congress-rule-pack.ts:276 committees TOOL=PLUMBING YOU=DATA builds placeholder committee rows
- legislation.ts:3753 catalogPropositionIds TOOL=PLUMBING YOU=PLUMBING catalog lookup by key
- legislation.ts:3680 recordAdjournmentDeath TOOL=PLUMBING YOU=PLUMBING appends an action; driven by governing/legislative-clock.ts:612

Agreement 20/31. Main error: the "pure-helper" heuristic (short, no World) labels RULE things that are key builders, accessors, string formatters, registry lookups and literals. Of 11 disagreements, 8 are that. The tool also called a presentation-reachable function DEAD, because it did not scan `src/presentation`.

## 2. MAP

- **Measure lifecycle.** `legislation.ts` (3,566 lines) owns `history.legislativeMeasures`, `legislativeActions`, `committeeReferrals`, `committeeActions`, `legislativeAmendments`, `legislativeProvisions`, `legislativeVotes`, `executiveDispositions`, `legislativeEnactments` and `itemVetoes`. A measure has no stored status. `replayMeasure` (legislation.ts:792) replays the whole action log through the rule pack on every `measurePosition` call. Phases run drafting, referral, committee, floor, transmittal, concurrence, enrollment, presentation, executive, override, enactment, then enacted or failed. Writers are `introduceMeasure` (:1769), `recordProceduralMotion` and `recordAdjournmentDeath`. Main readers are `enacted-law-effects.ts`, `law-consequences/*`, `minimum-wage.ts`, `tax-policy-activation.ts`, `living-world/{town-pay,housing-market,statehood-seats}.ts`, `judiciary/judicial-review.ts` and `world.ts` integrity.
- **Clock and drivers.** `governing/legislative-clock.ts` (`applyInstitutionStep` at :650, 556 lines) is a future-due handler under `LEGISLATIVE_INSTITUTION_STEP`. It is registered through `stateGoverningHandlers` (state-governing.ts:4012). It moves each measure by who owns the next step: sponsor office, institution or executive. Other drivers are `congress-lawmaking.ts` (monthly intake plus sittings), `council-lawmaking.ts`, `living-world/local-council-meetings.ts`, `dc-council-sittings.ts` and `governing/governing-calendar.ts` (seasons). All share `legislative-sittings.ts`. Session dates come from `legislative-session-calendar.ts` plus `data/content/legislative-session-calendars.json`. State wakes come from `nationwide-world/state-legislature-queue.ts` (another engine, elections and turnover).
- **Rule packs.** `legislature-rules.ts` defines `LegislativeRulePack`: chambers, committees, floor stages, thresholds as `Known` or `Unknown` rule values with source refs. Packs come from `research-rule-tables`/`legislature-rule-packs.ts` (9 researched states), `legislature-game-profile.ts` (the other states and territories, drawn from the researched spread), `congress-rule-pack.ts`, `municipal-government.ts` plus `*.generated.ts` (sourced councils), `local-ordinance-game-profile.ts` and `town-council-profile.ts`. Saved worlds embed `baselinePack` (legislative-starting-procedures.ts:~150).
- **Member decisions.** `governing/chamber-votes.ts` `decideChamberVote` (:1097) runs each member's ballot through the shared decision evaluator. Inputs are party cues, leader strain, constituent views, the executive, principles, private beliefs, commitments and relationships. Related: `legislative-member-decisions.ts`, `member-vote-decision.ts`, `council-lawmaking.ts`, `cloture`/quorum/floor-hold in chamber-votes, `vote-bundle.ts`, `roll-call-packing.ts` (compressed storage of roll calls) and `member-record.ts` (a derived record).
- **Agenda and drafting.** `governing/member-agenda.ts` `fileMemberAgendaBills` (624 lines) files bills on the question a member's principles press hardest. It is limited by `member-filing-caps.ts` and `majority-agenda.ts`, and by settings in `member-agenda-settings.ts`. `automatic-legislation.ts` compiles a bill from a policy answer. `legislation-drafting.ts` and `legislation-bundle.ts` compile player drafts from program families (`legislation-*-families.ts`, content in `data/`). `amendment-authors.ts` plans floor amendments. `chamber-procedure.ts` handles germaneness and single-subject.
- **Politics and bargaining.** `legislative-politics.ts` owns `legislativeCommitments` (stated stances with conditions). `undertakings.ts` reads promises. `favors.ts` owns `history.favors` with fading debt and expectation. `favor-collection.ts` has helpers ask the player. `relationship-leverage.ts` derives reliance. `legislature-manner.ts` and `legislative-bargaining-decisions.ts` give the bargaining style. **The bargaining sitting itself is in `src/presentation/legislative-bargaining.ts`** and owns `legislativeNegotiations`.
- **Executive desk, veto, override.** `governor-bill-decision.ts` (`evaluateGovernorBill` :384, `overrideCount` :95, `executiveBillActionWindow` :326). The President's desk is `congress-lawmaking.ts:105`. `item-veto.ts`, `veto-override-source-readings.ts` and `legislature-game-profile.ts` (`vetoWindowFor`, `overrideThresholdFor`) hold the rules. `municipal-ordinance-procedure.ts` handles council readings, mayor deadlines and overrides.
- **Offices and leadership.** `legislative-office-terms.ts` and `legislative-term-rules.ts` give seat terms. `governing/presiding-officers.ts` elects Speaker and president pro tempore. `committee-assignment.ts` and `standing-committee.ts` seat committees. `joint-assembly.ts` and `leaders-adjourn.ts` (`sessionAdjournments`) cover joint votes and early adjournment. There is no majority-leader or committee-chair role; grep finds only rule-pack text.
- **Constitutional amendments.** `constitutional-process.ts` (1,262 lines; owns `constitutionalMeasures/Actions/RuleVersions`), `governing/article-v.ts`, `living-world/{federal,constitutional}-reform.ts`, `constitutional-amendments.ts` and `constitutional-ratification-rules.ts`.
- **Official views.** `official-view-reads.ts`, `living-world/{official-views,political-reflection*}.ts` and `heard-official-views.ts`. These turn enacted laws into credit or blame (`OFFICIAL_VIEW_TRANSITION_KEY`) and feed `townSupportFromViews` to elections, recall, petitions and campaigns.

## 3. STOPGAPS

Grep markers (80 lines): PLACEHOLDER 46, GAME ASSUMPTION 14, SET BY HAND 13, NOT MODELED 7. Data JSON imports carry none.
Top items:

1. governing/congress-lawmaking.ts:60,72 one bill per House per month; every number placeholder.
2. governing/chamber-votes.ts:955,1063,1824,1860,1934 hand-set weights and a "slight" trust reason.
3. legislative-member-decisions.ts:387,472,486,704 belief, group and view strength mapped to ordinal weights.
4. living-world/constitutional-reform.ts:91-108,159 and federal-reform.ts:91,133 placeholder amendment causes and pace.
5. governing/article-v.ts:103,116,122,317 placeholder review day, state action day, convention days and weight.
6. legislature-game-profile.ts:372,597,610 territory legislatures, sitting frequency and referral are placeholders.
7. congress-rule-pack.ts:36,194,392,415 NOT MODELED rules and placeholder committee sizes.
8. standing-committee.ts:15 stand-in committees for packs that have none.
9. municipal-procedure-placeholders.ts:2,41 council with no read procedure gets a default two-reading procedure.
10. nationwide-world/local-governing-body-names.ts:25,54-60 placeholder body names by form.
11. favors.ts:189,229,254,282,292,308 unitless favor scores and half-lives set by hand.
12. favor-collection.ts:54,63,102,470,571 ask windows, need ages and refusal sting.
13. governing/presiding-officers.ts:31,36 only five candidates per caucus; no repeated ballots.
14. governing/leaders-adjourn.ts:36,40 no budget means sit to the limit; no appropriations act is filed.
15. governing/chamber-procedure.ts:40,353 hand-set presiding officer and appropriation rule.
16. governing/item-veto.ts:27 a struck section assumption.
17. governing/governor-bill-decision.ts:49 NOT MODELED: re-election concern.
18. governing/joint-assembly.ts:42 NOT MODELED: each house voting first.
19. governing/amendment-authors.ts:110,682 speed limit and operative-word mapping.
20. governing/legislative-clock.ts:293 session end date unrecorded.
21. living-world/official-views.ts:287-294 and official-view-reads.ts:27-34,262,267 view decay and support-shift caps.
22. living-world/political-reflection.ts:55 reflection size.
23. living-world/congress-aggregate-outcome.ts:13 incumbency bonus has no source.
24. dc-council-sittings.ts:63 sitting volume placeholder.
25. patronage/appointments.ts:582 debt size set by hand.

**Seeded randomness.** Not in actor decisions. Three seeded uses remain:

- `governing/constitutional-amendments.ts:105-109` draws each state's ratification day with `SeededRng.integer` (timing, not outcome).
- `municipal-council-opening.ts:132-163` draws seat-holder identity and name.
- `legislation-scenarios.ts:752` seeds fixture worlds.

`legislative-starting-procedures.ts:135` is named "draw" but takes no random input. `legislature-game-profile.ts` draws unresearched chamber sizes and thresholds at world start (`researchedChamberSpread` :278, `overrideThresholdFor(…, drawn)` :1086).

**Place names in logic.**

- `constitutional-process.ts:451,461,551,566` (Nevada charter route, `US-CA` adapter, Carson): the California adapter is dead.
- `legislation-scenarios.ts:203-212,394-563` (Kentucky/Nebraska authored scenarios).
- `legislative-term-rules.ts:11-98` (KY/KS/NE versioned rules).
- `bill-numbering-derivation.ts:131` (`US-WV` name).
- `legislature-game-profile.ts:399,412` (`US-NH`, `US-PR` entries).
- `legislation-drafting.ts:514` (territory key set).
- `governing/article-v.ts` `ARTICLE_V_STATE_KEYS`.
- Nearly all of `municipal-ordinance-procedure.ts` and `local-ordinance-game-profile.ts` is keyed by catalog id rather than by name.

## 4. KEEPERS

1. `legislature-rules.ts:208 resolveRequiredVotes`: threshold times denominator, with rounding and a floor. Takes a rule and an integer. Pure.
2. `legislation.ts:1115 tallyDispositions` plus `legislation-integrity.ts:99` denominator choice: pure counting.
3. `legislature-game-profile.ts:1086 overrideThresholdFor`, `:157/:213` veto windows, `:973 seatsForChamber`: prefer read rule, else spread. Take a state key and a drawn pair; pure.
4. `legislative-session-calendar.ts:30 nextSessionCalendarDate`: next date for sittings, hearings and readings. Pure.
5. `governing/member-filing-caps.ts:184 memberFilingCap`: cap, exemption and unread-limit logic. Takes a table row plus counts; no World.
6. `governing/chamber-procedure.ts:305 amendmentAdmissible`, `:246 singleSubjectRule`: germaneness and single-subject. Entangled with measure provisions; swap in a provision list.
7. `governing/chamber-votes.ts:1097 decideChamberVote` and `legislative-member-decisions.ts:250 memberConsiderations`: the best decision logic (smooth weights, no dice, commitments, beliefs). Entangled; they need a `KnowledgeView` and `RelationshipView` (core2 `knows`, `relationship`), a `MeasureView`, and the shared chooser instead of `evaluateDecision`.
8. `favors.ts:402 favorStandingBetween` with its half-life math (:318-400) and `favor-collection.ts:209 produceFavorCollection`: debt that fades and expectation by motive. Takes a favor list per pair, which is the core2 relationship index.
9. `relationship-leverage.ts:155`: reliance from roof, income, care, group and debt. Needs household, job, care and obligation indexes.
10. `governing/governor-bill-decision.ts:384 evaluateGovernorBill`, `:95 overrideCount`, `:326 executiveBillActionWindow`: signing, returning and override math. Entangled.
11. `governing/majority-agenda.ts:27 majorityAgendaChoice`, `presiding-officers.ts:69`, `committee-assignment.ts:31`: pure agenda, Speaker and committee seating with `supports` passed in.
12. `official-view-reads.ts:52,192,277` credit and blame standing and town support; `constitutional-process.ts:213/:239 constitutionalProposalRuleAt`; `item-veto.ts:67`.

## 5. CORE2 MODULE INPUTS

**State owned (maps by id).**

- `bodies` (id, pack ref, place, level, chamber seats, session state), indexed by place and level.
- `members` (person, body, seat, party, term, committees), indexed by person and by body.
- `measures` with a stored `phase` and `position` instead of replay (id, sponsor, origin chamber, provisions, answers). Index by body, phase and sponsor.
- `votes` (roll calls, packed).
- `commitments` and `favors`, indexed by person and pair.
- `amendment measures` (constitutional).
- `official views`, as `knowledgeByPerson`.
- Rule packs stay read-only data.

Keep a durable log only for what a player can see: enactments, vetoes, final roll calls, committee reports of visible bodies and the observer-mode news. Everything else keeps its result.

**Acts.**

- Member: file a bill (prerequisite: session open, cap not hit, seat; effect: new measure, cosponsor knowledge); cosponsor; offer or accept an amendment; vote; ask or grant a favor; state a commitment; ask a colleague for support; lead or seek a committee seat or the chair.
- Chair or leader: refer, schedule a hearing, bring a bill to the floor.
- Executive: sign, return, item-veto, let it become law.
- Chamber: override, elect a presiding officer, adjourn.
- Ordinary person: call or write a member (feeds `civicMessages`), testify, attend a council meeting, petition, vote on a ballot measure.

**Consequences.** Enactment calls law-in-force and the law-consequence modules (pay, tax, minimum wage, housing, duties), and moves office pay and budgets. Roll calls change official views, relationship standing and favors owed. Adjournment or term end closes bills. Seat vacancy goes to the elections engine.

**Events.** `legislature.bill-filed`, `.referred`, `.reported`, `.amended`, `.passed-chamber`, `.vote-taken` (public record), `.vetoed`, `.override`, `.enacted` (public record and news), `.died`, `.session-opened/closed`, `.favor-given/asked`, `.commitment-made`, `.amendment-ratified`.

**Calendar.** Daily for the player's circle and sitting bodies. Weekly or per-sitting for others. Sitting dates and filing days come from `core.calendarDates` using the session calendar data. Quarterly for admitted local councils. Monthly intake for Congress. Biennial numbering. Term start, term end and regular-session years are calendar-tier.

**Reuse.** `data/research/legislature/*`, `legislative-procedure/{germaneness,single-subject,item-veto}`, `laws/{state-session-calendars-2026,regular-session-years,veto-windows-2023,legislators-2023,veto-override-readings-2026}`, `local-government/*`, `congress/statehood-seats`, `money/place-population-acs-2024`, `content/legislative-session-calendars`, and the `researchRuleTable("legislativePacks")` rows.

## 6. DEPENDENCIES AND RISKS

**Needs first:** people, relationships and knowledge; organizations and offices; elections (seat turnover); the shared chooser and parameter table; law-in-force and consequence modules; money (appropriation); the English engine for titles and speech (the engine now emits prose in `legislative-politics.ts`, `legislation.ts` rationale strings, `official-views.ts`).

**Risks.**

1. **Replay as state.** `measurePosition` replays the log on every read (`legislation.ts:792`). Much code (`availableMeasureSteps`, `measureGate`, presentation) depends on it. A stored phase needs a one-time migration and a test that both agree.
2. **Giant validators.** `assertRulePackIntegrity` (420 lines), `assertLegislationIntegrity` (497), `assertConstitutionalIntegrity` (171), `assertLegislativePoliticsIntegrity` (318). Whole-world scans; replace with write-time checks.
3. **Bargaining and drafting live in `src/presentation`** (`legislative-bargaining.ts`, `legislation-docket.ts`, `legislation-bundle-docket.ts`), mixing UI with rules. They must be moved into the module or the player cannot negotiate.
4. **Per-place tables in .ts.** `bill-numbering-styles.generated.ts` (1,202 lines), `local-ordinance-source-anchors.generated.ts`, `town-council-profile-inputs.generated.ts`, `legislative-term-rules.ts`, `legislation-scenarios.ts`. These need to become data rows.
5. **Save-format assumptions.** Packs are embedded in saves (`baselinePack`); `legacy-work-key-aliases`; `migrateLegacyLegislativeSeats`; optional history fields for old saves. A port drops these only with a save break.
6. **Speed.** `decideChamberVote` builds considerations for every member per question. `fileMemberAgendaBills` (624 lines) scans members and the catalog. Needs indexes by body and phase.

## 7. LIFE-REPLAY STEPS

- **legislative-proposal** (AOC resolution): full. `member-agenda` + `introduceMeasure` file bills, but there are no concurrent resolutions or non-binding forms. Lacks: a "resolution" kind and an act that takes a named proposal.
- **law-signature** (Civil Rights Act, Voting Rights Act): mostly. `presidentDesk` and `evaluateGovernorBill` decide sign or return, but the bill comes from automatic intake and not from a named historical act. Lacks: seeded named bills and the filibuster/cloture path at Congress level.
- **chamber-leadership** (Majority Leader): missing. Only presiding officers are elected. Needs a leadership role table (leader, whip, committee chair) and the act to seek it.
- **military-authorization-request**: missing. No authorization-for-use or war-powers measure. Crisis code has a related concept. Needs a measure kind, a rule for Congress, and a link to the military engine.
- **office-service** (House member, governor service): partly. `legislative-office-terms.ts` and `member-seating.ts` seat members, but the entry comes from elections. The engine gives the seat's work (`congress-member-work.ts`).
- **public-appointment**: partly. `patronage/appointments.ts` picks appointees and records favors; Senate confirmation vote is `ChamberNominationVoteInput`. Lacks: appointment to a non-executive board.
- **candidacy / election-result / reelection-decision / office-succession**: elections and offices engines; legislatures only react to vacancies and term end. Presidential succession and Speaker line is `presiding-officers`.
- Other mechanisms (residence-move through business-formation, military-deployment): not this engine.
