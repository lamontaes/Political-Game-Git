# A new player can run and lose, but cannot govern or hear about it

You have six decisions to make, listed under "Owner decisions needed." The first: what a player who loses can do next. Today a new player can turn 18, file for office, campaign and see election night. That is step 5 of the 11-step golden path. The player lost, and nothing on the play page lets a loser propose a law. Played as a sitting council member instead, a bill reached step 9: it passed and took effect. No one mentioned it afterward, because the game has no way to carry a law into conversation. 27 defects are confirmed.

## How far the player got

**The player's own character reached step 5, "win or lose."** He lost, 261 votes to 3,391. With no seat, steps 6 to 8 ("propose," "negotiate," "pass or fail") have no control on the play page for him.

**Played as a sitting council member, through the play page's "Play anyone" control, the path reached step 9, "the town visibly changes."** Step 10, "people bring it up," was not reached. Step 11, "the next election uses the record," needs the August 2028 election; the run stopped on January 3, 2027.

## The path, step by step

The town is Aliceville, Alabama. The character is Jared Harrington, born January 22, 2007. The game opens on January 20, 2025. Each paragraph is what the screen showed.

**1. Turn 18.** Jared's card said 17 on January 20, 2025. After two presses of Day it said 18, on January 22. No scene, journal line or news item marked the birthday. The golden-path panel's evidence for steps 1 and 2 named a different resident, Abigail Willis.

**2. Meet people.** The scene showed his household. He talked with his sister Jasmine. She asked, "Are you still living in Aliceville?" and he answered, "Yes, still in Aliceville." Every person in the scene was family.

**3. File for office.** At 18 he met the age and voter checks with no extra step. 33 contests were open for filing, for elections from 2026 to 2028. The one with the soonest deadline that he could enter was county commissioner, district 1. Its record says filings go to "County party chair (party); judge of probate (independents)." He walked into the filing office, picked the seat, chose a stance and no party, and filed. The result read "on-ballot." Behind the counter stood his own mother, Paola Harrington, who holds the circuit clerk's seat. The form showed two deadlines: "Deadline 2026-08-10" and a check row reading "2026-01-23."

**4. Campaign.** On the same day he knocked doors for two hours: 7 people reached, all 7 warmer. He asked 35 people to volunteer, and 1 said yes. Two people gave a total of $2.09. 17 of 35 people endorsed him. A speech for limiting groundwater withdrawal reached 115 people, 25 warmer and 90 cooler. The 50-person poll he ordered reached 0 people, and the screen showed "poll: 0" with no reason.

**5. Win or lose.** He lived to November 3, 2026, on the Calendar control. Commissioner district 1 went to incumbent Michael Garner, with 3,391 votes. Jared had 261. His father, Stephen Harrington, had filed for the same seat against his son and got 11. No ballot screen ever appeared; Jared was never asked to vote. 26 races were decided that night. The results sheet lists 8 of them, and Jared's race was 12th, so his own result was not on it. The election-night scene showed his family at a party venue. No journal line or conversation said he lost.

**6. Propose.** With Jared out of office, "Play anyone" switched to Lucas Wise, an Aliceville council member, on November 19, 2026. A minimum-wage ordinance, 2026-036, came back blocked: "state law preempts local minimum wages," citing Alabama's 2016 law. A handgun-age ordinance, 2026-037, was also blocked. An ordinance banning discrimination in housing and work, 2026-038, was drafted.

**7. Negotiate.** He asked each of the four colleagues where they stood. Each answer is a decision score, where above zero leans yes; all four were between 0.32 and 1.05. Each score is split into views, constituents and his tie to them. He offered Nicole Jensen a favor, and the screen said "declined."

**8. Pass or fail.** The vote came 14 days later, on December 3, 2026. It passed 5 to 0. One of the yes votes was Jared's father, who already held an Aliceville council seat when the game opened, and ran for county commissioner while keeping it. No control let Lucas Wise cast his own vote. No scene or journal line marked the vote; it showed as a status change and as news rows.

**9. The town visibly changes.** The ordinance took effect on January 2, 2027. The "What changed" sheet opened by itself and listed it as reaching 10 residents, in a town of about 2,100 people by the repository's population data. It named four of them, each with the line "may not be refused housing or work for a protected trait." Nothing in the scene changed.

