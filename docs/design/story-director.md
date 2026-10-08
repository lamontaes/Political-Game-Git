# Story director: how a life becomes a story

The owner approved this design on October 8, 2026, with six answers, recorded below and relayed in the CTO's log. The design turns records that change a life into scored moments. Moments between two people become threads. Threads and strong moments become playable scenes and journal chapters, and old moments come back years later. No scene, event or line is written by hand. 32 reusable situation types supply structure only, the world's records fill every role, and the English engine voices every line. Building starts with step 1, moments; the authored childhood bank is deleted as soon as caused scenes can replace it.

## The owner's answers

The CTO relayed these at 4:24 p.m. on October 8, 2026.

1. **Salience weights from the Holmes and Rahe scale: approved.** The adult scale and the non-adult version printed with it, divided by 100, each weight labeled as an estimate with its source.
2. **Seven new speech acts: approved.** Comfort, blame, promise, thank, confess, farewell and recall join the owner's list. The nearest existing acts would have misnamed each move: blame spoken as complain, promise as offer, farewell as greet.
3. **Delete the authored childhood bank in the first pull request that can.** The 19 formative situations (`character-history.ts:2378`, keys at `types.ts:5801`) carry their own prose, option labels and memory sentences, and are offered by age band (`character-history.ts:2976`). The owner has asked for this repeatedly. The first pull request that can is build step 5, the first after which childhood play has caused scenes to show instead.
4. **War waits on its own design with the owner.** P6 does not build war or deployment. The departure, letter, gathering-with-someone-missing and return types stay ready for it (part 3).
5. **Threads are hidden from players and visible in developer and observer mode.** There, a person's record shows their threads, importance, turns and recent moments (build step 2).
6. **Build a "becoming friends" type,** so the owner can see what it looks like (part 3).

The owner also asked that every scene binding carry what the presentation layer needs to stage it; part 4 lists the fields, offered to P4 for agreement.

## Lives used for the examples

All three were built through the ordinary new-game path in a place drawn from all 56 by a hash of the seed, then advanced exactly seven simulated days. The setup named only the seed and the start age; every name, place and family member was generated. Each world records the same-street neighbors as minor contacts: 12 in Acorn, 10 in Abbeville and 12 in Aberdeen Gardens.

| Seed       | Place                        | World                  | Person         | Age | Simulated span        |
| ---------- | ---------------------------- | ---------------------- | -------------- | --- | --------------------- |
| p6-story-a | Acorn, Arkansas              | world_131563f2268972b2 | Quinn Vazquez  | 10  | January 5 to 12, 2026 |
| p6-story-b | Abbeville, Louisiana         | world_32da41f0fdba23a5 | Colin Medina   | 6   | January 5 to 12, 2026 |
| p6-story-c | Aberdeen Gardens, Washington | world_c0a6f1ee04bb0638 | Mateo McKenzie | 34  | January 5 to 12, 2026 |

What the records hold, measured:

- **Quinn (Acorn).** Mother Megan Vazquez, 36, and father Stephen Akhtar, 45. Quinn has been enrolled at Acorn Elementary School since August 24, 2020, and that school stage is scheduled to end on May 29, 2026. Twelve adults on the same street are recorded as minor neighborhood contacts. In the first week, the town wrote 12 events and 15 friendships between adults; none of them named Quinn. One was the mother's new friendship with Joshua Richard, 34.
- **Colin (Abbeville).** Parents Richard Medina, 34, and Natalie Moran, 40. In the first week, the town wrote 18 events and 18 relationship records, and none named Colin.
- **Mateo (Aberdeen Gardens).** Parents Sarah McKenzie, 67, and Joel McKenzie, 71; twin siblings Audrey and Amos, 36; four grandparents aged 95 to 99. Mateo's generated earlier life holds six dated events, all on Mateo's birthday, May 12. A household move came at 6, a lunch-table moment with Wyatt Murray at 10, and a teacher, Ivan Harmon, at 12. Volunteering followed at 15, a first job at 16 and preparing for what came next at 17. In the first week, the town wrote 29 events, and 3 named Mateo. Wyatt Murray, a schoolmate with no contact on record for years, introduced Mateo to Rafael Butler, 35. Mateo's sister Audrey asked by phone to meet on January 21 to catch up. The third was the scene binding the existing code wrote for Audrey's request.

## What the director builds on

The director adds a scoring layer and one scene runner. Everything else is reused. Each row was read from the code at the location given.

| Existing system                                                       | What it already does                                                                    | What the director adds                                                         |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Relationship standing (`relationship-standing.ts:353`)                | Reads warmth, trust, respect, commitment and tension from every recorded interaction    | Nothing new on the five lines; threads read them                               |
| Relationship absence (`relationship-absence.ts:433`)                  | A sliding fading measure from 0 to 1, with recorded reasons for time apart              | Fading drives when a thread fades                                              |
| Narrative threads (`narrative-threads.ts:203`)                        | Groups records by a shared person, organization or record                               | Importance, turns and an index, so a thread is not rebuilt by scanning history |
| Episode casting (`life-episodes.ts:355`)                              | Casts roles from records and lists causal inputs                                        | The casting rules, reused by situation types without authored stage lines      |
| Contextual scenes (`contextual-scenes.ts:360`)                        | One conversation engine; a producer writes a scene binding and the scene reads it back  | One new family, `situation`, whose every line comes from the English engine    |
| Decisions and trait act pulls (`decisions.ts:84`, `act-pulls.ts:164`) | Every choice by a person is weighed from recorded reasons; traits pull toward act kinds | Moves labeled with act kinds, so every trait shapes every situation            |
| Life callbacks (`life-callbacks.ts:353`)                              | A choice can come back later, if the other person decides to raise it                   | Shared history handed to scenes; resurfacing of dormant threads                |
| English engine (`english-composition.ts:223`) and owner grades        | Composes a line from part banks and a fact packet; graded parts are held back           | Fact packets for situations and chapters; P3 owns the banks                    |
| Childhood agency (`childhood.ts:90`)                                  | Caregiver-led, shared and own choices by age                                            | Kept as is; it decides who chooses in a caused scene                           |

