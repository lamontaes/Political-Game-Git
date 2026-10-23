# Tracer reports, condensed

One per engine, written by the Haiku tracers and condensed by the CTO. File and line references are as the tracers gave them. The verifier's corrections follow at the end.

```text
ENGINE: core2-ballot-measures-v1
(a) Statewide question put to voters where state law allows; approved measure becomes state law. Spec docs/packages/M3-world-of-governing.md:41; module header ballot-measures.ts:2-15.
(b) Installed src/bench/world.ts:329 openBallotMeasures. Only putOnBallot schedules "measure-count" calendar work (ballot-measures.ts:125-131), called only from openBallotMeasures (:94). A row is put only if m.stateKey === lawChain(api).stateKey and m.electionDate > core.date (:88-93). Data: src/core2/data/elections/ballot-measures.json built by scripts/research/build-ballot-measures.py (MAPPING :57).
(c) ballot-measures.json holds 17 measures in 11 states (CA, CO, ID, MA, MO, NC, NV, OK, VA, VT, WA), none for US-MS. data/research/elections/ballot-measures-2026.json process["US-MS"] (~line 429): initiative "process inoperative since 2021 court ruling". Every measure's electionDate is 2026-06-16 or later, after the run's end (2026-01-20).
(d) measuresOf, measureResult, measureVoteOf (:324-347): no caller outside the module in src/ besides the bench install and tests. enactLaw (:277) writes an approved measure into law via laws.ts:361-379, so the law in force is the reader.
(e) None in owner rules. later-specs-draft.md:159-160 "ballot measures and recalls happen where a place really allows them". Stopgap SG-GOV-measure-groups-stand-in (stopgaps.json ~1185): voters the world doesn't name vote as even lean bands.
(f) WAITS-ON-CAUSE (no Mississippi measure; all measures fall on or after 2026-06-16).
(g) None for Mississippi; prove in a measure state over a window including its 2026 election day.
```

```text
ENGINE: core2-interest-groups-v1
(a) "Groups form from whoever loses money under a bill's fiscal note; they lobby..." (docs/archive/2026-10-23/roadmap/later-specs-draft.md:134-140, M3-07; docs/packages/M3-world-of-governing.md:18-21).
(b) No core hook: registers organize and lobbyTerm through registerLegislatureHooks (interest-groups.ts:130-133); holdVote runs beforeVote hooks only for a "drafted" bill (legislature.ts:1616-1620). holdVote callers: world-legislating.ts:444 (policy-question bills only, :431-436) and legislature.ts:2027 (council). Employer/dues path: organize returns unless employerCosts finds a law-amount provision with series "minimum-wage" (interest-groups.ts:172-173; legislature.ts:208-215). Residents path organizeResidents (:386) runs on any policy-question bill.
(c) Groups 0->6 and meetings 0->240, all us-policy-positions:* questions: the residents path. Dues 0: no minimum-wage bill is ever drafted in the played world (world-legislating drafts only policy-question bills; the council's budget bill carries only budget-line provisions, legislature.ts:260). The census counted no call because the hook goes through the legislature, not the core.
(d) meetings read by lobbyTerm (interest-groups.ts:360-372) summed into each member's position at legislature.ts:1120-1122: real read. groups read only by organize and groupsHere (:510, tests only). dues read only by the journal source (:43-70).
(e) No owner ruling. Stopgap SG-GOV-group-lobbyist-stand-in (stopgaps.json ~1207): "An employers' group's lobbyist is the best-paid town resident working for the member business the bill costs most".
(f) WORKS for residents' groups; WAITS-ON-CAUSE for employers and dues (no minimum-wage bill is ever written).
(g) Have world-legislating file the catalog's minimum-wage bill from a cause (the wage floor in force falling behind regional pay), so employers organize and pay dues.
```

