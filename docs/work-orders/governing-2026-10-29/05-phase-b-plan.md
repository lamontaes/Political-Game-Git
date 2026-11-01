# Phase B build plan: your first term

Read-only, from main 7ecc777d5 (Oct 30, 02:51 UTC). The three maps were traced at 7a1daea4b. On main, every line in legislature.ts past about 1690 is 8 higher (draftBill 1932, positionOn 2728, learnStake 2842, offerDeal 3122, chamberVote 3421, recordPromises 4118, castMemberVote 4842, whipCount 5442).

**Reading line:** I read OWNER-DECISIONS on main through Oct 30 03:05; DECISION-REGISTER lines 226-236, 284 and the OCD-PRESS-001/002 sections around 950-956; prior-rulings/elections.md R3 (23-26) and R18 (122-126); LAW.md lines 14, 18 and 102. I searched docs/ for "expert", "cosponsor" and "whip", and searched every pool item on main.

## What main changed since the maps

- **Meeting screen: done, not rebuilt here.** Members as faces, the tally and the result landed in #6830 (940efc2d8, src/bench/ui/meeting-item.mjs).
- **Bill screens: done, not rebuilt here.** Today's amount beside the new one landed in #6843 (pool item play-bill-screens-redesign, done).
- **Journal: one gap left.** It no longer prints each vote twice (journal.ts:672-674). It still has no line for your own bill passing or failing, and none for a signing or veto. A grep for `sign|veto|desk|failed|passed` in journal.ts finds only law names (137-156, 827-832).
- **Your office's look belongs to the CTO.** Menu looks moved to the CTO on Oct 29, 22:45 (CREW.md lane row; OWNER-DECISIONS line 27). "Your office reads like the mocks" is the CTO's screen; phase B only supplies its data.
- **No meters.** No meter or bar may show how anyone feels about the player; bars that count recorded votes or money are allowed (OWNER-DECISIONS line 22).
- **Fold rule.** Every engine that keeps a row per event needs a fold rule (OWNER-DECISIONS lines 16-17), so the promise table needs one.
- **No promise button.** R18 (prior-rulings/elections.md:122-126): "Anything a person says can bind them. There is no 'make a promise' button," and the journal is the ledger. Co-sponsoring and promising happen in a talk's replies.
- **Six M3 items already exist** (lead: governing): gov-m3-01-fiscal-note-at-drafting, gov-m3-01-city-attorney-warning-on-the-bill, gov-m3-01-phase-in-by-dated-steps, gov-m3-02-two-stakes-in-a-played-world, gov-m3-02-amend-and-endorsement-deals, gov-m3-02-deals-in-the-journal. The plan uses them; no twins.
- **One existing item conflicts with the Oct 29 ruling.** gov-m3-02-two-stakes-in-a-played-world's done-when shows "the member's own recorded position" on the office panel. OWNER-DECISIONS line 89 bars that, so it is rewritten in Unit 13.
- **Nobody else is editing these files.** No branch outside `governing/*` touches legislature.ts, world-legislating.ts, record.ts, staff.ts, office-day.ts or office-day-acts.ts (diff of the 40 newest remote branches against main).
- **learnStake has two callers outside tests:** staff.ts:933 and office-day-acts.ts:640. Nothing in world-legislating calls it.

## One store for a word given (settle before Unit 4)

