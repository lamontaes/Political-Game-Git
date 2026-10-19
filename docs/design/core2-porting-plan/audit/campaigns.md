# P11 findings: campaigns and civic groups

Scope read: the 45 files in files-campaigns.txt plus living-world/{protests,civic-actions,law-interest-groups,movement-succession,movements}.ts and traits/campaign-door-answer-effects.ts. About 25,000 lines, 736 top-level units (RULE 229, PLUMBING 287, TYPE 136, DATA 57, DEAD 27).

## 1. SAMPLE AUDIT

(paths under src/simulation/)

- campaign-compliance-rules.ts:98 CAMPAIGN_COMPLIANCE_STATE_KEYS TOOL=DEAD YOU=DEAD only a prose test imports it
- campaign-polling.ts:28 CAMPAIGN_POLLING_PROFILE TOOL=DEAD YOU=DEAD version string, grep shows no other reader
- campaign-operating-costs.ts:97 suggestedCampaignUnits TOOL=DEAD YOU=DEAD pure math, but only its test calls it
- campaign-operating-costs.ts:130 committeesFor TOOL=PLUMBING YOU=PLUMBING builds committee list from World opponent records
- after-office-endorsements.ts:736 latestPositions TOOL=PLUMBING YOU=PLUMBING filters and sorts world.history.publicPositions
- campaign-helpers.ts:387 addCampaignHelper TOOL=PLUMBING YOU=PLUMBING validates then writes work-relationship history
- campaign-polling.ts:81 activeCampaignPeople TOOL=PLUMBING YOU=PLUMBING scans workRelationships for active staff
- campaigns.ts:578 requireText TOOL=PLUMBING YOU=PLUMBING empty-string input guard
- campaigns.ts:2446 campaignElectionTransitionHandler TOOL=PLUMBING YOU=PLUMBING scheduler glue; outcome math is elsewhere
- campaign-opponents.ts:963 recordCampaignContact TOOL=PLUMBING YOU=PLUMBING writes relationship-interaction history rows
- campaign-donors.ts:37 assessCampaignContribution TOOL=PLUMBING YOU=PLUMBING reads compliance pack, falls back to estimate
- campaign-compliance.ts:335 campaignComplianceDocuments TOOL=PLUMBING YOU=PLUMBING one-line history accessor
- campaign-life-activities.ts:2391 declinedHold TOOL=PLUMBING YOU=PLUMBING wrapper over wasRefused
- campaign-queries.ts:72 campaignForCandidate TOOL=PLUMBING YOU=PLUMBING reverse array scan
- campaign-weekly-plans.ts:340 activeStaff TOOL=PLUMBING YOU=PLUMBING work-status lookups, manager-first sort
- campaign-life-activities.ts:345 journeyFor TOOL=PLUMBING YOU=PLUMBING scheduledActivities lookup
- campaign-integrity.ts:457 assertCampaignActionResults TOOL=PLUMBING YOU=PLUMBING whole-world validator
- campaign-week-actions.ts:310 chooseCampaignWeekAction TOOL=PLUMBING YOU=PLUMBING revalidates a projection then books an activity
- campaign-life-activities.ts:585 timingProblem TOOL=RULE YOU=RULE travel lead, past, 9 p.m., election-day limits
- campaign-weekly-plans.ts:696 nextSession TOOL=RULE YOU=PLUMBING view-list helper for the UI projection
- campaign-routine.ts:144 validateBlocks TOOL=RULE YOU=RULE day-overlap scheduling constraint, though partly input checking
- pressure/flows.ts:51 pushOf TOOL=RULE YOU=RULE leave pressure to outflow multiplier
- pressure/step.ts:30 FADE_PER_QUARTER_ESTIMATE TOOL=RULE YOU=DATA tunable parameter, 25% fade
- pressure/ladder.ts:140 THREAT_ATTEMPTED_PHASE TOOL=RULE YOU=PLUMBING incident phase-key string
- campaigns.ts:2489 CAMPAIGN_STAFF_CLOSE_TRANSITION_KEY TOOL=RULE YOU=PLUMBING scheduler key string
- filing-visit.ts:46 SLOT_MINUTES TOOL=RULE YOU=DATA tuning constant (30-minute slots)
- filing-visit.ts:49 VISIT_MINUTES TOOL=RULE YOU=DATA value read from filing-office.json
- campaign-compliance-rules.ts:91 ROWS TOOL=RULE YOU=DATA JSON.parse of embedded compliance rows
- campaign-canvass.ts:121 CANVASS_SESSION_MINUTES TOOL=RULE YOU=DATA derived option list from calibration rows
- campaign-week-actions.ts:44 ACTIONS TOOL=DATA YOU=DATA four-entry form to research-id table
- campaign-money-sources.ts:359 CANDIDATE_OWN_MONEY_EVENT TOOL=DATA YOU=PLUMBING event-type string key
- pressure/ladder.ts:110 POLITICAL_VIOLENCE_ESTIMATE TOOL=DATA YOU=DATA labeled estimate table