```text
ENGINE: core2-recalls-v1
(a) "Voters removing a local official before the term ends, only where the state's law gives its places a recall" (recalls.ts:2-4; later-specs-draft.md:159-160).
(b) law-took-effect (recalls.ts:68; emitted laws.ts:438-440) -> weighOrdinance writes only if level is city/county (:169), the law has a terms.enactedBy measure (:174-175), the state rule has a circulation window (:154-156, :176-177), a matching bill (:178-190), a serving member without an open recall (:196-203), and an organizer's grievance-plus-duty drive above recallOrganizerEffort (:206-223). petition-due (:270-294) and recall-vote (:295-349, vacateSeat) on the calendar.
(c) recalls 0->7; 30 law-took-effect events, 11 calendar calls. Two sampled rows: petitions started 2025-03-06, due 2025-05-05; signatures 1,143 and 1,224 against 882 required; both "removed", 387 remove to 309 keep.
(d) recalls table read by nobody outside the module (only query :199; recallsOf :368 no outside caller). recall-petition event (:256-268, news:true) read by news.ts:340. Removal reaches offices via vacateSeat (offices.ts:779-798, endedBy "recalled"), read by serving-term readers (legislature.ts:458, world-races.ts:442, electorate-inputs.ts:65).
(e) No recall ruling. Stopgap SG-GOV-recall-signature-groups (stopgaps.json ~1195). gov.md:27 "Open: a replacement race on the same ballot where the doctrine has one".
(f) WORKS (removals reach offices; petitions reach the news).
(g) Emit a public-record event with the tally at recalls.ts:344-348 so the news reports the outcome.
```

```text
ENGINE: core2-constituent-cases-v1
(a) "residents bring real problems from their own records to an official, who helps or doesn't, and it changes how they see that official" (constituent-cases.ts:1-17; docs/packages/M3-world-of-governing.md:24-30, :83-85; gov.md:31).
(b) openCases (bench world.ts:333) schedules monthly "office-hours" (constituent-cases.ts:81-99; data/campaigns/parameters.json:347-352); case-due 7 days after a case opens (:230-247). A row needs a resident council member or mayor (:107-115, :184); a live resident not an official (:187-190); no case in 180 days (:191-198); problemOf returns a problem (:199; below-floor pay :128-141, or out of work under 62 with under 3 months' savings :149-164); and severity + reachOut > caseEffort 1.3 (:201-208); reachOut from trait-decisions.json "constituent-cases.bring-case".
(c) 12 office-hours + 2 case-due = 14 calls. Both cases were "looking-for-work" (cushions 0.4 and 0 months), handledBy "staff", outcome "turned-away". The binding gate is :208: even at zero savings a resident needs reachOut > 0.3, and reachOut is fixed by traits.
(d) cases table read by nobody outside the module; handleCase, casesFor, allCases have no non-test caller (no player screen). touchImpression (:319) writes impressions read by voting.ts:386, :482, :1238 and campaigns.ts:697, :809.
(e) No owner ruling; no stopgap. gov.md:31 "They come when the problem presses hard enough and they're ready to reach out". M3 :85 "Simple in early access (Oct 10)".
(f) RUNS-BUT-UNREAD (the case rows; the impression it leaves is read by voting and campaigns).
(g) Give the official a desk item that reads open cases and calls handleCase (the executive's desk already exists), and check caseEffort against its Pew source.
```

