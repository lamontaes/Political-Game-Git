# Elections engine: P11 porting findings

Scope: 1,421 classified units, about 30,600 lines in ~100 files (src/simulation root, living-world/, nationwide-world/, nominations/, src/districts/). Tool split by lines: PLUMBING 14.6k, RULE 11.5k (93 units entangled), TYPE 2.2k, DATA 1.7k, DEAD 0.7k.

## 1. SAMPLE AUDIT (30 units)

Paths are under src/simulation unless shown.

- municipal-election-rule-packs.ts:86 MUNICIPAL_CORPUS_READ_ON TOOL=DATA YOU=DATA one constant read from the research JSON
- office-qualification-rules.ts:262 OFFICE_FAMILY_BY_CHAMBER_KEY TOOL=DATA YOU=DATA chamber-key to office-family lookup table
- municipal-election-rule-packs.ts:176 AVAILABLE TOOL=DATA YOU=DATA literal rule cell used to build rows
- recall.ts:443 tagValue TOOL=RULE YOU=PLUMBING parses "prefix:value" tags out of history events
- recall.ts:94 RECALL_PETITION_CLOSES TOOL=RULE YOU=PLUMBING scheduler transition-key string
- statewide-electorate.ts:180 seatHolderOn TOOL=RULE YOU=PLUMBING scans world.history events for latest seat tenure
- municipal-ballot-rules.ts:678 resolveMunicipalRecallRule TOOL=RULE YOU=RULE doctrine/threshold/window fallback to national mode; pure on pack
- municipal-ballot-rules.ts:568 timingCounts TOOL=RULE YOU=PLUMBING module-level memo cache
- recall.ts:920 PETITION_SIGNED TOOL=RULE YOU=PLUMBING event-type name constant
- municipal-ballot-rules.ts:571 nationalTimingCounts TOOL=RULE YOU=RULE counts state timings; pure over pack data (cache aside)
- district-residence.ts:199 districtResidenceSince TOOL=RULE YOU=PLUMBING reads residence intervals from World history
- politics.ts:755 POLITICAL_SUPERSESSION_INDEX TOOL=RULE YOU=PLUMBING WeakMap index keyed by immutable World
- nominations/date-rules.ts:71 weekdayOf TOOL=RULE YOU=RULE pure calendar math, no World
- measure-numbering.ts:184 dcCouncilPeriodForYear TOOL=RULE YOU=RULE pure period math (but DC named in logic)
- district-residence.ts:52 CONGRESSIONAL_HOME_JOIN_V1 TOOL=RULE YOU=PLUMBING version-tag string for stored records
- candidacy-packs.ts:563 generatedCandidacyPackById TOOL=RULE YOU=PLUMBING id-string lookup/adapter between pack stores
- office-qualification-rules.ts:141 qualificationRows TOOL=RULE YOU=DATA getter returning the data table
- municipal-election-rules.ts:203 requireKnownMunicipalRule TOOL=DEAD YOU=DEAD only municipal-election-rules.test.ts calls it
- statewide-electorate.ts:230 stateSeatElectorate TOOL=DEAD YOU=DEAD only a doc comment (state-legislature-turnover.ts:557) names it
- apportionment.ts:88 electoralVotesFromSeats TOOL=DEAD YOU=DEAD only apportionment.test.ts calls it
- politics.ts:841 assertNonEmpty TOOL=PLUMBING YOU=PLUMBING argument validator that throws
- districts/query.ts:12 DISTRICT_HOME_JOIN_UNKNOWN TOOL=PLUMBING YOU=PLUMBING refusal-message string, not a rule
- office-qualification-profile.ts:145 standInQualification TOOL=PLUMBING YOU=RULE modal/range stand-in with "game-profile" basis; pure, used 5 places
- age-of-majority.ts:77 ageOfMajorityFor TOOL=PLUMBING YOU=PLUMBING World to home-state lookup; the table is the real content
- age-of-majority.ts:34 rulesFromCorpus TOOL=PLUMBING YOU=DATA reshapes research JSON rows into a keyed table
- districts/query.ts:69 districtIdentityByRecordId TOOL=PLUMBING YOU=PLUMBING linear catalog.find; needs an index
- district-residence.ts:820 assignSplitHomeDistricts TOOL=PLUMBING YOU=RULE largest-population-share district picks; but writes World
- election-contests.ts:865 isElectionContestResolved TOOL=PLUMBING YOU=PLUMBING status query over history
- politics.ts:763 transferPoliticalIndex TOOL=PLUMBING YOU=PLUMBING moves a WeakMap index between World copies
- districts/query.ts:46 districtRecordId TOOL=PLUMBING YOU=PLUMBING builds a "chamber:geoid" key string