## Part 1. Salience: what makes a moment matter

**The rule.** A moment is a record, newly written, that changes something in a person's life. A record scores for each person it names, each with their own salience between 0 and 1. It reaches a named person's relatives and household only through a scale row that names that relation, such as the death of a parent, a sibling born or a parent losing a job. A parent's new friendship has no such row, so it scores for the two friends and not for their child. Most records score zero: setup records, minor contacts, paydays and other people's errands. A moment scores above zero only if its kind appears in the moment-kind table, `data/content/story-moment-kinds.json`. Three kinds of record can make a moment: events, relationship interactions, and state records with a start date, such as an enrollment, a job or a group membership. The world's start date is the cutoff. A state record that begins before it is a past change and counts at its own date. One that begins on it describes the life when play starts, and scores zero, as bookkeeping records do (the world's creation, precinct maps). One change makes one moment: where an event and a state record describe the same change, the event carries the score. Moments above zero are stored once, in a new append-only history store, `storyMoments`, with each factor and the records it came from.

Salience is the product of five factors, capped at 1:

1. **Kind.** The base weight from the table. Life changes use the Holmes and Rahe value divided by 100. Under 18 the non-adult version applies; where it has no row (starting school, moving, joining a group, a first job), the adult row is used and labeled so. Relationship moments short of a death, such as a new friend or a quarrel, have no row of their own. The design caps them at the scale's row for friction between people, "more frequent disputes" (35), so no such moment outweighs a life change like a death. The cap is part of the design the owner approved. Within the cap, the standing reader's weights apply (`relationship-standing.ts:125` and `:134`). Significance counts meaningful 2 and major 3; the change counts formed or strengthened 2, maintained 1, strained 2 and ended 3. Minor counts 0 here, not 1. The base is significance times change, divided by 9, times 0.35. A meaningful friendship formed scores 2 × 2 ÷ 9 × 0.35 = 0.156. Minor contact scores zero, as it does in the journal today (`journal-significance.ts:4`).
2. **Closeness.** A multiplier from 0.5 to 1.5. It is 1.00 in three cases: a change in the person's own life (a move, a first job), a scale row that names the relation (death of a parent, family gatherings), and a relationship moment, whose significance already carries it. For a moment that names another person whose tie the row does not carry, such as a reach-out from someone who is not family, closeness slides from 0.5 with no standing to 1.5 at strong warmth or commitment, read from the five-line standing.
3. **First of its kind.** The first moment of a kind in a life is raised 1.5 times, labeled as calibration. Kinds are specific: a first school friendship and a first mentor are different kinds, so each counts as a first.
4. **The person's traits.** Each moment kind carries the act kinds it embodies: a reach-out is engage, a quarrel is confront, a move is change. A recorded trait whose pole pulls toward those act kinds raises the moment, by up to a quarter at full strength. A trait whose pole pulls away lowers it by the same amount. This reads the trait act table and adds no second trait system. An unrecorded trait changes nothing; it is never a default.
5. **Stakes.** A multiplier from 1.0 to 1.5, read from the record that carries it. Days of freedom lost add half the share of a year lost, up to a full year; money lost adds half its share of the household's recorded yearly income, up to all of it. A moment with nothing at stake keeps 1.00.

**What the scale is for.** Real data checks the totals and never picks an outcome. Salience decides nothing any person does. It decides which moments the story shows, and how prominently.

**Worked example (Mateo, Aberdeen Gardens).** 34 records named Mateo, and 23 scored zero. They were 12 minor neighborhood contacts, 2 setup records, the 2 household memberships, the current job (begun the day the world starts) and the scene binding for Audrey's request. The other 5 were records whose change another record carries: the lunch-table, teacher and introduction events (scored through their relationship records), the teen job and the volunteer group (scored through their events). The eleven that scored:

| Date             | Age | Moment                                        | Scale row or weight                                            | First | Salience |
| ---------------- | --- | --------------------------------------------- | -------------------------------------------------------------- | ----- | -------- |
| May 12, 1996     | 5   | Started elementary school                     | Starting or finishing school, 26 (adult row; no non-adult row) | yes   | 0.390    |
| May 12, 1997     | 6   | Household move; the record names Sarah        | Change in residence, 20 (adult row; no non-adult row)          | yes   | 0.300    |
| May 12, 2001     | 10  | Made room at the lunch table for Wyatt Murray | Relationship, meaningful, formed: 0.156                        | yes   | 0.233    |
| May 12, 2002     | 11  | Started middle school                         | Starting or finishing school, 26 (adult row; no non-adult row) | no    | 0.260    |
| May 12, 2003     | 12  | A teacher, Ivan Harmon, took an interest      | Relationship, meaningful, formed: 0.156                        | yes   | 0.233    |
| May 12, 2005     | 14  | Started high school                           | Starting or finishing school, 26 (adult row; no non-adult row) | no    | 0.260    |
| May 12, 2006     | 15  | Joined a volunteer effort                     | Change in social activities, 18 (adult row)                    | yes   | 0.270    |
| May 12, 2007     | 16  | First job                                     | Change in work hours or conditions, 20 (adult row)             | yes   | 0.300    |
| May 12, 2008     | 17  | Prepared for the next step                    | Entering senior year, 42 (non-adult row)                       | yes   | 0.630    |
| January 12, 2026 | 34  | Sister Audrey asked by phone to meet          | Change in number of family gatherings, 15                      | yes   | 0.225    |
| January 12, 2026 | 34  | Met Rafael Butler through Wyatt               | Relationship, meaningful, maintained: 0.078 (see below)        | yes   | 0.117    |

Each salience is the base, times 1.5 for a first. The record at 17 is the generator's step of preparing for further education, training, work or service, dated at the age of a senior year; the nearest non-adult row is entering senior year (42). That one generated record outweighs every other moment in Mateo's life, a consequence of the fixed backstory listed under missing links. An introduction is written as maintained contact, not as a friendship formed, and by design it moves none of the five lines (`social-introductions.ts:51`). It takes the maintained weight, and Rafael's standing reads none. Closeness was 1.00 in every row under factor 2's three cases: the relationship rows carry it through their significance, the reach-out through its family row, and the rest are changes in Mateo's own life. Stakes were 1.00 because no scored record carried money or freedom at stake. No trait is on record for Mateo, so the trait factor was 1.00 in every row.

In the two children's lives, one past record each scored: Quinn started at Acorn Elementary School on August 24, 2020, and Colin started school on August 26, 2024, both at 5 (0.390). The other 16 records naming Quinn and 14 naming Colin are setup records, household memberships and minor neighborhood contacts, and scored zero. Nothing in either child's first week scored. Most days score zero, as the brief requires.

## Part 2. Threads: the people in a life

**The record.** A thread is one person's view of one other person. Most of it is read from records that already exist. Only importance and its turns are stored, because summing every past moment each time would be slow.

| Field               | Where it comes from                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Who, and since when | The first moment or tie between the two (kinship, household, first recorded interaction)                                             |
| Strength            | Importance: the sum of the pair's moment salience, discounted by fading, plus a standing tie for kin and household                   |
| Tone                | The five-line standing, read as of the date                                                                                          |
| Open questions      | Read from records: tension not yet settled, a promise owed (undertakings), someone away with a recorded reason, a request unanswered |
| Last contact        | The absence reader's last meaningful contact                                                                                         |
| Turn                | Started, grew, soured, turned, faded, renewed or closed, written when it happens                                                     |

A new history store, `storyThreadStates`, holds one append-only row per change: the pair, the date, the importance after the change, the moment that caused it, and the turn. It is written only on a day a moment touches the pair, or when a scheduled fade check comes due.

**How a thread moves.** A thread starts with the first moment or tie. It grows when a moment raises warmth or commitment and sours when one raises tension. It turns when the sign of the standing changes, such as a friend becoming an adversary. It fades as the absence reader's fading measure rises; the fade check is a due item at the date the pair would reach dormancy at their own rhythm, so no daily scan looks for it. It is renewed when contact resumes after dormancy, and closed by a death or by an ended relationship.

**Who matters.** There is no cap. Importance ranks the people in a life; a handful rise and the rest fade. Starting standing ties, labeled calibration: a parent or child 0.5, a sibling 0.35, a grandparent 0.2, a shared home 0.3. Fading discounts moments by up to three quarters.

**Worked example (Mateo).** Importance after the first week:

| Person                  | Tie         | Five-line standing            | Moments | Fading | Importance |
| ----------------------- | ----------- | ----------------------------- | ------- | ------ | ---------- |
| Sarah McKenzie, mother  | parent      | none on every line            | 0.300   | 0.00   | 0.800      |
| Audrey McKenzie, sister | sibling     | none on every line            | 0.225   | 0.00   | 0.575      |
| Joel McKenzie, father   | parent      | none on every line            | 0       | 0.00   | 0.500      |
| Amos McKenzie, brother  | sibling     | none on every line            | 0       | 0.00   | 0.350      |
| Four grandparents       | grandparent | none on every line            | 0       | 0.00   | 0.200 each |
| Rafael Butler           | none        | none on every line            | 0.117   | 0.00   | 0.117      |
| Wyatt Murray            | none        | warmth marked                 | 0.233   | 1.00   | 0.058      |
| Ivan Harmon             | none        | respect and commitment marked | 0.233   | 1.00   | 0.058      |

Fading measures time since the pair's last recorded contact. Mateo and the relatives have none on record, so the reader returns 0 and calls them current (`relationship-absence.ts:477`). Wyatt's and Ivan's last contacts were in 2001 and 2003. Eleven people carry any importance. Four stand above 0.2, and the four grandparents sit at 0.2 on the standing tie alone. Wyatt and Ivan are faded threads with real history behind them, and part 5 shows how one of them comes back.