```text
ENGINE: corruption (src/core2/modules/corruption.ts)
(a) "People can offer or take bribes and favors because of their own traits, money and circumstances. It leaves records that can surface later through people or news." (docs/archive/2026-10-23/roadmap/later-specs-draft.md:152; docs/packages/M3-world-of-governing.md:33, :49).
(b) considerBribe(api, ask) at corruption.ts:148 is the only writer of a crime row (needs live offerer and official, positive amount, :149-156; offer decision :159-176, take decision :178-196, put :211-215). onRelationshipChange with relationshipKinds ["*"] (:316-317) returns unless both parties are in a taken crime (:319-320; partiesOf :67-76). Reason provider corruption-circumstances (:299-315) runs only inside decide (:136-140), reached only from considerBribe or the tell path (:341-349).
(c) considerBribe has no caller in src/ except src/core2/corruption.test.ts:52 (fixture stake 50,000,000, subject "fixture-contract"). So crimes stays empty and all 17,419 relationship notices exit at :320.
(d) crimes/surfaced read by scandalOf at src/core2/electorate-inputs.ts:165-180 feeding candidateInputs (:237), imported by voting.ts:90 and world-races.ts:48. crimesKnownTo (:272) has no caller outside tests.
(e) docs/packages/M3-world-of-governing.md:90 "Basic in early access: bribes and favors, records that surface later; investigations and prosecutions after (Oct 10)." docs/archive/2026-10-23/coordination/core.md:164 open question on crime under no-dice: "Until you rule, I'm building nothing." Stopgap SG-P15-corruption-weights (stopgaps.json ~2192).
(f) NO-CALLER (considerBribe is never called in play).
(g) Have the engine that holds a favor an official controls (a contract, a permit, a vote on a bill an interest group wants) call considerBribe with offerer, official, stake and record id.
```

```text
ENGINE: beliefs (src/director/conversation.ts)
(a) "The false beliefs a person holds from lies told to them" (conversation.ts:1046-1047); docs/packages/M4-words.md:53 "Lies: the exact claim, who heard it, and its later discovery".
(b) Installed via src/director/play-modules.ts:41 (peopleModules) used at src/bench/world.ts:295. Hook onRelationshipChange (conversation.ts:1063) does nothing when believers() is empty (:1066-1068). Only write is in say() when choice.lie && last.subject.own (:883), put at :902-913 for hearers not doubtsClaim. The lie line is offered by offerChoices (:711, :792-822) only about the player's own record.
(c) say() is called only by the bench's player routes POST /api/talk/open and /api/talk/say (src/bench/server.ts:274, :283) and a grading tool (src/director/tooling/grading-batch.ts:101-104). No NPC-to-NPC conversation exists. The run had no player talk, so no lie. 17,419 relationship notices each found no believers.
(d) beliefs table read only inside conversation.ts (believers :1035-1041, beliefsOf :1047, used :1071, :1100). The lie also writes api.observe knowledge (:907-912) and the found-out check emits a told event (:1084-1094).
(e) No owner ruling. docs/archive/2026-10-23/coordination/play.md:26 "Press them to lie: they tip, the line glows soft red, and the lie is remembered." docs/design/director-on-core2.md:96 "the new core has no producer for any of the three" (lies, favors, promises).
(f) WAITS-ON-CAUSE (only the player can lie, and the run had no player talk).
(g) Prove it with a scripted player conversation in a generated world; nothing in the engine is wrong.
```

```text
ENGINE: core2-law-effects-v1
(a) "on its effective date a policy reaches the specific named people it covers, as a record on each of them" (law-effects.ts:2-5); later-specs-draft.md:117 (M3-04).
(b) laws.ts:390-398 schedules law-takes-effect; lawTookEffect (laws.ts:432-457) emits law-took-effect; budgets.ts:885-887 and :1037-1040 emit budget-line-changed. onEvent (law-effects.ts:72) -> applyLaw (:219): runHandlers (:220) first, then returns unless kind is law-took-effect (:221), series is a key in policy-effects.json (:224), the laws row exists (:225-229), inForceHere (:237), value === 1 (:251); then reaches() per person (:124-138, :254). openLawEffects (:75-117) applies opening rows that pass the same gates (:90-92).
(c) policy-effects.json (:7-43) has five keys, all us-policy-positions:*. The laws taking effect in the window (starting-law.json, 2025-10-01 / 2026-01-01) are rate series (income-tax, sales-tax, snap-maximum, medicaid-match), none cataloged, so all 30 stop at :224. The five cataloged questions start "no" in Mississippi. The 42 budget events run their handlers (law-reach/group-b.ts:453 runBudgetLine writes other engines' tables) and then return at :221 by design.
(d) [CORRECTED BY OPUS SPOT-CHECK] applied is read by the bench screens: src/bench/card.ts:110 (effectsOn on a person's card) and src/bench/changes.ts:45-46 (the applied table). No other engine reads it. Tests also read it.
(e) No owner ruling. docs/archive/2026-10-23/coordination/play.md:72 "the law-effects records cover cataloged policies, not amounts". AGENTS.md "An effect is a read, not a record".
(f) WAITS-ON-CAUSE (a cataloged policy question enacted or in force; all five start 'no' in Mississippi and none passed). Screens read it; no engine does.
(g) Have the engine that enforces each cataloged question (jobs for employment rules, etc.) read applied when it decides, so the record becomes an effect.
```