**10. People bring it up.** Back as Jared, he talked to eight people: his five household members, including his father, and three others. Every conversation opened with a question about where he lives. Nobody mentioned the ordinance. Five rows on the news sheet name it.

**11. The next election uses the record.** Aliceville's next council contests are dated August 22, 2028, and list each incumbent. The run stopped before then.

## Confirmed defects

A Sonnet agent checked each defect against the code. "Measured" means this run showed it; "read in code" means the code shows it but this run did not exercise it.

| #   | Rule broken                                   | What the player meets                                                                                                                                        | Where                                                                                               | How known                                                                                   |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Report the furthest step                      | The golden-path panel names a different resident for steps 1 and 2                                                                                           | `src/bench/progress.ts`, `benchProgress`                                                            | Measured: `person_0b3064e235217e79` shown for player `person_0fe134873cf039ed`              |
| 2   | Report the furthest step                      | Steps 1, 2, 10 and 11 can never show as reached                                                                                                              | `src/bench/reached.ts`, `reachedSteps`                                                              | Measured: the panel's furthest step stayed blank after steps 1 and 2                        |
| 3   | Report the furthest step                      | Step 9 can be credited by another body's law with the same bill number                                                                                       | `src/bench/reached.ts`, `reachedSteps`; `src/core2/modules/legislature.ts`, `nextNumber`            | Measured: a U.S. Senate bill `2026-001` beside state and city laws ending `:2026-001`       |
| 4   | Golden path reachable                         | A mayor or governor has no control to propose anything                                                                                                       | `src/bench/legislature.ts`, `bodiesOf`                                                              | Read in code                                                                                |
| 5   | Golden path reachable                         | A bill awaiting the executive's signature has no sign or veto control                                                                                        | `src/core2/modules/legislature.ts`, `executiveDecision` has no caller                               | Read in code                                                                                |
| 6   | The player decides                            | The player never chooses a ballot; the engine casts it, and a candidate's own ballot can go to a rival                                                       | `src/core2/modules/voting.ts`, `castBallot` has no caller                                           | Measured: ballot for Stephen Harrington in `contest:seat:gus2025:100015:board:0:2026-11-03` |
| 7   | The player decides                            | A member being played cannot cast their own vote                                                                                                             | `src/core2/modules/legislature.ts`, `castMemberVote` has no caller; `src/bench/player.ts`, `select` | Measured: the vote on bill `2026-038`                                                       |
| 8   | Golden path visible                           | The results sheet shows 8 races; the player's own race can be cut                                                                                            | `src/bench/play.mjs`, results sheet; `src/bench/results.ts`, `electionResults`                      | Measured: Jared's race was 12th of 26                                                       |
| 9   | Place's real records                          | The filing clerk shown holds the first clerk-type seat in town, not the office that takes the filing                                                         | `src/bench/filing.ts`, `openBenchFilingVisit`                                                       | Measured: `person_0fe132873cf03687`, the circuit clerk                                      |
| 10  | Place's real records                          | The filing form shows two different deadlines                                                                                                                | `src/bench/filing.ts`, `overlayFor`; `src/core2/modules/elections.ts`, `checkEligibility`           | Measured: 2026-08-10 and 2026-01-23                                                         |
| 11  | Place's real records                          | Alabama county contests have no primary, though the repository's nomination data has one on May 19, 2026                                                     | `src/core2/gov-rules/county-election-calendar.ts`                                                   | Measured: the contest above has no primary date                                             |
| 12  | Place's real records                          | President takes the governor's minimum age (30, not 35); a state senator takes the lower house's (Georgia: 21, not 25)                                       | `src/core2/modules/elections.ts`, `officeFamily`                                                    | Measured in a Shiloh, Georgia world, seed `audit-1791951901523`                             |
| 13  | Place's real records                          | Every contest, even statewide, checks residency against the town only                                                                                        | `src/core2/modules/elections.ts`, `checkEligibility`                                                | Read in code                                                                                |
| 14  | Place's real records                          | The U.S. Senate appears as the state's two senators but votes as the whole Senate, and a federal bill reads "within the state's own power"                   | `src/core2/offices-state.ts`; `src/core2/modules/legislature.ts`, `draftBill`                       | Measured: bill `2026-001`                                                                   |
| 15  | Turnout slides from causes (ruled October 14) | Most votes come from a fixed share of population split by sampled voters; registered as `SG-GOV-voter-groups-stand-in`                                       | `src/core2/modules/voting.ts`, `groupVote`                                                          | Read in code                                                                                |
| 16  | Sliding scales                                | A favor to a member whose score is already above zero always reads "declined"                                                                                | `src/core2/modules/legislature.ts`, `offerDeal`                                                     | Measured: Nicole Jensen, score 0.45                                                         |
| 17  | An effect is a read                           | The housing-and-work law changes no hiring or housing decision; its records are read only by screens, and no stopgap registers it                            | `src/core2/law-reach/group-a-records.ts`, `applyRecords`                                            | Measured and read in code: `law-took-effect:…:2026-038`                                     |
| 18  | An effect is a read                           | Deal obligations are written and read only by tests                                                                                                          | `src/core2/modules/legislature.ts`, `obligationsOf`                                                 | Read in code                                                                                |
| 19  | Registered stopgaps                           | The pollster is an unregistered stand-in, and a poll of 0 people shows no reason                                                                             | `src/core2/modules/campaigns.ts`, `commissionPoll`                                                  | Measured: Jared's poll                                                                      |
| 20  | Registered stopgaps                           | Asking or offering a deal adds a literal 0.05 to the tie, with no parameter row                                                                              | `src/core2/modules/legislature.ts`, `learnStake` and `offerDeal`                                    | Read in code                                                                                |
| 21  | Registered stopgaps                           | The 14-day wait before a vote is an unregistered stand-in; the meeting-interval research has no reader                                                       | `src/core2/modules/legislature.ts`, `scheduleVote`                                                  | Measured: vote on December 3, 2026                                                          |
| 22  | No hand-written player text                   | The law's effect is an English sentence in a data file, shown verbatim                                                                                       | `src/core2/data/laws/policy-effects.json`                                                           | Measured: "may not be refused housing or work for a protected trait"                        |
| 23  | Screens show record data                      | The news sheet lists every public record in the world, as raw kind names and raw totals                                                                      | `src/bench/server.ts`, the news route; `src/bench/play.mjs`, news sheet                             | Measured: 1,594 news records by December 2026                                               |
| 24  | The director tells it                         | An election result, a bill vote and any law but a minimum wage get no journal line or scene                                                                  | `src/director/data/journal.json`                                                                    | Measured: no journal line for Jared's loss                                                  |
| 25  | The director tells it                         | Nobody can bring up a law; the only change people mention is a business closing                                                                              | `src/director/bring-it-up.ts`, `changesKnownTo`; `src/director/data/bring-it-up.json`               | Measured: eight conversations after `2026-038`                                              |
| 26  | The director tells it                         | Turning 18 produces nothing, and talking to someone new never counts as meeting them                                                                         | `src/bench/calendar.ts`; `src/bench/server.ts`, the talk route                                      | Measured: January 22, 2025                                                                  |
| 27  | Time controls work                            | Before the first Day press, and right after switching characters, the calendar offers tomorrow and the clock refuses it: "A calendar jump can't go backward" | `src/bench/player.ts`, `advance`; `src/bench/play.mjs`, calendar sheet                              | Read in code                                                                                |