- **The store.** A word given is a promise row in record.ts, whose header already claims promises (record.ts:1-11). It is judged by the existing judge, promisesOf (record.ts:127).
- **Campaign promises move in.** The table and writer move from campaigns.ts (PromiseRow 254, table 336, write 2766, observe 2777).
- **New fields:** toId (absent means public), billId, side (+1 or -1), firmness 0-1 and causeId. contestId becomes optional. Indexes: byFrom, byTo, byBill.
- **A co-sponsorship is the bill's own list (BillRow.cosponsors), not a row per co-sponsor.** promisesOf reads the list as a firm public promise. Background co-sponsors in every chamber the laws lead seats (its U3) then add no rows, which serves the speed bar.
- **"What colleagues told you" is the promise rows whose toId is the player.** Third parties learn a promise through api.observe, as campaigns do now. Map 2's separate `told-vote:` knowledge key would be a second store, so it is not built.
- **Replaced, not kept beside it:**
  - the replies table's favor rows for replies that give a word (keepReply, legislature.ts:377-447);
  - `Relationship.promise` (types.ts:273, no writer or reader);
  - back-their-item obligations rows (legislature.ts:3170);
  - the vote-promise event (4118-4156);
  - whipCount (5442).

## Units, in order (one PR each)

### Unit 1. gov-m3-01-fiscal-note-at-drafting (S)

- **Player:** drafting a minimum-wage or budget bill shows its cost note, the same one the bill paper shows.
- **Files and wiring:** src/bench/bill-paper.test.ts. Reads draftBill's costEstimate (legislature.ts:1932, BillRow 181-254), seatAct (bench/legislature.ts:215) and billPaper (282).
- **Seam, the lane:** "For gov-m3-01-fiscal-note-at-drafting I'm adding one played test to src/bench/bill-paper.test.ts that reads billPaper(...).estimate against the bill's costEstimate. No screen change. Is anything of yours open on that file or on bench/legislature.ts:282-350?"
- **Proof:** buildBenchWorld in a place drawn from all 56, seed printed. Assert estimate.workers equals the open work commitments paid under the new floor, named by commitment id.
- **Already answered:** REG:243, every bill carries a fiscal note.

### Unit 2. gov-m3-01-city-attorney-warning-on-the-bill (S)

- **Player:** a bill on a disputed power shows the city attorney's warning on the paper.
- **Wiring:** the disputed-authority check (legislature.ts:19, 1343), bill.authority and billPaper.
- **Seam, words:** "Is there a bank line for the city attorney's disputed-authority warning on the bill paper, keyed to the authority row's status 'disputed'? If not, can you add one?"
- **Proof:** bill-paper.test.ts in a drawn place: the warning sits on the disputed authority row by bill id, and a settled power on the same body carries none.
- **Already answered:** M3-legislating spec lines 16-23.

### Unit 3. gov-m3-01-phase-in-by-dated-steps (M)

- **Player:** draft a raise in two dated steps; the law in force follows each date.
- **Wiring:** draftBill provisions write dated steps; enactLaw (laws.ts:600, per 02-engine.md:16) writes the phases that laws-in-force.ts:5 already reads. No second law store.
- **Seam, laws lead:** "gov-m3-01-phase-in-by-dated-steps writes a bill provision with dated steps that enactLaw turns into the phases laws-in-force.ts already reads. Is enactLaw's phase write in your U2 path, and which file order do you want?"
- **Seam, the lane:** a second step on the draft control.
- **Seam, words:** the paper's wording of each step.
- **Proof:** drawn place: lawInForce shows step 1 the day after date 1 and step 2 the day after date 2, and each law row names the bill id.

### Unit 4. One promise store (M)

- **Player:** nothing new on screen. Campaign promises read exactly as before, and a "back their item" deal now records which item was promised.
- **Files:** record.ts, campaigns.ts, past-elections.ts (411-412), legislature.ts, types.ts.
- **Wiring:** promisesOf (record.ts:127), recordAppeal (167), pledgeDoubt (voting.ts:711-744), press (press.ts:1481), offerDeal (3122), dealValue (3197). dealValue reads the named question instead of assuming the member's strongest view.
- **Removed:** Relationship.promise and back-their-item obligations rows. Obligations keep favors only, which phase C calls in.
- **Seam, words and the lane** (both edit campaigns.ts per CREW): "I'm moving the campaign promises table (campaigns.ts:254, 336, 2766) into record.ts with the same fields plus toId, billId, side, firmness and causeId; makeStatements keeps writing through one record.ts call. Do either of you have open work on makeStatements or that table?"
- **Seam, speed lead:** "Promise rows need a fold rule (Oct 30 01:55). Proposed: keep every promise made by or to someone in the player's circle and every public promise of a sitting official, and fold the rest once judged. OK?"
- **Proof:** src/core2/promises-one-store-played.test.ts in a drawn place:
  - a campaign promise row id is judged against a later vote row id exactly as on main, and recordAppeal reads it;
  - an accepted back-their-item deal's promise row names its question, and dealValue reads it.