agreement 23/32. Main misclassification: the tool calls constants and string keys RULE because they are "pure" (scheduler keys, phase strings, tuning numbers, parsed JSON). The real classes are PLUMBING or DATA. It also calls a view helper (nextSession) RULE. DEAD verdicts held up; "DEAD" is partly test-only (suggestedCampaignUnits, state keys). The sampled DEAD list undercounts "dead in ordinary play": see section 3.

## 2. MAP

- Filing and committee (campaigns.ts fileCampaign :623, campaign-queries.ts, campaign-geography.ts, campaign-compliance*.ts). Creates the CampaignRecord, committee Organization, treasury ResourcePosition, support metric and initial support. Writes history.campaigns, campaignStates, campaignComplianceDocuments plus organizations and resourcePositions. Driven only by the player's presentation (presentation/nationwide-candidacy.ts:203, congress-candidacy.ts:213). No NPC candidate files one.
- Support and election outcome (campaigns.ts:386-520, :1929; campaign-support.ts; campaign-recognition.ts; door-conversations.ts). Support is a share in basis points over candidates, kept as world-metric states; outcome = allocation of those shares, top share wins (evaluateCampaignAwareOutcome :1929). No voter is simulated. Writers: performCampaignAction :1541, opponent steps, crisis/handling-reactions.ts:182, press/finding-consequences.ts:57. Driven by the ELECTION_CONTEST transition (campaigns.ts:2446) and campaign-staff-close key.
- Player campaign work (campaign-weekly-plans.ts, campaign-week-actions.ts, campaign-routine.ts, campaign-canvass.ts, campaign-life-activities.ts). Weekly plan, standing routine hours, door-to-door walk, fundraiser/town-hall/phone shift. Writes campaignActions, campaignActionResults, campaignWeeklyPlans, campaignRoutines, campaignLifeActivities/Outcomes, scheduledActivities. Driven by player actions and the RoutineTimeHook (campaigns.ts:2734) plus campaignLifeHandlers (campaign-life-handlers.ts:13): weekly evaluation, outreach, operating payment.
- Money (campaign-donors.ts, campaign-money-sources.ts, campaign-operating-costs.ts, campaign-compliance-rules.ts). Donor ask is an evaluateDecision call (belief, kin, means, limit). Fundraiser receipts, own money, leftover carry-forward, vendor purchases. Writes campaignAsks, campaignPurchases, resourceFlows/Outcomes. Reader of person cash: resource positions in the economy engine.
- Staff (campaign-managers.ts, campaign-helpers.ts). Manager offers and volunteer asks via considerations; writes workRelationships. Reader: work-status queries in life-queries.
- Opponents (campaign-opponents.ts, campaign-opponent-integrity.ts). Invented rival, committee, field lead, emphasis chosen once by evaluateDecision from traits (:284), a weekly chooseStep (:584) among field-event, fundraising, messaging, support-request. Writes campaignOpponents/Steps. Driven by CAMPAIGN_WEEKLY_EVALUATION_KEY.
- Polling and speeches (campaign-polling-estimate.ts, campaign-polling.ts, speech-reception.ts, campaign-speeches.ts, speech-moves.ts). Poll is a district-comparison estimate with spread, shown as a field memo observation. Speeches: each witness decides a reaction by evaluateDecision; counts recorded as event tags. Reader: presentation/campaign-projection.ts only.
- Endorsements (after-office-endorsements.ts). Request and decision by considerations, favor record on yes. Only UI projection (player/AfterOfficeEndorsementPanel.tsx) calls the scene functions; request/decide are called only from tests.
- Civic groups (living-world/civic-actions.ts, law-interest-groups.ts, movements.ts, movement-succession.ts, protests.ts). Quarterly civic contact/attendance for every grown resident (reviewTownCivicActions, called from migration/review.ts:294); shared-cause groups founded or joined when a law exposure is recorded (official-views.ts:410 -> joinLawInterestGroup); movement leadership succession on death/retire/step-down with a body review (party-evolution.ts:65 registers the handler); protests as event projections.
- Pressure layer (pressure/*.ts). Quarterly per-state readings for leave/arrive/anger/fear/hope from hazards, tax changes, excess crime, unemployment gaps, failed disaster response; 25% fade; yearly flow table; a ladder of unrest and political-threat incidents and an attempt record. Owns world.pressure. Driver: stepPressure inside migration/review.ts:270. Readers: migration (pushOf/pull weights, :664).

## 3. STOPGAPS

Markers in 47 engine files (non-test): SET BY HAND 1, GAME ASSUMPTION 0, NOT MODELED 0, PLACEHOLDER 7 (5 in campaign files, 2 in civic-actions). Data JSON: 0. Two TODOs.

- campaign-life-activities.ts:1898 SET BY HAND favor weights for fundraiser, doors, chapter backing.
- campaign-week-actions.ts:41 PLACEHOLDER four-choice cadence and form-to-research mapping.
- campaign-contact-calibration.ts:15 PLACEHOLDER Nickerson GOTV shift applied with no office factor.
- campaign-contact-calibration.ts:21 PLACEHOLDER phone shift treated as manual dialing.
- campaign-contact-calibration.ts:57 PLACEHOLDER one shift minute = one volunteer-minute.
- campaigns.ts:2117 PLACEHOLDER pointer to local chief executive rules.
- living-world/civic-actions.ts:286 PLACEHOLDER weights for age, town years, job, law cost, group member.
- living-world/civic-actions.ts:296 PLACEHOLDER strong-view doubling (20 points, factor 2).
  Unmarked stopgaps worth listing (found by reading):
- campaigns.ts:468-480 every candidate starts at weight 850 plus past-record adjustment; no real baseline.
- campaign-support.ts:60-80 ceiling 7,500 bp and half-share knee are blanket numbers.
- campaigns.ts:1128-1150 advertising gain = spend/500; field gain = minutes*workers*3*percent/200.
- campaign-polling.ts:28 poll-accuracy tiers (12/9/6 points) are documented but not read; the observed number is the district-comparison estimate (campaigns.ts:1325-1380); the reader tier (campaigns.ts:1799) only shapes the memo wording, not the number.
- pressure/*.ts: every amount is "ESTIMATED FROM AVERAGE" (HAZARD_PRESSURE_ESTIMATE, TAX_RATE_PRESSURE_ESTIMATE=5, CRIME 0.001-0.002, anger line 0.3, attempt line 2). Anger/fear/hope feed only the ladder; hope is fed by nothing.
- campaign-money-sources.ts:41 six of eight money sources "unbuilt" (loan, party committee, public financing, bank loan, outside spending).
- campaign-compliance.ts:263-296 federal estimate pack for places without a reviewed pack; campaign-compliance.generated.ts embeds rows as a JSON string in .ts.
  Seeded randomness: none decides an outcome. SeededRng draws only invented people: opponents (campaigns.ts:545, campaign-opponents.ts:471), contact persons (campaign-life-activities.ts:1306). stableHash makes segment keys (campaigns.ts:406). Decisions all pass randomness: "none". Threshold flips against the owner's sliding-scale rule: civic-actions.ts:484 passesMeasure (integer crossing of accumulated pull; deterministic, calibrated to totals), pressure/ladder.ts angerLine 0.3 and attemptLine 2, campaign-polling.ts experience tiers, campaign-helpers/donors importance buckets.
  State or place names in logic: none. `US-${stateUsps}` key building at pressure/causes.ts:77, anger.ts:91 (format, not a name). Minnesota and Kentucky appear in comments and in the generated data only.

## 4. KEEPERS

1. campaign-support.ts:70 effectiveGainBasisPoints(current, requested): diminishing gain above half to a ceiling. Pure; takes numbers only.
2. campaigns.ts:413 allocateBasisPoints(entries): largest-remainder split of a whole. Pure.
3. campaigns.ts:1929 evaluateCampaignAwareOutcome: shares to tallies and winner. Entangled (reads support states from World); would take a map candidateId to share.
4. campaigns.ts:1128/1135/1242 gain formulas (advertising, field, door conversation). Take spend, minutes, workers, door-return percent, conversation list, electorate size. Door return is entangled via campaign-recognition.ts:46 (scans all people).
5. campaign-recognition.ts: share of adults met, first-race bonus, afternoons before. Inputs: set of contacts, adult count, races won. Needs an index instead of personOrder scan.
6. door-conversations.ts:75-165 placeConditions, doorSubject, doorResponse: resident takes candidate warm/cool/heard from place conditions rank among states and their own decision. Needs place-outcome table by state and the resident's traits; entangled with World.placeOutcomes.
7. campaign-canvass.ts:150 CANVASS_SUPPORT_EFFECT and walk pacing (doors per minute from calibration). Pure numbers; walkCampaignCanvass :323 is entangled with town roster and scratch worlds.
8. campaign-donors.ts:104 askCampaignDonor and campaign-helpers.ts:47 helperAskConsiderations: consideration lists (view, kin, warmth, means, limit). Pattern fits core2 ActOffers directly; need belief, kinship, standing, cash, limit.
9. campaign-compliance-rules.ts:240 assessContribution plus campaign-compliance.ts pack resolution and campaignStatementStatus :759: dated obligations by place. Mostly pure over pack rows.
10. campaign-opponents.ts:584 chooseStep: weekly rival step from treasury, days left, emphasis, chapter reach. Reads World for treasury and chapter; easy to feed values.
11. speech-reception.ts:148 speechReactionOf: witness reaction from standing, traits, occasion. Entangled with relationship standing and traits.
12. pressure/{causes,step,flows,ladder}: cause-to-contribution tables, fade, flow share math, threatStrain :336. Contribution math is pure; cause collection scans crisisRecords, taxPolicies and all events (causes.ts:60-150) and must become event-driven.
13. living-world/civic-actions.ts:380 civicStake and :484 passesMeasure: stake from age, town years, job, law exposure, group; entangled with 6 History lookups.

## 5. CORE2 MODULE INPUTS

State owned (tables by id): campaigns (by candidate, contest, jurisdiction); committees (organization id, treasury); campaignSupport (contestId -> candidate -> share bp); campaignWork (action rows with result, pruned after election); weeklyPlans and routines (by campaign); asks and purchases (by campaign, person); opponents and steps; compliance filings (public record); civic groups (organization ids with cause key; indexes cause -> members, town -> groups); movementLeadership (org -> leader); protests (plan id -> attendees); civicContacts counter per person; pressure readings (state -> kind -> level, last 4 quarters kept) and flows.
Acts offered (actor; target; prerequisites; effect): file for office (resident; contest; qualified, fee/petition; creates committee); ask donor (candidate; known person; campaign active, under limit; gift transfer, favor); ask to help/hire manager (candidate; person; pay funded; work relationship); canvass door (candidate/volunteer; household; free minutes; contact, support shift, recognition); phone shift, fundraiser, town hall, buy ad (spend), own money, file statement, give speech, concede/celebrate; endorse (official/chapter; candidate; asked); write/call official (resident; official; stake; civic message and case); attend meeting; found or join cause group (resident; law exposure; view or stake and free time); organize/attend protest (organizer; place; stance); lead/step down movement; vote/choose successor.
Consequences: support shift among candidates, money transfers, favors, relationship strength from shared events, group membership and leader change, office cases, pressure levels that scale migration.
Events (typed; public marked P): campaign filed P; statement filed P; ad bought; donor gave; staff hired; door conversation; speech given P with reaction counts; rival step; election result P; concession/victory P; civic message; protest held P; group founded P; leadership change P; unrest/threat/attack incident P; state flows report P.
Calendar: election day (from contest), weekly boundary (opponent evaluation, plan week), pre-election filing dates 60/30/15 days, quarterly (pressure, civic actions), staff close day after election, operating payments on due days. Tier: weekly for NPC candidate teams, daily only for player circle and focus places, quarterly for pressure and civic contact.
Data reuse: data/research/campaign-reality/* (action-catalog, calibration, contribution-limits, unit-prices, leftover-funds-rules), data/research/campaign-compliance/pack-records-by-place.json, data/research/elections/{filing-office,protest-places,shared-cause-group-actions,candidate-filing-terms}.json, data/content/act-kinds.json and decision-option-acts.json.

## 6. DEPENDENCIES AND RISKS

Needs first: people/relationships/standing, beliefs and traits, money (resource positions, flows), scheduling/calendar (scheduled activities), elections substrate (contests, results, seating), place outcomes, laws/exposures, crisis records (pressure causes), organizations and participations, favors, news.
Risks:

1. Whole-world validators: campaign-integrity.ts (798), campaign-opponent-integrity.ts, campaign-weekly-plan-integrity.ts, campaign-life-integrity.ts, pressure/integrity.ts. Drop; replace with per-row invariants.
2. Support-share model: outcome is an allocation of a single metric, with initial 850 weight, ceiling and floor; the metric catalog is in World. core2 must decide whether elections are tallied from voters or still from shares.
3. Hidden coupling to the scheduler: campaigns.ts:2560 composeWorldTimeHandlers registers about 40 other engines' handlers; campaigns.ts is 2,880 lines mixing filing, effects, seating the winner, and handler composition.
4. Per-resident scans: campaign-recognition.ts scans all people, civic-actions reviews every adult in a town each quarter (speed budget), pressure/causes.ts scans all events and policies.
5. Story-people scratch worlds in campaign-canvass.ts: doors are read on a scratch copy of the world and written out on demand; heavy tie to town rosters.
6. Save-format assumptions: optional history tables for "earlier saves"; stable keys with ordinals; ids embedded in tags.
7. Threshold and tier steps against the sliding-scale rule (polling tiers, anger line, passesMeasure).

## 7. LIFE-REPLAY STEPS

- candidacy: partly. fileCampaign supplies committee, filing statement, support baseline; lacks an NPC path (only the player's presentation calls it) and lacks petition/fee pairing with the elections engine.
- election-result: partly. evaluateCampaignAwareOutcome and seatTheWinner make winners from support shares, but only for contests with a player campaign; others fall to the elections substrate. Needs NPC campaigns so replay lives have shares.
- reelection-decision: lacks. Nothing decides whether an incumbent runs; recognition counts prior wins only (campaign-recognition.ts:34).
- cause-participation: partly, best covered. joinLawInterestGroup/organizeSharedCauseGroup (law-interest-groups.ts:285,373) decide by goal, view, exposure, ties, shift. Civic contact and attendance (civic-actions.ts:504) also count. Lacks a way for an ordinary person to choose to join or leave a movement for non-law reasons, and actForSharedCauseGroup (:444) has no caller.
- office-succession: partly for movements only (movement-succession.ts:263 decideSuccession on death/step-down/retirement), not for public office.
- public-appointment: lacks (endorsement requests have no producer).
- legislative-proposal, law-signature, military-_, chamber-leadership, health-shock, family-loss, partnership, residence-move, education-_, employment, business-formation, office-service: not this engine. It only reads their results (residence for stake, employment for staff, health for liveness).
  Also lacks: protest producer (organizeProtest, inviteToProtest, holdProtest have no caller outside tests, so no protest occurs in an ordinary world), NPC fundraising and donor asks, NPC speeches, any pressure-to-protest link (ladder.ts:81 localProtestCauses is unreferenced).
