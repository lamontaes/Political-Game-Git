# Scene catalog: classes drawn from real political lives (Nov 15, 2026)

The machine-readable form is `docs/design/scenes/scene-catalog.json` (one row per class, read by the scene and line accounting). The build order, owners and briefs are in the project's shared files (scene-buildout, plan and rulings-and-briefs).

**Outcome check (owner, Nov 15 02:32Z):** D2 is folded into D1 as a shape of the door; D4 is folded into the morning-after scene; C4 and O4 are dropped; the colleague side of L4 is folded into its press side; C3, K4, O2 and K8 pass only as steps in an arc. Details in the build-out's rulings-and-briefs, section 2. K8's honest-count-only note and K9's convention note are superseded by his earlier rulings (prior-rulings/elections.md lines 105 to 114; DECISION-REGISTER.md line 394; OWNER-DECISIONS.md line 108).

Read against `origin/main` fa34439d, the Words lead's story queue (ordered Nov 15 02:00Z), the accepted plan for replies and scene shapes, the owner's rules 110 to 127 in the Words lead's owner-feedback file (project files), `docs/design/scene-inventory.md`, the 35 packets in `docs/design/scenes/from-life/`, 345 open PRs and the pool.

Two rules from the Words lead hold for every row: a new scene is placed by the record from the start, and a scene that unlocks another reads the endings earlier scenes already wrote to the record. Nothing here adds a new store.

How to read a row:

- **Life:** the real episodes behind the class, cited. Calibration only. No real name, words or event ships.
- **Cause:** the record that stages it. Where I checked the code, I give the file. "To confirm" means I read the module header but not the full path.
- **Depth:** how long the scene runs, where the player steers, and what a long form looks like (the owner, 02:27Z: a sponsor's monologue, a keynote of 10 to 20 clicks of short sentences). Length is chosen by the record through the "beats" in plan part 2a, never fixed.
- **Writes:** the record the ending leaves, which a later scene reads.
- **Unlocks:** later scenes that read that ending.
- **Can do:** NOW (the engine records it and a purpose or type exists, so the work is lines and placing), SMALL (one reader, one branch or one stop on a path that exists), NEW (a mechanism no engine has yet).
- **Owner:** an existing thread by its title, or "new builder".

---

## Part 1. Things that cut across every scene

These are not scenes. They are what makes the 79 purposes we have feel like many more. The owner asked for each by name tonight. Each belongs to the one scene engine (`src/director/scene-talk.ts`, `purpose-arcs.json`, `purpose-scene.ts`) and to plan parts 1 and 2. I list them so the scene rows below can lean on them, not to build them twice.

### X1. How a scene starts ("take a seat")

The opening beat is chosen by how the two came to be talking: summoned to an office (they say "sit down"), caught on the stairs, arriving for an appointment, a knock at the player's door, called on the phone, stopped in the street, the player knocking. Rule 124 already says the opener must fit this.

- **Cause:** the scene's own setting and who asked for the meeting (the playerAsks types versus a cause row naming the asker). Both are already on every staged scene.
- **Can do:** SMALL. It is plan part 2a (beats as data) plus one opening-beat kind per arrival. Owner: "Carry the conversation engine".

### X2. Replies that depend on the record

Plan parts 1a to 1d, already accepted and owned (the reporter's call thread and the conversation engine thread). Every row below assumes them. No new work here.

### X3. People who lie to the player

Today only the player can lie (the scales control in `src/director/conversation.ts`; the lie is kept as a belief and anyone who knows the truth corrects it later). I found that no engine reads the `truthfulness`, `facet-manipulative` or `facet-sincere` traits to decide anything. They only pick wordings (`arc-variants.json`, `grading-profiles.json`). So nobody in the world ever says something false to the player.

- **What a lie is here:** a person with a stake in a fact says the opposite of their own record, and the claim is kept the way the player's lie is kept, so it can be found out. Where it fits, from real lives: a candidate who promised a seat to a successor and then files for it anyway (Life: Illinois, 1995, below); a colleague who says they will vote yes and is recorded absent or no; a bribe-giver who says the money is a campaign gift; a constituent who leaves out that they were fired for cause; a rival's staffer who says the rival is not running; a department head who says the work is on schedule when the project record says late; a door resident who says they will vote for you and does not.
- **Cause:** the speaker's truthfulness against what the truth costs them, through the core's one chooser. No roll. What the truth costs comes from records that exist: the vote they cast, the filing they made, the bribe, the job record.
- **Writes:** the claim, kept in the same belief store the player's lie uses (`noteHeard` and the beliefs module). Being caught writes a strain on the tie and the player's knowledge of the truth.
- **Unlocks:** "You told me you'd vote yes" (the player confronts); the player repeats the false claim and is corrected in public (press); a promise said falsely at the door is read at the ballot.
- **Can do:** NEW, but small and on existing parts: one decision (say true or false) and the belief store that already exists. Owner: "Carry the conversation engine" (it owns the belief readers), with a Fable read of the decision first.

### X4. Someone who will not stop talking; the long turn

Two sides of one thing: a turn longer than one line.

- The sponsor's speech for their own bill, the official's oath, the keynote: the other person or the player speaks several sentences in a row (rule 122).
- The neighbor who will not stop: a long turn the player did not ask for, from a lonely or excitable person.
- **Cause:** for the monologue, the speaker's role in the occasion (sponsor, presiding officer, keynote speaker). For the talker, their own record: they live alone or their household is empty, their closeness-seeking and excitable traits are high, and they have a fresh event in their own life (`subjectsBetween` already finds it). No roll.
- **Depth:** the talker's turn runs three to six lines before the player can steer; the player's choices are to listen (closeness grows, time passes), to steer to the campaign, or to make an excuse (the record keeps that they cut it short).
- **Can do:** SMALL. A beat kind "they go on" in plan 2a, sized by the record. Owner: "Carry the conversation engine".

### X5. Scenes that open other scenes

Every row below names what it unlocks. The mechanism is the director reading an earlier ending from the record (the from-life packet `owed-talk-comes-due.md` and `people-owed-talk-record` #8429 are the pattern). No new store.

---

## Part 2. The scene classes

### Doors and the street (campaign)

**D1. The door that closes on you.** First outing; the resident cuts the candidate off or shuts the door.

- **Life:** canvassers in any local race. The Cambridge council candidate who later topped the vote by knocking every door started handing out cards in a parent's race (Crimson, 1981). Lincoln in 1834 "visited nearly every family in the county" after losing in 1832 (Miller Center).
- **Cause:** the door's resident and their record: the campaign engine's door cause row (`src/director/doors.ts` reads it), their agreement with the platform, their tie to the player, a grievance they hold against someone the player stands with (`grievance.ts`), being in the middle of something (their work hours, a newborn, a death in the house). The hostile and blunt facets choose how hard the door shuts.
- **Depth:** short by design: one to three turns. Steer: leave, leave a card, ask what's wrong.
- **Writes:** the door cause row already says the door was reached and how it went.
- **Unlocks:** the same resident at a town hall (D-row in meetings); the next outing's narration remembers a bad first day; a second knock weeks later that goes differently because the platform moved.
- **Can do:** NOW. `ask-support` and `ask-signature` exist with knows-you and lost-job forms. A refusal with a reason from the record is lines and a reply set. Owner: "Write more door scenes".

**D2. The resident who will not let you go.** Uses X4.

- **Cause:** as X4, at a door. The campaign's day of doors is spent on fewer houses (the doors engine counts reached doors, so time is real).
- **Can do:** SMALL (X4 first). Owner: "Write more door scenes".

**D3. The door that tells you something you didn't know.** A resident has a problem the record holds (a lost job, an eviction notice, a closed clinic, a road the project never finished) and asks what the player will do.

- **Life:** the from-life packets `the-first-door-of-the-day.md` and `a-constituents-case.md` already cover the base. New here: the answer is a promise on the record (the town hall already writes one, `meetings.ts`), and later scenes read it.
- **Unlocks:** the resident at office hours after the player wins (`constituent-cases.ts`); the resident at the recall petition if the promise breaks ("Make promises kept, broken and remembered" thread owns the promise record).
- **Can do:** NOW for lines; SMALL to make the door answer a promise row. Owner: "Write more door scenes", with the promises thread for the record.

**D4. The precinct that votes for you and the county that does not.** The player won their own neighborhood and lost the district.

- **Life:** Lincoln, 1832: 277 of 300 votes in his own village, eighth of thirteen in the county (Miller Center).
- **Cause:** race results by precinct (`legislative-district-results.ts`, `race-places.ts`). To confirm the precinct split is kept per race.
- **Scene:** the morning after, a neighbor says "We all voted for you here." Unlocks the next run's decision (run again, run for something smaller).
- **Can do:** SMALL. The morning-after packet exists (`the-morning-after-the-race.md`). Owner: "Let people bring up election results".

### The county clerk's office and filing

**C1. Your papers have a problem.** The clerk finds signatures that do not count (wrong district, not registered, signed twice).

- **Life:** Illinois, 1995 to 1996: a state senate candidate challenged rivals' petitions; the board threw three off and the incumbent withdrew about 200 short (Wikipedia, Illinois Senate career of Barack Obama).
- **Cause:** the signatures come from door scenes (#9097). Whether each signer is a registered voter in the district is the voter-roll record ("Build voter registration record" thread: `pollingStatus`).
- **Depth:** a counter talk of three to five turns; the clerk never says a count (rule 50); the player can go back out, ask which ones, or argue.
- **Writes:** the filing's standing. **Unlocks:** C2.
- **Can do:** SMALL once the voter roll is read at the counter. Owner: "Fix the filing counter", reading the voter registration thread's API.

**C2. Someone challenges your petition, or you challenge theirs.** A rival's lawyer or a voter files an objection; the board rules.

- **Cause:** NEW record: an objection to a filing, decided by the board from the signers' roll status. No engine keeps objections today (`candidacy.ts` has none; I searched).
- **Unlocks:** a rival off the ballot; the rival's grudge (a grievance row); the press story.
- **Can do:** NEW. Owner: new builder on the candidacy engine, after C1.

**C3. The incumbent who said they'd step aside files at the last hour.**

- **Life:** the same Illinois race: the incumbent endorsed a successor, lost her other race, and filed on the last day after supporters drafted her.
- **Cause:** the candidacy engine already has every adult weigh running on the day a window opens, and an officeholder weighs their own seat (`candidacy.ts` header). What is missing is a person's earlier word (X3: an endorsement or a "not running" said to the player) that the filing contradicts.
- **Can do:** SMALL after X3. Owner: "Carry the conversation engine" for the claim; the filing is the engine's own.

**C4. The clerk's office as a place people meet.** Other candidates filing the same day; a party official watching who files; a reporter checking the list at closing. Each a short scene placed by who is at the counter that day.

- **Cause:** filings on that date (`filing-clerk.ts`). **Can do:** NOW. Owner: "Fix the filing counter".

### Campaign life

**K1. Your long-time volunteer or staffer asks for your endorsement to run on their own.** The owner's example.

- **Life:** a congressman's aide who answered every constituent letter, later ran for the seat (LBJ, Miller Center); an aide to a state legislator, asked by the party to run for county office after her husband declined (Ann Richards, Women in Texas History); a council member's son who handed out cards in his father's race, ran himself after a layoff (Crimson, 1981).
- **Cause, checked in code:** the candidacy engine already decides who runs, from their own record. The campaign engine already has each candidate ask the people closest to them for an endorsement every turn (`askForEndorsement`, `src/core2/modules/campaigns.ts` around line 6273), **but it skips the player by name** (`id !== playerId`), and a favor the player owes is a registered stopgap (`SG-GOV-player-favor-asked`, line 6803). So the ask already happens to everyone except the player. The scene is that ask reaching the player.
- **Depth:** four to eight turns. They say why now, from their own record (years on the player's campaign or staff, a cause they carry from the drives engine, a job they lost). They may ask for more than the word: a donor list, a door list, the player's appearance. The player can say yes, yes with a condition, not yet, or no; ask what they'd do about a question they differ on.
- **Writes:** the existing endorsement row (`keepEndorsement`), with the answer and the reason (pool item `campaigns-endorsement-ask-answer-record`, open).
- **Unlocks:** their race night (they call the player); if they win, an ally on the body; if refused, they leave the campaign (the volunteer-lapse record, `campaigns-volunteer-joined-and-lapsed-records`, in a PR) and may run against someone the player backs.
- **Can do:** SMALL, and it clears a stopgap. Owner: new builder (Sonnet, campaigns engine), lines from the Words lead.

**K2. The party comes to your shop.** A party or faction leader recruits the player at their place of work while their business or job is failing.

- **Life:** a county machine recruited a veteran at his failing store; he chose the campaign over the store (Flatland KC, Truman 1921 to 1922).
- **Cause:** `ask-to-run` and `party-recruit` exist. New: the scene reads the player's own job or business books (`business-books.ts`, the job record), and the choice weighs it.
- **Can do:** NOW for lines placed by the business record. Owner: "Ask someone to serve as a scene" or the party recruit's owner; the Words lead decides.

**K3. A friend pays you into a group you don't want.** A friend signs the player up for a club or group that would help the campaign; at the first meeting its organizer names the price (who you will and won't hire).

- **Life:** a friend paid a candidate's dues to a hate group in 1922; its organizer said a member could not give county jobs to Catholics; the candidate refused and got the money back (Flatland KC).
- **Cause:** interest groups and cause groups exist (`interest-groups.ts`, `drives.ts`); the price is the group's own position against the player's (the group's stand on a bill). No hate group is modeled and none should be named; the class is "a group whose backing has a price the player finds wrong".
- **Unlocks:** the group's members heckle the player later (K4); the group backs the rival.
- **Can do:** SMALL. Owner: "Write campaign event scenes".

**K4. The heckler, and the friend who stands up for you.** At a speech or meeting, someone says the player is not one of us; a friend in the room answers them and nearly gets thrown out.

- **Life:** Flatland KC, 1922, same race.
- **Cause:** a speech's audience (`speech.ts` records who heard it) with a person who opposes the player and the hostile facet; a friend of the player in the same audience, with bond-loyalty.
- **Writes:** the strain between the heckler and the friend, the friend's closeness to the player. **Unlocks:** the friend's later ask (they stood up for you).
- **Can do:** SMALL. `rally-opponent` exists. Owner: "Write campaign event scenes".

**K5. Answer for a vote you once cast.** An opponent says the player once voted for the other party, or for a measure the town now hates; the player owns it, explains it, or denies it (X3: a denial the record contradicts is a lie).

- **Life:** the 1922 candidate admitted voting for a Republican war comrade and said why (Flatland KC); the Arkansas governor whose car-fee increase was used against him in 1980 (Encyclopedia of Arkansas).
- **Cause:** the player's own vote and ballot records (`voting.ts`; the vote facts in plan 1b).
- **Can do:** NOW once plan 1b lands. Owner: "Fix the reporter's call scene" family, or "Give rivals more than one issue" for the rival's side.

**K6. The stunt that goes wrong.** The player tries an unusual way to reach voters and it embarrasses them.

- **Life:** a candidate dropped leaflets from a plane and was sick on landing (Flatland KC).
- I list this to say no: nothing in the record would cause it except the player's own press, and the game has no stunts. Dropped.

**K7. A death opens a seat.** An officeholder dies; within days the player decides whether to run in the special election, and someone with the money asks to be the one who funds it.

- **Life:** a congressman died in 1937 and a 28-year-old entered at once, using his wife's inheritance (Miller Center, LBJ).
- **Cause, checked:** special elections exist (`registerSpecialElections`, `specialContestFor`). The scene reads the vacancy and the player's household money.
- **Unlocks:** the race itself; the spouse's stake (`spouse-stake-after-filing.md` packet).
- **Can do:** SMALL. Owner: "Write campaign event scenes".

**K8. The count is close.** A recount, the box that went missing, the board that rules.

- **Life:** Georgia 1962: a county's box showed more votes than voters, turned up unsealed under the boss's daughter's bed, a judge threw the county out (Atlanta Magazine, Carter memoir); Jackson County 1922: ballots from 58 precincts brought from a bank vault with both candidates watching (Flatland KC).
- **Cause, checked:** `recountOf` (src/core2/modules/voting.ts, line 4145), `insideRecountMargin`, `recountRuleFor` exist. The scene is the night and the counting room. A stuffed or stolen box is a crime the owner has already allowed (DECISION-REGISTER.md line 394; OWNER-DECISIONS.md line 108), decided like any crime and found only by a recount, a witness or a record: pool item `elections-a-person-can-cheat-a-count`, not scheduled now.
- **Depth:** the counting room is a long scene: each precinct comes in as a beat; the player steers by staying, sending someone, calling a lawyer.
- **Can do:** SMALL for the honest recount. Owner: "Write campaign event scenes" (it owns concession and victory night).

**K9. The convention keynote.** The owner's depth example: 10 to 20 clicks, each a short sentence.

- **Cause, checked:** `speech-stages.json` already builds a speech in four stages (opener, two core parts, closer), four choices each. No party convention exists in any engine (I searched `src/core2`).
- **Depth:** the number of stages comes from the occasion: a council comment two or three, a rally four to six, a nominating or party convention keynote 10 to 20. Each stage is one to two short sentences from the speaker's own record (their town, their work, a vote, a person they met at a door, a law that reached someone).
- **Can do:** SMALL for the stage count by occasion (the speeches thread). The owner, Nov 15 02:39Z: the click rule goes with every speech, length varies (short as the Gettysburg Address; a president's 5 to 20), and speeches do not all follow one format. NEW for a party convention as an occasion: pool item `parties-hold-conventions-where-their-rules-do`, built only from a real producer (prior-rulings/elections.md lines 105 to 114).

### Sit-down meetings and offices

**M1. Called in: "Sit down."** The leader, the mayor, the party chair summons the player to their office. The opener is X1. What happens is the reason they called: a vote they need, a committee seat they're offering, a complaint about the player's speech.

- **Life:** Georgia 1963: the lieutenant governor, a friend of the man contesting the player's seat, would not discuss the contest; asked the player what committee he wanted and gave him a subcommittee chair; the challenge then went nowhere (Atlanta Magazine).
- **Cause, checked:** committee assignments are made by the body's assigning authority, rating members (`leadership.ts`: `committeeAssignment`, `organize`). The scene is that choice told to the player, with what the authority wants back (the obligations ledger exists: `obligationsOwedTo`, `legislature.ts` line 3702).
- **Writes:** an obligation row. **Unlocks:** the favor called in (M4).
- **Can do:** SMALL. Owner: "Clean up committees and bill paper" (it holds committees) or the meeting and floor thread.

**M2. The bad committee seat.** The player is put on a committee that has nothing to do with their district and asks to be moved.

- **Life:** a new member from a city district was put on agriculture, demanded a change and got veterans' affairs (BlackPast, Chisholm).
- **Cause:** `committeeAssignment` and the district's economy. **Can do:** SMALL. Owner: as M1.

**M3. The leader's treatment.** The leader leans in close and works the player for a vote: flattery, a favor, a threat to their bill.

- **Life:** the Senate majority leader's "treatment" (Miller Center, LBJ).
- **Cause:** `ask-vote` with whip, trade, friend and watched forms exists. New: the leader's own traits choose the approach, and the player's bill in committee is what is held over them.
- **Depth:** six to ten turns, the leader doing most of the talking (X4).
- **Can do:** NOW for lines. Owner: "Write meeting and floor scenes".

**M4. The favor called in.** Someone the player owes asks for it back: a vote, an endorsement, a job for a relative.

- **Cause, checked:** the obligations ledger; the campaign engine already calls in favors from colleagues and skips the player as a stopgap (`SG-GOV-player-favor-asked`). The scene inventory still lists "betrayal" as waiting on an obligations ledger; that ledger now exists, so the inventory row is out of date.
- **Unlocks:** betrayal (if the player says no), the ally's return.
- **Can do:** SMALL; clears a stopgap. Owner: new builder, with K1 (same engine call).

**M5. The department head who disagrees.** Already pool item `director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-3-hard-meeting` (open). Not proposed again.

**M6. The appointee who wants to run.** An appointee of the player's announces for another office while holding the post; the law may force them out.

- **Life:** a city appointee announced for the state assembly and was removed from the permit board (History.com, Milk).
- **Cause:** `office-incompatibility.ts` holds which offices cannot be held together; the candidacy engine has the filing. To confirm it is read when an appointee files.
- **Can do:** SMALL. Owner: "Ask someone to serve as a scene".

**M7. The resigned colleague who wants their seat back.** A member resigned; months later they ask the executive to reappoint them; the executive says no.

- **Life:** San Francisco, 1978 (History.com). The violence that followed is not a scene for this game.
- **Cause:** succession and vacancy appointment records (`succession.ts`, `awaitingVacancy`). **Can do:** SMALL. Owner: "Ask someone to serve as a scene".

### The situation room and the briefing

**S1. The briefing when something goes wrong.** A disaster or crisis opens; the player as mayor, governor or president is briefed by the people whose work it is, and chooses what to do first.

- **Life:** the from-life packet `disaster-first-hours.md`. A governor sent the guard in a police strike (Miller Center, Coolidge); a governor got thousands of refugees placed in his state by a federal decision, and riots followed (Encyclopedia of Arkansas).
- **Cause, checked:** the federal president's office day already opens "the situation room" on each open crisis (`office-day-federal-president.ts` line 682, from the disaster record). Disasters exist from FEMA records (`disasters.ts`). A strike exists (`public-action.ts`).
- **Depth:** a room of three to five people, each a beat from their own department's record; the player steers by whom they ask and what they order. 8 to 12 turns.
- **Writes:** an executive act (`executive.ts`), what was asked of whom. **Unlocks:** the shelter visit; the aid that did not come (story queue C10); the ad against the player next election (K5).
- **Can do:** SMALL for the scene, since the record and the president's room exist; the governor and mayor need the same read. Owner: "Write the mayor's and governor's desk".

**S2. The other government's decision lands on you.** The federal government or the state does something whose cost falls on the player's town (a facility, a cut, a mandate).

- **Cause:** `outside-governments.ts`, `president-acts`, `nation`. **Can do:** SMALL. Owner: the desk thread.

### Legislating and negotiating

**L1. The sponsor's case.** The owner's floor example: someone speaking for their bill says what it does without being asked (rule 122). Long turn (X4) in the register of the floor (rule 123).

- **Cause:** `floor-debate` exists. The bill's sections are on its record. **Can do:** NOW. Owner: "Write meeting and floor scenes".

**L2. Listening to the other side and changing the bill.** The sponsor meets the people who oppose it (police, an employers' group, a union) and trades a section for their support.

- **Life:** Illinois: a state senator negotiated with police and Republicans to pass a law taping interrogations (Wikipedia, Illinois Senate career).
- **Cause:** `section-bargain` exists; the interest group's lobbyist is a named person with the group's case (`interest-groups.ts`). Story queue B2 covers "the sponsor asked to drop a section". Not proposed again; this row adds the group at the table.
- **Can do:** NOW. Owner: "Write meeting and floor scenes".

**L3. Using the money to win something else.** A member with a say over funding trades it for a project the executive wanted to deny the player's town.

- **Life:** Georgia 1963: a senator used his subcommittee's funding power to get the governor's hometown a dental school, and his own town got its four-year college (Atlanta Magazine).
- **Cause:** budgets and projects (`budgets`, `projects.ts`); obligations. Story queue B3 has "the budget" with no type; this is one of its scenes.
- **Can do:** SMALL. Owner: whoever takes story queue B3 (new builder).

**L4. The sole no.** The player is the only no on a bill everyone else passed, or the only yes. Colleagues and the press ask why; it follows them.

- **Life:** San Francisco 1978: one supervisor was the only dissent on an ordinance (History.com).
- **Cause:** the roll call. **Can do:** NOW. Owner: "Fix the reporter's call scene" (press side), "Write meeting and floor scenes" (colleague side).

**L5. The court makes you act.** A court ruling forces a special session; the executive calls one and proposes a package with a tax to pay for it.

- **Life:** Arkansas 1983: the state supreme court ruled school funding unconstitutional; the governor called a special session, a teacher test and a sales tax increase (Encyclopedia of Arkansas).
- **Cause:** courts come after early access (AGENTS.md). Dropped for now.

**L6. Your absences used against you.** The rival reads out how many votes the player missed.

- **Life:** Cambridge: a candidate won a state seat by highlighting the opponent's missed roll calls (Crimson, 1981).
- **Cause, checked:** the legislature records a member as "absent" when they miss a sitting (`legislature.ts` around line 4040). **Can do:** SMALL. Owner: "Give rivals more than one issue".

### Office life and holding the seat

**O1. The jobs.** After winning, the player's allies want jobs; the other faction gets none and turns against the player next time.

- **Life:** Jackson County: the faction shut out of county jobs backed the other party and the judge lost re-election (Flatland KC).
- **Cause:** appointments (`executive.ts` names department heads from people the appointer knows), staff hiring (`staff.ts`); grievances. **Can do:** SMALL. Owner: "Ask someone to serve as a scene".

**O2. Wakes, weddings and favors.** The officeholder who goes to every wake. A scene where a constituent's funeral, wedding or new baby is something the player shows up for, and the family remembers.

- **Life:** the Cambridge mayor's "constant favors, weddings and wakes" (Crimson, 1981).
- **Cause:** `funeral`, `celebration`, `new-baby` types exist; the new part is that the player is invited as the officeholder, from the tie or the case they helped with (`constituent-cases.ts`).
- **Can do:** SMALL. Owner: "Write family life scenes".

**O3. Losing and then repairing.** After a lost primary, the player goes to the people who backed the winner and says no hard feelings; over months the groups that went to the rival start coming to the player.

- **Life:** Illinois 2000: after losing a House primary by more than two to one, the state senator told community leaders he bore no grudges and took up their funding requests; a colleague later said the groups stopped coming to him (Wikipedia).
- **Cause:** race results; the groups' ties (`interest-groups.ts`); the closeness engine. **Unlocks:** the next run.
- **Can do:** NOW. Owner: "Let people bring up election results".

**O4. The old comrade's letter.** Years later, someone who helped the player once writes when they reach a higher office.

- **Life:** the county marshal who protected the 1922 ballots wrote to congratulate the new president in 1945 (Flatland KC).
- **Cause:** shared history (`shared-history.ts`) and `letter` type exists. **Can do:** NOW. Owner: "Write family life scenes" or the letter's owner.

**O5. Changing the rules of the race.** The player backs a change from at-large to district seats (or the reverse), because they keep losing citywide.

- **Life:** San Francisco 1976 to 1977 (History.com).
- **Cause:** this would be a charter change; ballot measures exist (`ballot-measures`). To confirm a measure can change the body's seat plan. **Can do:** NEW. Owner: owner question first (it changes the game's structure).

---

## Part 3. Classes I checked and did not propose

- Every row in story queue sections A to H: already queued.
- The five owner asks of Nov 8 (task force, starting a movement, hard meeting, campaign trail stop, 15-person debate): open pool items.
- Polling place trouble: owned by the voter registration thread.
- Running mate and cabinet as talks: #9080 and #9324.
- Ballot fraud as a mechanic (K8's stuffed box): no engine models it and it would be a world event; I put it as a question.
- The stunt (K6) and the court session (L5): reasons above.