### Unit 5. Co-sponsors by name, on the bill and on the record (S)

- **Player:**
  - the bill paper names the co-sponsors;
  - background bills carry named co-sponsors;
  - the player is never filed or signed on without their own word.
- **Wiring, world-legislating.ts:**
  - the counter at 477-482 becomes member ids (sponsor excluded);
  - Filed, Filing and SessionBill drop the number;
  - backing at 542 and the copies at 621, 973, 1244 and 1364 read the list's length;
  - 1152 becomes an empty list.
- **Wiring, legislature.ts:** draftBill (1932) takes cosponsorIds; office.introduced names them.
- **Player left out:** the filers list at 459 includes the seated player; only the executive branch checks for them (465-467).
- **Wiring, bench:** billPaper (bench/legislature.ts:282-350) adds the names.
- **Seam, laws lead:** "Named co-sponsors change fileChanges (world-legislating.ts:440-535): the cosponsors counter becomes member ids (sponsor excluded), Filed, Filing and SessionBill drop the number, and the seated player leaves the filers list. Your U2 (filer lean) and U3 (sessions loop, by-body index) touch the same function. Which goes first? Is BillRow.cosponsors as {memberId, date, causeId}[] fine?"
- **Seam, the lane:** "The paper gains a co-sponsors line from BillRow.cosponsors. Do you add it in billPaper and ui/bill-paper.mjs, or do I, with your review?"
- **Researcher (a CTO pool item):** each body's co-sponsor rules (who may sign on, original versus later, withdrawal) as bodies.json data.
- **Proof:** src/core2/cosponsors-played.test.ts in a drawn place:
  - a background bill lists its co-sponsors by member id on the bill row and the session row;
  - the floor order reads them;
  - promisesOf judges one co-sponsor by their vote row `vote:<bill>:<member>` (legislature.ts:3474);
  - the player's id is in no filer, sponsor or co-sponsor list.

### Unit 6. A word given in a talk binds (M)

- **Player:** in the vote-seeking talk, "Count me in" is a firm word and "I'll look at it" a vague one. When a colleague asks the player and the player agrees, that is the player's word. The vote weighs the word.
- **Wiring:**
  - keepReply (377-447) reads facts.keeps from scene.reply (purpose-scene.ts:996-1017; purpose-arcs.json keeps "promise" at 69, "favor-owed" at 60, stall at 40) and writes a promise row.
  - Firmness comes from the member's own position margin, leaned by a new trait decision `legislature.give-word` (trait-decisions.json, beside legislature.member-position at 1142) through leanedTerm.
  - positionOn (2728) gains one word term (firmness × a TUNABLE weight).
  - replyPull (457, read at 2788) stops counting the favor row for a reply that wrote a promise, so the word is not counted twice.
- **Resolves:** SG-WORDS-favor-promise-keeps-unread (director stopgaps.json:436-446).
- **Seam, words:** "keepReply will read facts.keeps from scene.reply and write a promise row: firm for agree, promise and bargain; vague for stall. Can you change the ask-vote and confirm-vote arcs so a stall keeps 'promise' with a vague mark (purpose-arcs.json:40 and the undecided endings), and tell me which fact carries firm versus vague? Do you or I resolve SG-WORDS-favor-promise-keeps-unread in this PR?"
- **Proof:** src/core2/word-given-played.test.ts, player seated as sponsor: vote-ahead record id, then the scene reply id, then the promise row id (colleague to player, billId, firmness). At the roll, that colleague's positionOn reasons name the promise id beside their vote row id.
- **Already answered:** R18; no dice (a sliding term).