```text
ENGINE: core2-world-races-v1
(a) "every state and federal seat the town only sees from afar is elected on the real general election day" (world-races.ts:2-5; docs/archive/2026-10-23/coordination/gov.md:35).
(b) openWorldRaces at src/bench/world.ts:328 schedules scheduleElection(api, nextRaceYear(api, year)) (world-races.ts:101-103). nextRaceYear skips odd years not in oddYears (:136-137); oddYears from the town state's legislative seats with an odd electionYear (:113-135). Calendar "general:<year>" on novemberGeneralElectionDay (:141-155; gov-rules/town-election-calendar.ts:20-27). onCalendarWork dispatch :191-215. racesIn :495-596 covers the town state's legislature and Congress (out-of-state Congress in even years).
(c) Mississippi's legislature next regular election is 2027 (filing-requirements.json US-MS stateLegislative offeredIn2026:false, nextRegularElection "2027"; offices-state.ts:277-301), so nextRaceYear(2025) -> 2026 and the first entry is general:2026 on 2026-11-03, after the run ended.
(d) races/seats read by worldSeatParty in legislature.ts:853-862 (tracer unsure whether it has a caller; ~:900). racesOf/presidentialOf (:864-878) and raceBlocksOf (:777): no caller outside the module.
(e) No owner ruling. Stopgap SG-GOV-world-race-lean open (party's typical candidate). Test comment played-world.node-test.ts:119-120.
(f) WAITS-ON-CAUSE (first general election 2026-11-03). Gap: no governors or other states' legislatures in racesIn, so 2025 VA/NJ governor races are never modeled.
(g) None for the odd-year silence; fix the test comment.
```

```text
ENGINE: core2-voting-v1
(a) Puts a contest's filing close, primary and election day on the calendar and holds the vote (voting.ts:215-216). Baseline row in political-process-baseline.md.
(b) openVoting (bench world.ts:311) schedules each elections "contests" row via scheduleContest (voting.ts:208-216): filing close if filingDeadline > date (:225-233), primary if primaryDate > date (:234-241), election day (:242-251). holdElection (:1168) writes ballots/results/blocks; holdPrimary (:752) writes chosen; fileStandingCandidates (:574) writes elections filings only. A contest exists only if contestFor finds a next election (elections.ts:289-362, early return :335). Municipal dates from municipal() (elections-calendar.ts:265-295), first year where inYear holds (:274-276).
(c) 2 calls, inferred as the federal filing close 2025-12-26 (data/research/elections/party-nomination-rules-2026.json ~862, read by elections-calendar.ts:107-140). Federal primary 2026-03-10 and general 2026-11-03 are after the run. Mississippi's municipal general is "first Tuesday after first Monday in June every 4 years, e.g. 2021, 2025, 2029" (data/municipal-elections/92O-national-state-baseline.json:1637) but the timing "quadrennial-summer-june" is coded inYear: (y) => y % 4 === 0 (elections-calendar.ts:253-254), which picks 2024 and 2028, so Amory's June 2025 election is never scheduled. Legacy copy src/simulation/living-world/local-elections.ts:229. No municipal primary date in the pack.
(d) ballotOf (:1933), resultOf (:1944), blocksOf (:1708) exported; readers not traced (no rows written).
(e) No owner ruling. Stopgaps SG-GOV-who-runs-stand-in (voting.ts:581), SG-GOV-tie-by-lot (voting.ts:1085, "the owner hasn't ruled on legally required lots" — note the owner did rule Oct 14: "Ties: follow the law of the place; where it says lot, a recorded lot").
(f) WAITS-ON-CAUSE in the year window, plus a DEFECT: Mississippi's 2025 municipal election is skipped by a wrong four-year rule.
(g) Carry each state's four-year anchor year in its municipal pack row (from its cited statute) instead of y % 4 === 0 at elections-calendar.ts:254 and :259.
```