## What came back clean

- **Filing rules come from the place's data.** Age, residency, voter registration and deadline each carry their Alabama citation, with no fee or petition, as you ruled. Read in code at `src/core2/modules/elections.ts`, `checkEligibility`; measured in the filing.
- **The filing visit is told.** The clerk speaks lines from the director, and filing writes a journal line. Measured; the lines come from `src/director/filing-visit.ts`.
- **Campaign answers come from causes.** Each door, volunteer, endorsement and donation answer is a named person deciding from traits, ties and views, with no dice. Measured; read in code at `src/core2/modules/campaigns.ts`.
- **State law blocks what it should.** Alabama's 2016 preemption blocked the local minimum wage, with the law cited. Measured.
- **No mayor's signature, correctly.** Alabama's data allows a mayor's veto only in cities over 12,000, so the ordinance went straight to law. Read in code at `src/core2/modules/legislature.ts`, `executiveAction`.
- **The council vote follows each member's own score.** Each score is split into recorded parts. The law took effect 30 days after the vote. Measured.
- **The next election reads the record.** A voter weighing an incumbent reads that person's recorded votes and compares their campaign promises with later votes on the same question. Read in code at `src/core2/record.ts`, which the vote tally reads.
- **Dates and names hold.** November 3, 2026, is the right election day. No state or town is named in the logic traced. Measured and read in code.