### Unit 7. Kept or broken, and remembered (M)

- **Player:** a colleague who gave their word and voted against it has broken it, and the player remembers. That colleague's next yes counts for less in deals and the estimate. A colleague remembers the player's own broken word the same way.
- **Wiring:**
  - promisesOf judges a bill promise by the promiser's vote row on that bill (votesOf, record.ts:111).
  - After chamberVote (3421), the promised person observes the outcome. Only `event:*:experienced` keys ever fade (knowledge-retention.ts:3-6), so it lasts.
  - A broken word strains the tie with negative hours times firmness (closeness.ts:109), tempered by the quarrel rule (307).
  - askBeforeTheRoll (552) and dealValue (3197) discount a colleague by the share of their words to this person that broke, the brokenShare pattern (voting.ts:743).
  - recordPromises (4118-4156) writes promise rows instead of vote-promise events.
- **Resolves:** SG-WORDS-recall-promise-record (director stopgaps.json:448-458).
- **Seam, words:** "Promises now settle at the roll, with promise-kept and promise-broken events naming the promise row and the vote row. Do you want a scene and a journal line for each (sceneEndingMoments, journal.ts:609-637)? Will the vote-confirmed scene (purpose-scene.ts:488-494) read the promise row instead of the vote-promise event?"
- **Seam, laws lead:** "positionOn (2728-2834) gains one word term, and askBeforeTheRoll and dealValue a broken-word discount. Anything of yours in flight there?"
- **Researcher:** how often co-sponsors vote against their own bill, to make the word weight ESTIMATED.
- **Proof:** src/core2/word-kept-or-broken-played.test.ts in a drawn place:
  - promise rows settle kept and broken, each citing a vote row id;
  - the promised person's knowledge holds the promise key;
  - the tie's latestChange cites the promise;
  - the next ask's discount names it.
  - If no word breaks in the run, the test says so. It does not insert one (fixtures prove edge cases only).

### Unit 8. Asking a colleague to co-sponsor, and being asked (M)

- **Player:** in a talk, ask a colleague to sign on. They sign (their name goes on the bill), say "I'll look at it", or say no. A colleague can ask the player the same; the player answers in the talk.
- **Wiring:** askToCosponsor, built on the askToCarry pattern (2886; carryAsks table 311, put 2969). It weighs positionOn on that bill. A firm yes adds to BillRow.cosponsors; a vague answer writes a private promise. An ask to the player is held for their answer, like a carry ask.
- **Seam, words:** "A new scene cause: a cosponsor-ask record (asker, member, bill). Can the ask-vote arc carry it, or does it need its own situation type and lines? This record backs the bank line that already promises a co-sponsorship with nothing behind it (data/english/parts/scene-talk.json:45409-45412)."
- **Proof:** src/core2/cosponsor-ask-played.test.ts: cosponsor-ask id, then reply id, then the member on BillRow.cosponsors or a vague promise row, then that member's vote row reads it.
- **Already answered:** OWNER-DECISIONS line 92; R18.

### Unit 9. Talk to a colleague about your bill whenever you choose (M)

- **Player:** open a fellow member's card, Talk, raise your bill: ask for their vote or their name, or offer a deal. This plays as the vote-seeking scene on the day you choose.
- **Wiring:**
  - /api/talk/open (bench/handler.ts:432) opens the talk.
  - subjectsBetween (conversation.ts:835) gains a "your bill" subject from pendingBillsOf (office-day-acts.ts:497).
  - The asks call offerDeal, askToCosponsor and the vote ask.
  - A colleague-asked record becomes a second cause of the vote-sought type (situation-types.json:3549-3600).
  - The day-choice act (office-day-acts.ts:629-665) stays as the let-happen path through the same functions. Its act row stops storing the exact position (learnStake at 640) and stops showing raw detail text.