```text
ENGINE: core2-press-v1
(a) "A candidate asks an outlet for an interview, or in the weeks before a general election an outlet asks the candidates on the ballot" (press.ts:1-18; BOARD.md:95).
(b) openPress (bench world.ts:331) records 4 outlets (press.ts:165-225); weekly onCalendarWork (:148) -> pressWeek (:670), rescheduled by scheduleWeek (:234). Gates: elections installed (:673); a contest with electionDate within six weeks (invitationWeeks, :676-686, data/press/parameters.json); on-ballot filings (:689-690). arrange (~:500-540) writes a row even when declined. requestInterview (:485) has no caller in src/ outside tests.
(c) No contest with an on-ballot filing fell within six weeks of any week in the run: Amory's June 2025 municipal contest was never created (elections-calendar.ts:254 y % 4 === 0 vs Mississippi's 2021/2025/2029 cycle), and state/federal contests are November 2026. County contests not checked.
(d) outlets read by meetings (meetings.ts:529, :553) and campaign ad buying (adOutlet press.ts:328, registered :169). interviews read only inside press (interviewsFor :546). Published interview event (press.ts:616-626, publicRecord) read by news.ts:339-340.
(e) No owner ruling. Stopgaps SG-GOV-press-outlet-names ("outlets are sized from state counts, not named real outlets") and SG-P15-news-habits ("one generic local outlet stands for all").
(f) WAITS-ON-CAUSE (an election within six weeks with filers on the ballot; blocked here by the four-year-cycle defect).
(g) Fix the municipal four-year rule (see voting). Separately news writes its own generic outlet per place (news.ts:72-73, :340-346), duplicating press's outlets: replace news's outlet with press's.
```

```text
ENGINE: core2-meetings-v1
(a) "public comment at council and county meetings, testimony at legislative hearings, town halls and debates" (meetings.ts:2-4; gov.md:250-251; docs/packages/M2-campaigns.md:20).
(b) openMeetings (meetings.ts:143-150, bench world.ts:332) schedules "debate-week" every 7 days (:153-167). debateWeek (:650) writes a debate only when a contest's election is 8 to 14 days ahead (:654-661; parameters.json:58 debateDaysBefore 14), none exists (:672), and two or more on-ballot filings exist (:673-676). Outlet optional (:526-536, :680). holdTownHall (:381) has no calendar entry and no hook. Public comment is a beforeVote hook (:145) in holdVote (legislature.ts:1620), local bills only (:247).
(c) remarks 0->153 from public comment. townHalls 0: holdTownHall and signUpToSpeak have no caller in src/ outside meetings.ts. debates 0: no contest with an election day in the window had two on-ballot filings (Amory's municipal election was never scheduled; see voting); the municipal who-runs stand-in files only the incumbent (voting.ts:582; challengers only for state/federal :648, :686).
(d) remarks read by roomTerm (:322) as a positionTerm summed into each member's vote (legislature.ts:1120-1122): real read. debates read only inside meetings (:672); "debate" and "town-hall" events are news:true (:610, :492) but no code reads those kinds.
(e) No owner ruling. gov.md:100, :106 ask OPUS-PLAY to make these reachable. BOARD.md:96 testify-at-hearing act "never offered" (drives.json:614). Stopgap SG-GOV-who-runs-stand-in (stopgaps.json ~1108).
(f) remarks WORKS; debates WAITS-ON-CAUSE (a contest with two filers 8 to 14 days out); town halls NO-CALLER.
(g) Give holdTownHall a caller: an official's or candidate's drive offers "hold a town hall" as an act.
```