Agreement 17/30 (57%). DEAD checks held (3 of 3 test-only or comment-only). Main misclassification: the tool calls strings (event types, transition keys, version tags), caches and history readers RULE because they are small pure-looking helpers (9 of 13 misses). Reverse misses: stand-in/range and split-home pickers (rule logic ending in a World write) called PLUMBING; two data getters called RULE or PLUMBING. Extra DEAD outside the sample: recall.ts:1343 circulatePetition (96 lines), candidate-petition-review.ts:33 reviewCandidatePetition, national-election-consumer.ts:42 importNationalContestResult, municipal-ballot-rules.ts:290 municipalBallotRuleCoverage; apportionHouse (apportionment.ts:38) only tests call it.

## 2. MAP

- Contest and count core. election-contests.ts: scheduleElectionContest (:69) writes a contest record and a due item (ELECTION_CONTEST_TRANSITION_KEY, handler registered campaigns.ts:2573+); countRecordedVoterBallots (:211) scans world.personOrder and all privateBeliefs, builds an `election.vote` DecisionContext per eligible voter, tallies by precinct; resolveElectionContest (:438) writes the result. Readers: campaigns, local-elections, recall, press.
- Candidacy and qualification. candidacy.ts candidacyEligibility (:532, 436 lines) joins office packs (candidacy-packs.ts, nationwide-world/*-candidacy-packs.ts), qualification rows, district residence (district-residence.ts, src/districts), filing terms and term-limit files. Called by the player's candidacy action and NPC intake (congress-candidates.ts, state-legislature-candidates.ts). Petitions: candidate-petitions.ts, petition-signers.ts.
- Nominations and parties. nominations/party-nominations.ts writes `election.party-nomination` and `election.nomination-runoff` events from party-nomination-rules-2026.json. Parties: living-world/party-registry.ts, party-chapters.ts (`party.chapter-*` events, outreach handler), party-evolution.ts (governing bodies, initiatives, PARTY_BODY_REVIEW handler; 2,030 lines, 75% plumbing).
- Congress cycle. congress-turnover.ts applyCongressTurnover (:1172), called from governing/office-continuity.ts:1920 applyOfficeLifecycle on each date advance (not a registered handler): intake, nominations, ballots, election day, seating; plus house-delegates.ts, statehood-seats.ts. Writes `election.congress-general-results` and `seat:<key>` tenure/vacancy events. Readers: governing, press, office-continuity (special elections, senate appointments).
- State legislatures. state-legislature-opening.ts builds chambers at world open (presentation/opening-life.ts:386); -candidates, -turnover, -queue (wake handler), state-legislative-election-calendar.ts. Writes `election.state-legislative-results`; readers: state-governing.ts.
- State executives and president. state-executive-turnover.ts, governor-succession.ts, presidential-turnover.ts (four handlers), national-elections.ts, national-election-consumer.ts (NATIONAL_COUNT_TRANSITION).
- Local elections. local-elections.ts (player's town only; filing/count/term-start/year handlers), local-government-seats.ts, town-wards.ts (ward maps, voting precincts), county/town election calendars, municipal rule packs (mostly DATA).
- Recall and measures. recall.ts (petition, close handler :1628, election handler :1819), state-initiative-rules.json, measure-numbering.ts. Districts: src/districts/* and district interval records.

## 3. STOPGAPS

Marker counts (30 lines in code, 0 in the engine's data JSON): SET BY HAND 0, GAME ASSUMPTION 2, NOT MODELED 9, PLACEHOLDER 19. The game also carries many "ESTIMATED FROM ..." notes; the release stopgap registry (stopgaps.json) is not referenced from these files.
Top items:

- presidential-turnover.ts:103-130 state results = certified 2024 share + national mood; no campaigns, no primaries, player cannot run; nominees drawn age 45-69; contingent-election votes placeholder.
- presidential-turnover.ts:787 economy's effect on vote awaits an approved rule.
- recall.ts:76 no recall of state officers/judges; no grounds testing; no replacement race; seat stays empty until next regular election.
- local-elections.ts:132 election day defaults ("first Tuesday", odd-year November), seat staggering "in seat order", primary lead, filing lead all `game-default`.
- local-government-seats.ts:81 every member's term starts on day the life opens.
- congress-candidates.ts:49 and state-legislature-candidates.ts:71 staggered declaration window (Jan 6, 60 days) is game timing, not law; `lowOpportunityShare` 0.18.
- congress-turnover.ts:714 two nominees of one party (top-two/top-four) not split; stays aggregate.
- congress-turnover.ts:834 no write-ins, no party substitution.
- state-legislature-turnover.ts:118 incumbencyBonusLogit 0.18; :488 unknown qualifications stay unknown; :747 missing lean keeps the incumbent.
- state-legislature-turnover.ts:530 ballot set day 45 days (GAME ASSUMPTION).
- state-legislature-opening.ts:351 chamber sizes from district counts; :471 DC Council not modeled here; :502 spread, age range, years served are game rules; Puerto Rico members get no party.
- state-executive-turnover.ts:184 four-year term when state term rule unread.
- state-executive-candidacy-packs.ts:50, :195 each territory's governor only "exists", rest placeholder.
- executive-term-limits.ts:42-50 90-day break, partial terms count full, silent law counts prior service.
- chief-executive-election-cycles.ts:15 Louisiana's fall primary not modeled.
- national-election-rules.ts:13 no reapportionment after 2030 census.
- municipal-ballot-rules.ts:673 other terms of an enacted recall law (window, threshold, grounds) not modeled.
- measure-numbering.ts:73 bills filed evenly across the year (GAME ASSUMPTION).
- governing/senate-selection.ts:34 amendment leaving the method to each state not modeled.
  Seeded randomness (outcomes): none picks an actor's vote or win. Seeded draws are all identity or placement: SeededRng for invented names/birthdates (election-candidate-prospect.ts:19, congress-turnover.ts:847, house-delegates.ts:255, statehood-seats.ts:166, governor-succession.ts:89, party-chapters.ts:168, party-evolution.ts:240/1803, state-executive-turnover.ts:266); house-delegates.ts:359 priorTerms = rng.integer(0,6); state-legislature-opening.ts:645 years served = seatRng.integer(0,13); presidential-turnover.ts:394 drawNominee's home state is a roll weighted by electors (:400). Close calls: congress-aggregate-outcome.ts:15 fixed 0.03 share bonus with a hard flip at 0.5 (a threshold, not a dice roll); NOMINATION_PULL 1.5/1.25/1 (party-nominations.ts:49) are fixed weights; WITHIN_REACH_PERMILLE 100 (:~205) is a cutoff.
  Place names in logic: national-election-consumer.ts:61 and national-elections.ts:643 `unitKey.startsWith("ME")` (Maine split electors, Nebraska unhandled); measure-numbering.ts:184 DC council period; apportionment.ts:97 hard-coded "DC"; state-executive-candidacy-packs.ts:81,129,209 isDistrictOfColumbia branches; candidacy.ts:410 isTerritoryUsps; house-delegates.ts:72-154 per-territory table keyed by USPS in code; candidate-qualification.ts:146-200 per-state (AK, AL...) rows in .ts; chief-executive-election-cycles.ts:41-93 and state-legislative-election-calendar.ts:93-129 (KS, NE) state tables in .ts; state-legislature-opening.ts:408 "US-PR" seat sizes. Most are data tables, but the ME and DC branches are logic.

## 4. KEEPERS

1. nominations/party-nominations.ts:113 pullOf, :126 tally, :152 tiedAtLine, :158 reachesThreshold, :250 holdNominationPrimary: deterministic primary and runoff split by recorded standing, ties left unbroken. Inputs: entrants (incumbent/partyBacked/party), party share, plan. Pure except the final history write and the runner-up decision (:~186, evaluateDecision), which would need a core2 act "request runoff".
2. nominations/date-rules.ts:100 dateFromElectionRule and nomination-rules.ts:236 generalElectionDay, :294 nominationPlan: statutory date/rule evaluation. Inputs: rule row, year. Pure.
3. election-contests.ts:211 countRecordedVoterBallots: per-voter ballot from saved beliefs, precinct tally, admitVoter hook. Entangled (scans personOrder and history.privateBeliefs). Would take: voter list from an electorate index by place, a beliefsByPerson map, a choose-candidate function in the shared chooser.
4. municipal-ballot-rules.ts:189 resolveMunicipalBallotRule, :544 resolveMunicipalElectionTiming, :678 resolveMunicipalRecallRule, :413 tabulateBallot, municipal-election-rules.ts:386 resolveRequiredSignatures: rule-pack resolution with "state-law-unverified / national-estimated" basis, signature thresholds, ballot tabulation (ranked/approval etc.). Pure over packs.
5. Term-limit bars: nationwide-world/state-legislative-term-limits.ts:257 legislativeTermLimitBar, executive-term-limits.ts, local-council-term-limits.ts:112 councilTermLimitBar, presidential-turnover.ts:373 presidentialTermBar. They read prior service from World history; replace with a per-person office-service list (prior-terms.ts shows the shape).
6. office-qualification-rules.ts:546 assessOfficeQualifications and office-qualification-profile.ts:76/116/145 modal/range/stand-in: field-by-field qualification with sourced vs stand-in basis. Mostly pure; takes person facts (age, residence years, citizenship).
7. living-world/town-wards.ts:349 drawWardCuts and :135 councilWardPlan: ward cuts within deviation, no dice; inputs: household count, ward count, drawer, member homes. Pure.
8. apportionment.ts:38 apportionHouse (equal proportions) and largest-remainder.ts; national-election-rules.ts electoral allocation. Pure. Keep for reapportionment after 2030.
9. nationwide-world/senate-vacancy-law.ts:105 senateAppointmentTiming, governor-succession.ts, state-legislative-election-calendar.ts:153/205 and town/county-election-calendar.ts:67: who fills a vacancy and when the next election falls. Pure over data rows.
10. petition-signers.ts:58 petitionSignerEligibility and candidate-filing-terms.ts:99 filingDeadlineBefore: signer and deadline rules. Pure over rows.
11. living-world/congress-aggregate-outcome.ts:17 aggregateCongressAffiliation: small and pure, but it carries a hard 0.5 flip; re-express as a smooth lean-to-seat-share function when ported.
12. district-residence.ts:820 assignSplitHomeDistricts logic (largest population share): pure core, World write wrapper.

## 5. CORE2 MODULE INPUTS

State (Maps by id, indexes): contests (by place+date, office, candidate); seats (seatKey to holder, term, party; by body, by person); offices/bodies; candidacies, filings, petitions with signatures; nominations (seat+stage to entrants and shares); parties, chapters, officers; district and precinct membership (person to precinct and precinct to persons, replacing the personOrder scan); per-person office-service lists for term limits; recall petitions; ward and precinct maps.
Acts: ordinary adult: register/change party, sign or circulate a petition, vote (contest, election day, eligible), join/leave chapter, start recall. Prospective candidate: file candidacy (qualification, fee/petition, window, no term-limit bar), withdraw, request runoff. Officials: resign, seek or decline re-election, appoint to a vacancy, call special election, certify, redraw wards. Party bodies: propose, respond, adopt initiative.
Effects: seat holder and tenure, party affiliation, tally and winner, nomination outcome, vacancy, appointment, term start/end, recall removal, ward remap, campaign money via transfer.
Events: ElectionScheduled, CandidateFiled and Qualified/Refused (public), NominationResult, ContestResult with tallies (public, news), SeatVacated, SeatFilled (public, news), TermStarted, TermLimitReached, RecallStarted/Closed/Vote, PetitionSigned (private), ChapterJoined (private to circle).
Calendar tier: presidential and midterm election days, per-state primary/filing dates (filing-office.json), state legislative cycles, odd-year local dates, Jan 3 and Jan 20 term starts, electors meet. Daily only for the player's campaign and focus-place filing/count days; weekly for chapter outreach.
Data reused: data/research/elections/_.json (party-nomination-rules-2026, candidate-filing-terms, filing-office, petition-signer-terms, state-initiative-rules, office-qualifications, house-delegates-2024), data/municipal-elections/92O-national-state-baseline.json, local-government council-election-methods/governing-body-seat-qualification/county-governing-bodies, county-election-_.json, statehood-seats.json, apportionment-2020.json, age-of-majority.json, src/districts/*.generated.json.

## 6. DEPENDENCIES AND RISKS

Needs first: people/households/places, calendar, knowledge (beliefs about candidates), organizations/memberships, money, the shared chooser (vote needs "support/oppose candidate" pulls), law-consequences (enacted rule changes) and governing (office-continuity, joint-assembly), which also read and write seats.
Riskiest:

1. Seat truth lives in history events (`seat:<key>` tags, LIVING_WORLD_WRITER_VERSION) read by seatHolderOn, localSeatHolder, campaignSeatHolders and governing; a seat table needs a one-time import from old saves.
2. Whole-world scans: countRecordedVoterBallots, validateNationalRecord (503 lines), assertElectionContestIntegrity. Needs electorate indexes and an aggregate count for non-circle voters.
3. Per-place tables inside .ts (municipal packs 1,049 lines, candidate-qualification.ts, chief-executive cycles, KS/NE calendar rows, house-delegates, state seat sizes) plus ME and DC branches in logic.
4. party-evolution.ts and recall.ts mix rules with history writes and decision traces; adoptPartyInitiative (414 lines) and askToSign (339) must be split first.
5. Invented officeholders use SeededRng(world.seed).fork(stableKey); changing keys changes who exists.
6. Dice-adjacent items: drawNominee state roll (presidential-turnover.ts:400), priorTerms/yearsServed draws, incumbency constants, hard 0.5 flip in aggregate seats.

## 7. LIFE-REPLAY STEPS

- candidacy (full): candidacyEligibility, filing, petitions. Lacks named special-election filing (House specials only in office-continuity HOUSE_SPECIAL_ELECTION) and historic-year rules (data is 2026).
- election-result (full): contest and general results. Lacks forced historic outcomes (must emerge), a presidential campaign, top-two splitting, write-ins.
- reelection-decision (full): incumbentStands (presidential-turnover.ts:526), decideSelfStarterRun, recordSeatCandidacyIntent (congress-turnover.ts:228). Lacks one "decline to run" act across offices; the presidential rule is a fixed age/four-in-five style rule.
- office-service (partly): tenure and term-limit counting here; duties are governing. Lacks one office-service record (each term-limit file rebuilds it).
- office-succession (partly): governor-succession.ts, senate-vacancy-law; presidential succession sits in governing/office-continuity. Contingent election votes are placeholder.
- public-appointment (partly): vacancy appointment timing here; confirmations are governing.
- cause-participation, chamber-leadership (marginal): petitions and chapters; party officers only.
- Not this engine: residence-move (only re-binds district and precinct), health-shock (a death opens a vacancy this engine fills), law-signature and the rest.