- **Seam, words:** "Can subjectsBetween raise the speaker's own pending bill with a fellow member, and can vote-sought take a second cause, a colleague-asked record the talk writes? I write the record in legislature.ts; the subject, cause and lines are yours."
- **Seam, CTO (person card) and the lane:** "Does the colleague's card already offer Talk through /api/talk/open? If not, which of you adds it?"
- **Proof:** extend src/director/player-asks-for-a-vote.test.ts, which is already in the M3-02 command. On a day that is not the eve, a colleague-asked record id causes a vote-sought scene id, and its reply writes a promise or deal row by id.
- **Already answered:** OWNER-DECISIONS line 619 (calling or visiting a person happens from that person), line 52 (one way to each action), line 586 (any act of office done or simulated).

### Unit 10. gov-m3-02-amend-and-endorsement-deals (M)

- **Change to the item:** it is retargeted from "the office panel's talk" to Unit 9's talk.
- **Player:** trade an amendment, which changes the section's value, or an endorsement, for a vote.
- **Wiring:** offerDeal's amend kind (3122); floor amendments (02-engine.md:10); the campaigns endorsement record.
- **Seam, words:** "Amend and endorsement offers are said in the talk's bargain reply. Do the section-bargain lines name the section and the new value from the deal row?"
- **Proof:** the item's own done-when.
- **Already answered:** R3. Everything is tradeable; endorsements are not transactional by default, so the player offers one and the member never demands it.

### Unit 11. Your aide's estimate, from records (L; split into engine, then the evening-before read, if it runs past a day)

- **Player:** before a vote, the aide names each colleague as likely for, likely against or unsure, dated, and can be wrong. Without an aide, the player's own reading of the record stands in, as a registered stopgap.
- **Wiring:**
  - briefOnBill (staff.ts:913-944) stops calling learnStake(…,"record") (933).
  - It estimates each covered member from: votesOf on the bill's questions; promisesOf, including words given to the player; remarksOn (meetings.ts:316); party and district lean; and BillRow.deals.
  - workQuality (staff.ts:835) sets how many members and how many sources it covers.
  - It runs the evening before the floor (legislature.ts:330).
  - learnStake's routes return only what the route can know.
  - askBeforeTheRoll (502-600), when the player is the sponsor, picks whom to ask from this estimate, not positionOn (534-543). Background sponsors keep the exact count as a registered stopgap.
- **Seam, words:** "The vote-sought facts will carry the estimate, not the exact margin. That fixes 'Three votes. That's all I'm short' beside a 3-2 count (03-player.md:9). Which fact names do you read?"
- **Seam, laws lead:** none. It has no learnStake caller, per the grep above.
- **Proof:** src/core2/aide-estimate-played.test.ts in a drawn place:
  - estimate rows by member id, each source named by record id (a vote row, a promise row, a remark);
  - at least one member whose estimate differs from their roll-call vote row;
  - staff.ts never calls positionOn or memberPosition.
- **Already answered:** OWNER-DECISIONS line 89; REG:284; no dice (the error is the gap between the records and the truth).

### Unit 12. play-officeholder-hires-aide (S; existing priority-1 item)

- **Why now:** pulled forward from phase D because Unit 11 needs an aide.
- **Player:** hire an aide from the people the staff engine lists, with their reasons.
- **Wiring:** staffCandidates (staff.ts:385) and hireStaff (681). staffReview keeps skipping the player (1204), since the player chooses.
- **Seam, CTO and the lane:** "The aide hire list (staffCandidates with reasons, then hireStaff) goes on Your office, which is in the CTO's menu redesign. Who builds it, and where does it sit?"
- **Seam, words:** staff scenes cast the aide.
- **Proof:** the item's done-when, plus Unit 11's work row naming the aide's staff row id.
- **Already answered:** REG:236.

### Unit 13. What they told you, and your aide's estimate, before the vote; the exact count goes (M)