```text
ENGINE: core2-officials-v1
(a) "Seat every official outside the town as a person" (officials.ts:500-502); take-office handler "A state or federal official, or a newcomer who ran, takes a seat" (:1302-1304); BOARD.md:28; docs/archive/2026-10-23/coordination/officials.md:14.
(b) eventKinds ["took-office"], onEvent (officials.ts:99-104). Only emitter: takeOffice in voting.ts (:1877-1895), reached from an election result (:1437) or a scheduled take-office entry (:1426-1436, dispatch :268). officials rows also written by openOfficials (:504-516) and seatOfficial (:862-927) via holderOf (:822-855) or legislature.ts:931. candidates rows by officialCandidate (:1155-1300) from fileStandingCandidates (voting.ts:663, :671, :699).
(c) No election was held in the window (voting results 0), so took-office never fired. officials 1572->1575 from seatOfficial via holderOf (legislature.ts:830, :897, :1049, :1725). candidates 0->2: Democratic challengers for US Senate and House district 1 at the 2025-12-26 federal filing close.
(d) officials read by legislature.ts:927, :979, :1087, :1094, :1847; world-legislating.ts:326 (officialStance); record.ts:90 (votesAreTownNews). candidates read by nobody outside the module (voting uses the returned personId).
(e) Owner ruled Oct 14: "every named official ... is a full person with a campaign past from day one". Stopgaps SG-GOV-who-runs-stand-in, SG-OFFICIALS-unrecorded-party (officials.ts:323).
(f) WAITS-ON-CAUSE (an election decided in the window). The rest of the engine works and is read.
(g) None in officials; the four-year-cycle fix in voting gives Amory a June 2025 election whose result emits took-office.
```

## Verifier corrections (Sonnet)

- Ballot measures: the Mississippi process note is near line 440 of `data/research/elections/ballot-measures-2026.json`, not 429. `docs/archive/2026-10-23/coordination/gov.md:25` says 13 states; the data has 11.
- Interest groups: a council bill on the policy question "raise the minimum wage" was drafted on March 6, 2025 and lobbied. What is never drafted outside the player's route is a bill that changes the wage amount (`src/bench/legislature.ts:149-164` is the only one). The council budget bill's provisions are at `legislature.ts:267`.
- Recalls: a removal is already reported, since `vacateSeat` emits a public "seat-vacated" event (`offices.ts:801-811`). Only the tally is missing. `electorate-inputs.ts:65` reads only the president's seat.
- Constituent cases: the executive's desk holds bills awaiting signature, not an inbox, so a case list would be new.
- Corruption: the electorate-inputs imports are at `voting.ts:87` and `world-races.ts:44`.
- Law effects: at least one of the 30 laws was a council ordinance passed in play (immigration enforcement, March 6, 2025), not a starting rate. It is not cataloged either.
- Races elsewhere: `worldSeatParty` is called at `legislature.ts:900`. `novemberGeneralElectionDay` is at `gov-rules/town-election-calendar.ts:43`.
- Voting: only Mississippi and Alabama use the four-year rules, and Alabama's citation agrees with the code. `filing-requirements.json:342` says Alabama's next town filing is 2029, which conflicts. The code's June date is the first Tuesday of June; the statute says the first Tuesday after the first Monday. These differ when June 1 is a Tuesday (2021, 2027).
- Meetings: the news engine stores every public event, so held town halls and debates would reach the news (`news.ts:337-352`).
- Officials: the three new officials rows were not matched to a writer by record.