The move at 6 adds 0.300 to Sarah's thread only, because the record names only Sarah; Joel and the twins, then 8, are not on it. The standing column shows a gap. Every relative reads none on all five lines. Measured in all three lives: no recorded interaction links the player to any relative, so generated families start without one. The gap costs tone, not importance. Importance comes from moments and the standing tie, but a thread's tone reads the five lines, so every family thread reads neutral until play records interactions between relatives.

## Part 3. Situation types: the library

**The rule.** A situation type is structure only. It names roles, what each role wants, the moves available, and what changes afterward. It holds no sentence. The world's records fill the roles; the English engine voices every line from a fact packet. One type serves every event of its kind. A departure covers a soldier leaving, a friend moving away and a sibling going to prison, because the roles and the record differ and the structure does not.

**The data.** `data/content/situation-types.json` holds the types and `data/content/story-moves.json` holds the move kinds. Each move names one speech act and one to three act kinds from the 20 in `act-kinds.json`.

| Field       | Meaning                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`       | The type, such as `departure`                                                                                                                  |
| `roles`     | Each role and the record rule that can fill it: household member, kin, the person who left, the bearer of news, a classmate at the same school |
| `wants`     | What each role wants, written as goal keys and act kinds, so a decision can weigh them                                                         |
| `moves`     | Move kinds open to each role                                                                                                                   |
| `aftermath` | By move: the relationship interaction written (kind, change, significance), any undertaking, any callback kind, the thread effect              |
| `setting`   | Where it can happen, as record rules: the household's home, the school enrolled at, the workplace, the other person's home, by phone or letter |
| `timing`    | When: at the cause, on the record's effective date, or at the next time both are in one place                                                  |
| `causes`    | The moment kinds that open it, with how each role is bound from the causing record                                                             |

**Move kinds.** Twenty: comfort, blame, promise, refuse, lie, apologize, confess, thank, ask, tell, request, offer, agree, decline, deflect, stay silent, leave, confront, farewell and recall. Comfort carries the act kinds help-others and engage; blame carries confront and speak-out. Seven moves use the new speech acts approved in answer 2.

**The dialogue rules hold in every scene.** Every role always has ask, stay silent and leave, plus at least one move from the type, so four replies are always available. A Lie variant is offered beside a reply only where the player's record establishes the opposite of what the words say. That rule already exists for contextual scenes (`contextual-scenes.ts:51`, `lie-marker.ts:40`). Portraits and the dialogue box belong to P4. A non-player role chooses its move through the ordinary decision path. The options are its moves, and their act kinds let every recorded trait weigh in. The role's wants and its standing toward the others add reasons. Nothing is drawn by chance.

**The first library, 32 types.**

| Type                           | Roles                                            | Opened by                                                                            |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Departure                      | the one leaving, the one staying, others present | a household member leaving, a friend moving away, a sentence beginning, a deployment |
| Return                         | the one returning, the one waiting               | an away reason ending: release, homecoming, moving back                              |
| News arrives                   | bearer, receiver, the person it is about         | a death learned, a diagnosis, a job lost, an arrest, an acceptance, a result         |
| Letter                         | writer (away), reader                            | contact from someone whose absence has a recorded reason                             |
| Argument                       | two sides, a witness                             | a strained interaction, a dispute over money, rules or belief                        |
| Apology                        | the one apologizing, the one wronged             | open tension, when the one at fault decides to concede                               |
| Confession                     | the one telling, the one told                    | a private record one holds that the other does not know                              |
| Favor asked                    | asker, asked                                     | a favor request (the existing favor records)                                         |
| Reach-out                      | the one asking, the one asked                    | a meeting proposed, a check-in                                                       |
| Becoming friends               | two people                                       | a friendship formed after repeated contact (answer 6)                                |
| Celebration                    | honoree, host, guests                            | a birthday, graduation, wedding, birth, election win, new job                        |
| Gathering with someone missing | the household, the absent one                    | a gathering date while a member is away or has died                                  |
| Funeral                        | mourners, family, the deceased (absent)          | a death of someone with threads                                                      |
| First meeting                  | newcomer, the person met, introducer             | an introduction, a first day somewhere new, a new neighbor                           |
| First day                      | newcomer, teacher or supervisor, peers           | an enrollment or a job beginning                                                     |
| Last day                       | the one leaving, those staying                   | an enrollment ending, retirement, quitting                                           |
| Interview                      | interviewer, candidate                           | a job application, a press interview, an admission                                   |
| Date                           | two people                                       | starting to date, an invitation                                                      |
| Proposal                       | two partners                                     | a couple's next-stage decision                                                       |
| Breakup                        | two partners, children as witnesses              | a couple ending, parents separating                                                  |
| Reunion                        | two people with a faded thread                   | contact after dormancy                                                               |
| Betrayal                       | the one betrayed, the betrayer                   | a broken undertaking, a lie found out, a secret told                                 |
| Rescue                         | rescuer, the one in danger, bystanders           | an incident or an acute health episode with someone present                          |
| Visit                          | visitor, the one who cannot come                 | a serious illness, a jail term, a nursing home                                       |
| Arrival                        | the household, the newcomer                      | a birth, a stepparent, a housemate moving in                                         |
| Care                           | caregiver, the person cared for                  | a care responsibility beginning                                                      |
| Advice                         | adviser, the one deciding                        | a mentoring tie with a decision ahead, such as a school stage ending                 |
| Accusation                     | accuser, accused, witnesses                      | an incident at school or work, a suspicion recorded                                  |
| Warning                        | the one warning, the one at risk                 | arrears, an eviction notice, a conflict escalating                                   |
| Reconciliation                 | two people with settled tension                  | help or care after a quarrel                                                         |
| Asking permission              | the one asking, the one with authority           | a choice that needs a guardian or a supervisor                                       |
| Election night                 | candidate, supporters, rivals                    | an election result (coordinated with the b03 election-night rows)                    |

The becoming-friends type is opened by a friendship formed between two people; it plays the next time both are in one place, as the visit, meal or outing where the friendship shows. Gathering dates are birthdays, which are on record, and holidays. The simulation holds no holiday calendar, so holiday gatherings wait on one (missing links).

**How world events map onto types.**

| World event                         | Types it opens                                                                                                                                    | Record today                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| War takes a father from age 5 to 14 | Departure on the day he leaves; letters while he is away; gatherings with someone missing on each birthday and holiday; return when he comes home | **Not in the world.** No war or deployment producer exists; designed separately (answer 4) |
| Layoff                              | News arrives (the parent tells the household); argument over money; favor asked of kin                                                            | A job ending with the reason laid off or business closed                                   |
| Illness                             | News arrives; visit; care; funeral if it ends in death                                                                                            | Crisis health episodes; deaths and death notices                                           |
| Move                                | Departure from the old place; first day at the new school; first meeting with new neighbors                                                       | Migration moves and household moves                                                        |
| Election                            | Election night; celebration or news arrives                                                                                                       | Election results                                                                           |
| Arrest                              | News arrives; visit while held; departure when sentenced; return on release                                                                       | Arrests, charges, holds and sentences                                                      |
| Death                               | News arrives; funeral; gathering with someone missing                                                                                             | Deaths and death notices                                                                   |
| Birth of a sibling                  | Arrival; celebration                                                                                                                              | Family births and sibling kinship                                                          |

The funeral type is opened by the death record itself, so it needs no separate funeral event.

**Worked example (Mateo's sister).** Today, Audrey's request to catch up is bound to the authored favor family, set "By phone". Its opening line is chosen from two written sentences, and one says "It's been a long time." The record holds no contact between them at all, so that line asserts what the world did not say. Under the director, the same record opens the reach-out type. Audrey fills the asking role from the meeting proposal, and Mateo fills the asked role. The setting is the phone call on January 12, from the proposal's location, and the meeting it asks for is January 21. The packet carries sibling, last contact none on record, and asked to catch up. The request is a proposal, not an interaction, so it is not contact yet; Mateo's answer in the scene writes the interaction. The engine can then say only what those facts support. Mateo's replies are agree, decline, ask for another day, ask what it is about, stay silent and leave. Lie appears only where Mateo's record contradicts the words.

## Part 4. Scheduling: scene, journal line or nothing

**The rule.** Every moment above zero is journal material. A moment becomes a playable scene when three things hold.

1. **A type and its roles bind.** The moment maps to a type, and every required role is filled from records. Otherwise it goes to the coverage log (part 7).
2. **The player is there.** The player is a participant, or the type brings the news to them (news arrives, letter). A moment in someone else's life stays a journal line unless it reaches the player.
3. **It ranks within the life's pace.** Each age band has a pace: about how many scenes a year the life carries. A moment becomes a scene when it ranks within that many of the life's moments over the trailing year, itself included. In a quiet year a modest moment ranks. In a year a parent goes to war, a schoolyard quarrel does not, and it stays in the journal. Starting paces, labeled calibration and owner-adjustable, use the same bands as childhood agency and the journal: about 1 a year up to 7, 2 from 8 to 12, 3 from 13 to 17, and 4 for an adult.

**When.** The type's timing. At the cause, the scene opens the first time the player has control after the record is written, dated to it. On the record's date, a departure plays on the day of leaving. At the next meeting, an apology plays the next time both people are in one place.

**Where, and who is present.** A real place from the records: the household's home, the school the child is enrolled at, the workplace, the other person's home, or by phone or letter. Present people are those the records place there at that time: household members at home in the evening, classmates enrolled at the same school. They are written into the scene binding, so the scene poses the real people actually there.

**What a scene binding carries for staging.** The owner asked that the binding hold what the presentation layer needs, so a scene can be drawn without inventing anything. The field list, offered to P4 for agreement:

| Field                               | Source                                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Place                               | The real setting resolved from the records, used for the backdrop                                                                                   |
| Present people                      | Everyone the records place there at that time, used for staging spots                                                                               |
| Per person: situation type and role | The type that opened the scene and the role the person fills                                                                                        |
| Per person: move or act kind        | The move chosen, or before a choice, the act kinds the role's wants lean toward                                                                     |
| Per person: mood                    | Read from data: each type and role names a bearing (solemn at a funeral, braced in an argument), shifted by the person's standing toward the others |

Mood is a data row per type and role, not a sentence. The English engine's mood condition reads the same key, so lines and poses agree.

**Who decides.** Childhood agency is reused unchanged. Under 8 the caregiver's move is decided through the ordinary decision path and the child watches. From 8 to 12 the choice is shared, and from 13 it is the young person's own.

**Competing scenes.** When two scenes want the same evening, the existing situation selector (`situation-selection.ts:246`) ranks them, with salience as relevance. The childhood path today passes every situation a fixed relevance of 0.5 (`formative-play.ts:199`).

**The world sets the pace too.** Other people start situations from their own decisions: Audrey reaching out, a friend apologizing, a parent telling the household about a layoff. The director never starts one for them. It notices the record their decision wrote and schedules the scene.

**Worked example (Quinn, Acorn).** In the first week nothing named Quinn, so the director stages nothing. The childhood bank, by contrast, offered Quinn a "friend conflict" with Zachary Perkins, 12, enrolled at the same school. The record holds no tie between them: no interaction, no kinship, only the same school. That scene was offered by age band, not caused. Under the director, Quinn's next caused moment is already on the calendar. The elementary school stage ends on May 29, 2026, which opens a last-day scene at Acorn Elementary School with the classmates enrolled there. It opens an advice scene as well only if a mentoring tie is on record by then.

**Worked example (Mateo).** Mateo's two first-week moments are Audrey's reach-out (0.225) and the introduction to Rafael (0.117). At an adult pace of 4 scenes a year, both rank, because they are the only moments in Mateo's trailing year. The reach-out scene is Audrey's phone call on January 12. The introduction is already a record dated January 12, and the event names Wyatt Murray as the introducer. Its scene plays the conversation at that meeting with all three present. Both also reach the journal.

## Part 5. Memory and callbacks: old moments come back

**Shared history in every scene.** When a scene binds two people, the director attaches their strongest earlier moments, up to three by salience, from the store's index by pair. Each carries its kind, both ages then, the place then, how long ago, and its source records. The recall move lets either side bring one up. A non-player decides whether to, through the ordinary decision path, the way the existing callback decides whether to raise an earlier matter (`life-callbacks.ts:598`). The engine voices only what the facts carry.

**Old threads resurface in three ways.**

1. **Contact after dormancy.** When a new moment touches a faded thread, the moment's salience adds the thread's importance from before it faded. A faded thread with real history becomes a reunion; a faded acquaintance with none stays small.
2. **A role change.** When someone with a thread to the player takes office, wins, is arrested or dies, everyone with a thread to that person gets a moment. Its salience scales with their old importance and the event's weight. The thread index is keyed by the other person, so this needs no scan.
3. **Choices coming due.** The existing life callbacks still bring back a promise or a grievance. The director adds the shared history to that scene. The callback's hand-written return sentences move to the English engine in a follow-on.

**Worked example (Mateo and Wyatt).** In the first week, the world brought Wyatt back on its own: Wyatt introduced Mateo to Rafael Butler. Wyatt's thread is faded (fading 1.00) and holds the lunch-table moment from age 10 (0.233). Under rule 1, the introduction is contact after dormancy for Wyatt's thread too. It would score 0.117 plus 0.233, or 0.350, and renew the thread as a reunion, with the lunch table available to recall. Today it cannot. The event names Wyatt, but the contact record is written for Mateo and Rafael only, so Wyatt's thread sees no contact and stays dormant. Rule 1 applies once the introduction also writes contact with the introducer (missing links).

**Worked example (the owner's model).** Suppose Wyatt Murray becomes Mateo's running mate 20 years from now. On the day that office record is written, Mateo's thread to Wyatt gets a role-change moment. The chapter for Mateo's years 8 to 12 re-ranks, because chapters read importance as it stands now (part 6). The lunch table at age 10 comes back into the telling, with the facts the engine needs: the school, both ages, and what Wyatt became. Quinn's case shows the limit. Quinn and Zachary Perkins share a school, but no record ties them, so a later office for Zachary would reach Quinn's journal only if a first meeting is ever recorded.

## Part 6. The journal: chapters that tell a life

**The rule.** A chapter is a stretch of years in one town. A change of town starts a new chapter, and so does a loss that ranks within the pace. Inside one town, an age band change (0 to 7, 8 to 12, 13 to 17, adult) starts a new chapter only when both stretches hold moments above zero; quiet stretches merge. That is how "my first 12 years" reads as one chapter. The existing chapter grouper already breaks at moves, losses and offices (`journal-chapters.ts:51`).

The journal is a pure projection, computed when it is opened. It reads the stored moments and thread states, so it costs nothing on ordinary days. It ranks people by importance as it stands now. A friend met at five who becomes vice president 50 years later rises in the chapter about age five.

**The packet the director hands the English engine** (P3 owns the wording and the banks):

| Fact                               | Example source                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Place and years                    | Residence records and household moves                                                                                                                                                    |
| Ages at start and end              | Birth date                                                                                                                                                                               |
| Quiet or eventful                  | The period's ranked moments against its pace (about one a year to age 7, two from 8 to 12); fewer than the pace allows is reported as quiet, so the engine may say nothing much happened |
| People met who matter now          | Threads opened in the period, ranked by current importance, with how they met and what they are now                                                                                      |
| Losses, arrivals and moves         | Moments of those kinds that ranked                                                                                                                                                       |
| The strongest moments              | Up to three per chapter, by salience                                                                                                                                                     |
| Causes between moments             | The cause a record names for itself: a move's recorded reason, a job's ending reason, a death that started a move                                                                        |
| People by relationship             | Each person named first by what they are to the narrator (mother, best friend, teacher), then by name                                                                                    |
| Feeling                            | The person's recorded memories and appraisals of the moment, and the traits that tilted its salience                                                                                     |
| Turning points and quiet stretches | Moments that ranked within the pace, and the stretches between them with nothing above zero                                                                                              |

**Worked example (Quinn).** Under this rule, Quinn's journal is one chapter: Acorn, from birth to 10. Its one moment is starting at Acorn Elementary School at 5 (0.390); the band change at 8 does not split it, because ages 8 to 10 hold nothing. From birth to Quinn's age today, 10 years and 10 months, the pace allows about 14 scenes (8 years at one a year and nearly 3 at two), and the chapter holds one moment, so the packet reports the period as quiet and names the parents. It names no friend, because none is on record.

**Worked example (Mateo).** Mateo's childhood in Aberdeen Gardens splits into three chapters, because each band holds moments. Birth to 7 holds starting school at 5 (0.390) and the move at 6 (0.300), which stayed inside the town. Ages 8 to 12 hold the lunch table with Wyatt at 10 (0.233), middle school at 11 (0.260) and Ivan Harmon at 12 (0.233). Ages 13 to 17 hold high school (0.260), volunteering (0.270), the first job (0.300) and preparing for the next step (0.630). No one met in those years ranks above family now: Wyatt and Ivan are faded, so the chapter can say Mateo met someone without dwelling on them. If Wyatt's reunion in part 5 grows into a friendship, the 8-to-12 chapter is told again with Wyatt in it. That is the owner's model, from the grade note on the first English batch: "I was born in West Jordan and lived there my first 12 years. Nothing much happened, but I met someone who became my best friend."

**Coordination with P3.** The owner graded the current journal "just listing facts not a story". For P3's next round, the CTO asked for a narrator looking back, cause and connection, people, feeling, and turning points. The packet's last four rows carry the facts for the last four; the narrator's voice is P3's banks. P6 delivers the packet and its tests; P3 builds the chapter banks from mined real memoir and oral-history speech and grades them with the owner. The journal's first-person rewrite by pattern matching (`journal-first-person.ts:114`) retires when the chapter banks land.

## Part 7. Coverage: finding the missing types

**The rule.** A moment above zero that cannot become a scene or a chapter line for a reason inside the director is logged, never filled in. The store `storyCoverage` holds the moment, the person, the salience and one reason:

- `no-type`: no situation type is opened by this moment kind;
- `role-unbound`: a type matched, but a required role has no record to fill it;
- `no-place`: no real setting could be resolved from the records;
- `english-missing`: the engine returned missing context for a required line.

A developer command, `npm run story:coverage`, totals the log by kind and reason over any save. Watched runs and early-access saves then show which types to build next. Nothing in the log reaches a player.

**Worked example (Acorn, first week).** The town wrote 15 meaningful "friends in the same town" records between adults. Each scores 0.156 for both friends, or 0.233 where it is that person's first friendship on record. 20 of the 30 scores are firsts, because 20 different adults made their first recorded friendship that week (missing links). None mapped to a type in the library as first designed, which had 31 types, because becoming friends over weeks is not one social moment. The coverage log would have recorded 30 `no-type` rows for `contact:friendship formed` (15 records, two people each). That is how the log is meant to work: it showed a missing type, and the owner chose to add one (answer 6).

## Part 8. Speed: acting on the day something changes

**The rule.** The director never scans every person or the whole history on any day.

1. **One intake a day, over that day's records only.** Every history store is appended in sequence order (`history.ts:419`), so the first record written today is found by binary search. The intake classifies those records and scores the people each touches: participants, kin of the subject, household members. These come through the existing indexes by person. Cost follows the number of records written that day.
2. **Scores are stored once.** A moment's salience is written when it happens and never recomputed. Moments at zero write nothing.
3. **Fading is scheduled, not polled.** A fade check is a due item at the date the pair would go dormant at their own rhythm. Any new contact replaces it.
4. **Indexes by person and by pair.** Moments are indexed by person and by pair. Thread states are indexed by subject and by the other person, using the existing history-index helpers.
5. **The journal and the scheduler read, they do not rescan.** The journal is computed when opened, from the indexes. The pace ranking reads only the life's trailing year of stored moments.

**Measured load (first weeks).** In seven days Acorn wrote 12 events and 15 relationship records, Abbeville 18 and 18, and Aberdeen Gardens 29 and 25. Each record was counted with its named people plus their kin and household. A record touched at most 7 people in Acorn, 6 in Abbeville and 16 in Aberdeen Gardens; the medians were 5, 4 and 7. Over the week that is 117, 139 and 382 person-scorings: about 17, 20 and 55 a day.

**The speed budget.** No change may make a game year more than 20% slower than main. The standing check compares three simulated years against main. The CTO's testing rule forbids any run longer than seven simulated days until the speed work posts "SPEED FIXED" in the CTO log. Until then, each foundation pull request compares the same seeded seven-day run before and after, in one exclusive window, and states both rates. Once SPEED FIXED is posted, the three-year comparison applies. The existing narrative-thread reader loops over every relationship record and every event on each call (`narrative-threads.ts:349` and `:932`). The director does not call it on the daily path.

## Build plan after approval

One pull request per step, branches `pool/P6-b<step>`, each with tests over all 56 places through table-driven checks and one seeded seven-day world in a randomly drawn place. Part 8's speed rules and speed comparison apply to every step.

1. **Moments (part 1).** The moment-kind table with sourced weights; the classifier and salience; the moment store and daily intake; tests that most records score zero and the worked rows reproduce.
2. **Threads (part 2).** Thread states, importance, turns, fade due items, both indexes, and the developer and observer view of a person's threads, importance, turns and recent moments (answer 5).
3. **Situation types (part 3).** The 32 types and the move kinds as data; act-kind labels for every role's moves in the decision table; a schema test that every role in every type keeps at least four moves.
4. **The runner (part 3).** The `situation` scene family on the existing conversation engine, with fact packets, Lie variants and aftermath through the existing writers. It holds no sentence.
5. **Scheduling and coverage (parts 4 and 7).** Pace ranking, scene bindings with every staging field in part 4, the coverage log and its command. The childhood path reads caused scenes, and the authored childhood bank and its text are deleted (answer 3).
6. **Memory and callbacks (part 5).** Shared history in scene packets, the recall move, and the three resurfacing rules.
7. **Journal packets (part 6).** The chapter packet and its retroactive ranking, handed to P3.
8. **First proof.** Childhood scenes in one seeded world, with one life's threads and the scenes they produced, and a second life for variety.

## Missing links found

None is fixed in this design pull request. Each names who acts on it.

**Measured in the three lives:**

- **Families start with no history between them.** Mateo's eight relatives read none on all five relationship lines, so the story cannot tell a close sister from a distant one. Who acts: a new pool row for the family generator to write starting relationship history from the household's records; P6 files it.
- **An introducer is not counted as contact.** Wyatt introduced Mateo to Rafael, and the contact record is written for Mateo and Rafael only; Wyatt's fading stayed at 1.00. Who acts: P6 step 1, as a fast fix in the introduction writer.
- **Four living grandparents aged 95 to 99.** Mateo's generated family has all four. Who acts: the same family-generator pool row, checked against real survival rates.
- **A generated classmate 16 months older started school the same day.** Zachary Perkins, born November 20, 2013, and Quinn, born March 16, 2015, both started at Acorn Elementary School on August 24, 2020. Who acts: a new pool row for the classmate generator; P6 files it.
- **The childhood bank names a companion with no tie.** Quinn's offered "friend conflict" names a schoolmate the record never links to Quinn. Who acts: P6 step 5, which deletes the bank (answer 3).
- **A catch-up line claims time apart the record does not hold.** The favor family's opening says "It's been a long time" with no last contact on record (`contextual-scene-families.ts:565`). Who acts: P6 step 4, where the reach-out type replaces it.
- **Generated adults around the player start with no friendships.** In Acorn, 15 friendships between adults formed in the first simulated week, and 20 different adults made their first recorded friendship. Only the player's character gets a generated earlier life (`production-world.ts:922`). Who acts: the same family-generator pool row, seeding earlier friendships for the people around the player.
- **No contact on record reads as current.** Mateo and Audrey have no recorded contact, and the absence reader calls the pair current with no fading (`relationship-absence.ts:477`). Who acts: P6 step 2, where a thread with no recorded contact takes no currency from the absence reader.
- **No player trait is on record at the start.** In all three lives the trait factor was silent. Who acts: no one; traits are recorded as the player chooses, and the factor applies from then.

**Read from the code:**

- **The same six-event childhood for every adult player character.** The quick history generator places a move, a lunch table, a teacher, volunteering, a first job and preparing for the next step at ages 6, 10, 12, 15, 16 and 17 (`character-history.ts:3549`). In Mateo's life all six fall on the birthday, May 12, and so do the three school starts, while Quinn's and Colin's school starts fall in late August. Each event has a written summary. The owner's childhood rule says formative scenes are caused by what happens in that world, never a fixed list. Who acts: a new pool row to generate earlier life from the household's own records; P6 files it.
- **Big life events leave no memory.** Memories are written for nine event types (`world.ts:1411`); marriages, deaths, sentences, migrations and births are not among them. Who acts: P6 step 1, whose moment store covers these kinds for the story.
- **No war or deployment.** The military-service composers (`character-history.ts:4270` and `:4381`) have no live caller, and the migration review marks military service not built (`pressure/contract.ts:222`). Who acts: the separate war design with the owner (answer 4).
- **No layoff event and no graduation event.** A layoff is a work-status reason (`town-labor-market.ts:158`), and finishing school is an enrollment state (`school-stages.ts:459`). Who acts: P6 step 1, which classifies those records directly.
- **Illness is said to be unrecorded.** The absence reader says illness is not represented (`relationship-absence.ts:55`), while crisis health episodes now exist (`crisis/types.ts:91`). Who acts: P6 step 2, which reads absence for fading.
- **No holiday calendar.** The simulation code and data hold no holiday dates. Who acts: a new pool row for holidays as data for all 56 places; P6 files it.

## How this was checked

Three seeded new games were built on main as of October 8, 2026 (head 382fed50), in places drawn by hashing the seed across all 56. Each was advanced seven simulated days, within the testing rule. The salience and importance numbers come from a throwaway script that applies the rule above to the saved records; it is not committed. The scale values were checked against the published Holmes and Rahe adult and non-adult tables. Every claim about existing code cites the line read. The design itself changes no code.