- **Item:** gov-m3-02-two-stakes-in-a-played-world, with its done-when rewritten.
- **Player:** on the bill paper and Your office, before the vote:
  - each colleague's word to you: firm, vague or no, with the day;
  - the aide's estimate, marked as an estimate that can be wrong;
  - the body named by its own name, not the seat's title (today's label comes from bench/legislature.ts:136-138).
- **Wiring:** one core reader, beforeTheVote(api, billId, personId), returns promises to the person on that bill plus the latest estimate. It replaces floorOf's whip (bench/legislature.ts:122-145) and the lines at play.mjs:2118 and 2248. whipCount (5442) is deleted.
- **Seam, the lane:** "The floor-whip lines (play.mjs:2118, 2248) and floorOf's whip are replaced by what colleagues told you plus the aide's estimate, from one core reader, and whipCount is deleted. Do you build the view, or do I with your review? Your after-the-vote tally (#6830) stays."
- **Seam, words:** "Bank words for 'your aide's estimate', 'can be wrong', and firm versus vague ('said yes', 'said they'd look at it'), keyed to the reader's fields."
- **Seam, CTO:** the panel's look. No meter (OWNER-DECISIONS line 22).
- **Proof:** src/bench/office-deals.test.ts (in the M3-02 command), drawn place: one stake learned by a talk (promise row id), one by the estimate (work row id), both shown on the paper; whipCount gone (grep).

### Unit 14. Close-vote stop (M)

- **Player:** the clock stops for any vote where your vote could decide it, judged by what you know; lopsided votes play on.
- **Wiring:**
  - A `close-vote` kind with byDefault true goes through registerStopKinds (office-day-registry.ts:65), beside office-day.ts:84-86.
  - It is decided the evening before, after members' filings land (placeFiled, office-day.ts:661-683), from Unit 13's reader, never positionOn.
  - It sets the meeting row's playerPresent and calls holdPlayerAt (836).
  - "Could decide": among the other members, for and against differ by at most one, unsure counted both ways, or the body's tiebreak rule.
  - State and federal reuse the same check in phase F.
- **Seam, words:** "A close-vote stop needs a short line as the meeting opens. Is that a meeting-scene fact or its own scene?"
- **Proof:** src/core2/close-vote-stop-played.test.ts in a drawn place: a meeting within one vote has a hold record id; a lopsided one has none; neither reads positionOn.
- **Already answered:** OWNER-DECISIONS line 90.

### Unit 15. Your stops, your choice (S)

- **Player:** see what stops you (your bills, close votes, your desk, every meeting, scenes) and turn each on or off.
- **Wiring:** stopsOf and setStops (office-day.ts:232-259; no caller outside tests), officeStopKinds (registry line 69), and the scene filter (ledger.ts:1842, served at handler.ts:742, no screen calls it).
- **Seam, CTO:** "Oct 29 21:15 makes stops customizable (OWNER-DECISIONS line 90). #6497 removed the stop toggles under the Oct 27 5 PM ruling (line 291). Please record that the newer ruling wins, and say where the per-kind settings sit in your menu redesign (Calendar or Your office). The data is stopsOf/setStops and the scene filter."
- **Seam, words:** label words for each kind.
- **Proof:** src/bench/office-stops.test.ts in a drawn place:
  - with own-bill-vote set off through the handler, the next meeting row with the player's bill has playerPresent false;
  - with a scene kind filtered out, that kind does not interrupt.

### Unit 16. Your calendar in office, from records already kept (M; view only)

- **Player:** Calendar lists the coming weeks, each item marked play or let happen:
  - meetings and their bills;
  - the budget hearing;
  - invited debates and interviews;
  - constituents waiting;
  - ribbons to cut.
- **Wiring:** calendarItems (bench/calendar.ts:41) reads:
  - MeetingRow and upcomingMeeting (office-day.ts:102-116, 305);
  - the budget hearing (budgets.ts:1336-1362);
  - invited DebateRow and InterviewRow (meetings.ts:126-135; press.ts:193-218);
  - open CaseRow by respondBy (constituent-cases.ts:52-66);
  - ribbonsToCut (projects.ts:103-117);
  - stopsOf.