## What could not be reached or confirmed

- **Steps 6 to 11 as the player's own character.** He lost, and there is no path for a loser.
- **Step 10 at all.** There is no route from a law into conversation.
- **Step 11 in play.** The run stopped on January 3, 2027.
- **Alabama's town election years.** The data puts Aliceville's council elections in 2028, every four years in years divisible by four. It calls its own source "secondary synthesis only." The seats' estimated end date is January 1, 2029. Whether Alabama towns voted in August 2025 needs a check against the statute.
- **Two officials in one household.** Jared's mother held the circuit clerk's seat in January 2025 and won it again on November 3, 2026. His father has held a council seat since the opening. Whether that is plausible for a town this size was not checked.
- **Lies.** No lie was offered, because his sister already knew the truth. The filing form accepts any party on its list, whatever the player's ties. Read in code at `src/core2/modules/elections.ts`, `fileCandidacy`.

## Owner decisions needed

None of these is already ruled in the owner decisions file.

1. **What can a player who loses do next?** Today they can only wait for the next election. Should they be able to ask a council member to carry a bill, or speak at a meeting?
2. **Does the player cast their own ballot?** Today the engine casts it, and a candidate can vote for a rival.
3. **May a yes-or-no vote flip at zero?** "Nothing flips at a threshold" meets a vote that must be yes or no. The engine uses "score above zero." Should a deal offered to someone already in favor count as accepted?
4. **May a player file under a party they have no tie to?** Today any party on the list is accepted.
5. **Should a mayor or governor propose, or only sign and veto?** Today they can do neither on the play page.
6. **Should Alabama county races have primaries?** The data has the date, but contests skip it.

## What happens next

All 27 defects are open; this audit changed no game code. They fall to the session that owns each area, through the CTO:

- **OPUS-PLAY (the bench and play screens):** defects 1, 2, 3, 8, 9, 10, 23 and 27.
- **OPUS-GOV (elections, campaigns, legislatures, laws):** defects 4, 5, 6, 7, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 and 21, plus the check of Alabama's town election years against the statute.
- **OPUS-PEOPLE (director and English engine):** defects 22, 24, 25 and 26.

## Method

- **Run.** The bench server on the main branch as of October 14, 2026, in Aliceville, Alabama, seed `audit-1791951990654`, drawn from the clock across all 56 places. A Shiloh, Georgia world (seed audit-1791951901523) supplied defect 12.
- **Play.** Every request went to the bench's API, as the play page sends it. Time moved only by Day and Calendar; every stop was answered and the first offered choice taken. The full log is in `requests.tsv` beside this file. 199 refused calendar requests in it came from the script retrying a stale date.
- **Checking.** Ten Haiku agents traced one step each. One Sonnet agent checked every claim against the code and corrected three. I checked three claims myself against the code: the panel ignores the player (defect 1), single-seat offices get no seat controls (defect 4), and the calendar refusal (defect 27).

| Model  | Role                          | Agents | Tokens                     | Time                                  |
| ------ | ----------------------------- | ------ | -------------------------- | ------------------------------------- |
| Opus   | Plan, play, spot-check, write | 1      | not visible in the session | 25 minutes                            |
| Haiku  | One step each                 | 10     | 1,402,978                  | 28 minutes in total, run side by side |
| Sonnet | Check every claim             | 1      | 190,879                    | 9 minutes                             |

The bench run took 7.3 minutes of request time for 592 requests, including two world builds of 53 and 59 seconds.