- **Seam, CTO and the lane:** "Calendar gains the officeholder's coming weeks from existing records, each marked play or let happen. It is in the menu redesign. Who builds it?"
- **Seam, words:** calendar bank lines.
- **Proof:** src/bench/calendar-office.test.ts: every item cites its record id; table sizes are equal before and after (no facts made, no time spent).
- **Already answered:** LAW.md lines 18 and 102.

### Unit 17. One booked-day loop for every level (L, two PRs)

- **17a:**
  - office-day-registry.ts (46-71) gains an entries provider per kit.
  - The state day's loop moves into office-day.ts: scheduleTomorrow 1161, liveToday 1198, doEntry 1135, actOn 666.
  - Local acts with a named counterpart become dated entries, each set to play or let happen: meet-department-head, talk-to-colleague, office hours and cut-ribbon.
- **17b:** office-day-state.ts runs on the shared loop, and its own loop is deleted.
- **Seam, laws lead:** "The state day's entry loop (office-day-state.ts:1135-1216) moves into office-day.ts so every level books entries one way. Does your U3 sessions work touch stateDay or scheduleTomorrow?"
- **Seam, speed lead:** "Entries are booked only for the controlled person and act on change. OK against the year bar?"
- **Proof:** src/core2/office-day-entries-played.test.ts: a booked entry with a named counterpart; play gives a doEntry result row, let happen gives an actOn result row.
- **Already answered:** one engine per mechanic; OWNER-DECISIONS line 90.

### Unit 18. Booked meetings with named people (M)

- **Player:** booked entries with department heads (appointmentsIn), colleagues on your pending bill, constituents from open cases, and the aide's briefing before a vote (Unit 11).
- **Wiring:** each runs through Unit 17's loop.
- **Seam, words:** the desk-visit and constituent-stop scene types already exist.
- **Proof:** entry id, then act id, then scene id, in a drawn place.

### Unit 19. Lobbyists booked before the vote (M)

- **Player:** a lobbyist meeting shows up on the calendar before the vote, not only on vote day.
- **Wiring:** organize (interest-groups.ts:202) runs when the bill reaches an agenda or floor date, so the LobbyMeeting (66-80) is dated before the vote. It becomes an entry through Unit 17, default let happen. The vote still reads lobbyTerm.
- **Seam, laws lead (interest groups):** "Can organize run when a bill is placed on an agenda instead of in the vote-day hook? Do you fix gov-lobby-meeting-stake-and-lobbyist (open) first or with it?"
- **Proof:** the meeting row's date is before the vote date, and the lobbying reason in positionOn cites the meeting id.

### Unit 20. Appearances at events (M)

- **Player:** booked appearances at openings, closings, ribbon cuttings and disasters.
- **Wiring:** entries come from organization.founded (business.ts:2266-2275), business.closed (2512), ribbons, and hazard.disaster (disasters.ts:216). Views move through deliverSpeech (speech.ts:131).
- **Seam, words:** the scenes.
- **Not here:** strikes and protests have no record; see below.

### Unit 21. Speeches and talks by invitation (M, plus research)

- **Player:** organizations in town invite the official to speak.
- **Wiring:** organizations (town-workplaces.ts:335-392) invite for their own recorded reasons, such as members' stake in a pending bill or closeness. Delivered through deliverSpeech.
- **Researcher:** how often invitations come, as an ESTIMATED value.
- **Seam, words:** the speech lines.

### Unit 22. Expert dinners (L)

Built after the owner answers question 1 below.

### Unit 23. The journal says what happened (S-M; words builds the lines; gov-m3-02-deals-in-the-journal)

- **Player:** journal lines for your bill passing or failing, your signature or veto, the deals you made, favors owed, and a word kept or broken.
- **Wiring:** officeActMoments and sceneEndingMoments (journal.ts:609-690) read bill status, executive-action rows, promise rows, deal rows and favor obligations.
- **Seam, words:** "The journal has no line for your own bill's result or for a signing or veto (the grep finds only law names). The records are bill status, executive-action, promise rows with kept/broken, deal rows and favor obligations. Will you add the lines, and is gov-m3-02-deals-in-the-journal yours or mine?"
- **Proof:** a journal test in a drawn place where every moment cites its bill, deal, promise or executive-action id.

### Unit 24. M3-01 and M3-02 pass in five drawn places (S)

The features.json commands on main (403 and 413) name the new tests. They run in five drawn places with seeds named, and both flip to passing. That is phase B done.

## Not built by governing in phase B

- **Swearing in:** words-swearing-in-scene-and-speech, claimed by words. Its cause is the took-office record from seatWinner (offices.ts:1645, per 02-engine.md:5). Governing checks it fires in path-check.
- **Members drawn in the chamber:** #6830 shows faces. Question for people: "Is drawing council members at the chamber plate's spots, not just faces, in people-pack-v4, and does the meeting panel hand you its cast?"
- **Your office's look:** the CTO's. The body name is fixed in Unit 13, today's amount beside the new one in #6843, and money words already exist (play.mjs:1926 moneyWords; check in play).

## Owner design calls

Send to the CTO with the reading line.

1. **Expert dinners: what does knowing a subject change for the player?**
   - Nothing rules it. The nearest rulings only constrain it: preparation may expose facts, likely follow-ups and better-informed choices (REG OCD-PRESS-002, around line 956), and full play offers no flat stat reward (OCD-PRESS-001).
   - Proposed default: an expert teaches facts the records hold (the law in force, its cost, who it reaches) as known facts. Talks, debates, interviews and the paper's estimate read them. No skill number.
2. **An office with no staff allowance (only if research removes aides there).**
   - Today nearly every town official hires an aide (gov-official-staff-allowance-by-office), and REG:236 gives a legislator two or three staff.
   - If research takes aides away from small towns, whose estimate does a small-town council member see? The plan builds the player's own reading as the stopgap.

## Standing rules already answer these

The CTO records them; no owner question needed.

- **Stops are customizable.** The newest ruling wins: OWNER-DECISIONS line 90 over the line 291 reasoning #6497 used; line 586 agrees.
- **Promises are said, never a button.** R18.
- **No exact count before a vote.** The stop and the sponsor's asks read the estimate (line 89; REG:284).
- **No meter on the pre-vote panel.** Counts of records are fine (line 22).
- **The seated player never gets a bill, a co-sponsorship or a word without their own say.** Follows the Oct 29 budget objection (line 77) and "your own bills" stopping by default (line 90). The CTO should confirm.
- **"Own bill" means the sponsor's.** Co-sponsored bills are covered by the close-vote stop. The CTO may rule otherwise.
- **The colleague talk starts from their card** (lines 619 and 52).
- **Research, not questions** ("Simulate it, don't ask", line 401): co-sponsor rules per body, the word's weight, invitation cadence.
- **The promise fold rule** (lines 16-17).
- **Pulling the aide forward from phase D:** "Nothing waits."
- **Endorsement trades:** R3.
- **Who owns strikes and protests as world events is a CTO call.** No strike, picket, protest or rally record exists (map 3's greps).

## Outside phase B's list

- **Each body's own meeting day and hour** (line 76): its item, office-stopgap-office-day-calendar-calendar, is marked done, so it needs a successor.
- **Phase F:** state floor stops.
- **Phase D:** the budget stop, on office-the-budget-season's branch from #5533.
- **The CTO's:** orientation (research-new-member-orientation-distilled).

Main's rulings, read for this plan, are saved at /tmp/claude-0/-home-user-Political-Game-Git/e700904c-357a-5300-94c3-1f79cca80131/scratchpad/od-main.md.
