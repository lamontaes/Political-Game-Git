# Phase B units: your first term, re-sliced (Nov 1)

This re-slices `05-phase-b-plan.md` (Oct 30) so that M3-01 can flip first and M3-02 second. A read-only map of main produced it on Nov 1 (four readers, a planner and a skeptic), and nothing was run. **The review at the end overrides the unit text wherever they differ.** Pool items filed from it so far: `gov-record-vote-per-question` (unit 4), `gov-m3-01-ban-blocks-the-seats-bill` (unit 2, built as the review says) and `gov-m3-01-passes-in-five-places` (unit 3).

**What I read:** `origin/main` at 41ef0ac386 (Nov 1, 13:59 UTC, the merge of #6840), the branch `origin/governing/phase-in-dated-steps` (f21566c533, Oct 30 09:13), and open PRs through the REST API. I edited and ran nothing.

**Base plan:** `docs/work-orders/governing-2026-10-29/05-phase-b-plan.md` already orders most of this. I re-sliced it so that M3-01 can flip first and M3-02 second. I kept its unit content where it still holds, and I renumbered.

## Order at a glance

| #        | id                                                                                       | h            | Moves                                           |
| -------- | ---------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------- |
| 1        | gov-m3-01-phase-in-by-dated-steps (existing)                                             | 1.5          | M3-01 "optional phase-in"                       |
| 2        | gov-m3-01-ban-blocks-the-seats-bill (new)                                                | 2            | M3-01 "a clear higher-level ban blocks it"      |
| 3        | gov-m3-01-passes-in-five-places (new)                                                    | 2 + runs     | M3-01 flips                                     |
| 4        | gov-record-vote-per-question (new bug)                                                   | 1.5          | M3-02 "promises on the record"                  |
| 5        | gov-m3-02-one-promise-store (new)                                                        | 4            | M3-02                                           |
| 6        | gov-m3-02-word-given-binds (new)                                                         | 4            | M3-02 "learns stakes", "promises on the record" |
| 7        | gov-m3-02-aide-estimate (new)                                                            | 4-5          | M3-02 second route                              |
| 8        | gov-m3-02-two-stakes-in-a-played-world (existing, rewritten)                             | 3.5          | M3-02 "two stakes"                              |
| 9        | gov-m3-02-amend-and-endorsement-deals (existing)                                         | 4            | M3-02 "real terms"                              |
| 10       | gov-m3-02-acts-cite-deal-records (new; governing half of gov-m3-02-deals-in-the-journal) | 1.5          | M3-02 "in the journal"                          |
| 11       | gov-m3-02-passes-in-five-places (new)                                                    | 2 + runs     | M3-02 flips                                     |
| 12       | gov-m3-02-word-kept-or-broken                                                            | 4            | phase B (promises broken)                       |
| 13       | gov-m3-02-pledges-join-the-promise-store                                                 | 3            | one word-given store                            |
| 14       | gov-m3-cosponsors-on-the-bill                                                            | 3            | co-sponsors                                     |
| 15       | gov-m3-ask-to-cosponsor                                                                  | 4            | co-sponsors as promises                         |
| 16       | gov-m3-ask-a-colleague-any-day                                                           | 3            | ask whenever you choose                         |
| 17       | gov-office-close-vote-stop                                                               | 3            | default stops                                   |
| 18       | gov-office-ahead-reader                                                                  | 3            | stops and calendar data                         |
| 19       | gov-seated-governor-appointment-job-ends (existing, open)                                | 2            | swearing in stands clean                        |
| 20       | gov-path-check-swearing-in                                                               | 1            | swearing in checked after a win                 |
| 21a, 21b | gov-office-booked-day-loop                                                               | 4 + 4        | calendar entries                                |
| 22       | gov-office-booked-named-meetings                                                         | 3            | calendar                                        |
| 23       | gov-office-lobbyists-booked-before-vote                                                  | 3            | calendar                                        |
| 24       | gov-office-appearances-at-events                                                         | 3            | calendar                                        |
| 25       | gov-office-speeches-by-invitation                                                        | 3 + research | calendar                                        |
| 26       | gov-office-expert-dinners                                                                | after owner  | **OWNER DECISION**                              |

## Units

### 1. gov-m3-01-phase-in-by-dated-steps (claimed; branch exists, no PR)

- **Player:** from the seat, draft a raise in two dated steps; the law in force follows each date.
- **Files:** the branch already touches:
  - `src/bench/legislature.ts` (seatAct :219)
  - `src/core2/modules/legislature.ts` (draftBill :1934)
  - `src/core2/laws-in-force.ts`
  - `src/bench/phase-in.test.ts`
  - `src/core2/data/stopgaps.json`
  - `docs/roadmap/features.json` (the M3-01 command gains phase-in.test.ts)
- **Engine:** draftBill provisions carry an effectiveDate, enactLaw turns them into phases, and lawInForce reads them. There is no second law store.
- **Done when:** the item's own done-when (`docs/pool/items/gov-m3-01-phase-in-by-dated-steps.md`), after merging main into the 2-day-old branch, in a drawn place with its seed printed. lawInForce shows step 1 the day after date 1 and step 2 the day after date 2, and each law row names the bill id.
- **Seam, the lane:** "governing/phase-in-dated-steps adds a date per section to seatAct (src/bench/legislature.ts:219) and a new src/bench/phase-in.test.ts. No play.mjs change. Is the draft card's second-step control yours, in a later PR?"
- **Seam, Words:** "#6951 (merged Oct 30) keys the section-date lines. Does billPaper need to pass each section's date for them, and is that yours or mine?"

### 2. gov-m3-01-ban-blocks-the-seats-bill (new)

- **Player:** in a place whose state preempts the town, the draft card marks the item blocked and gives the reason, and the bill never reaches a vote.
- **Gap:** `bill-paper.test.ts:78` skips any draft that is not "drafted". The ban is tested only through `draftBill` in a small world (`legislature.test.ts:911-933`).
- **Files:** a new `src/bench/bill-ban.test.ts`.
  - It reads seatView's `allowed: false` and its reason, which `play.mjs:2284-2288` already shows.
  - It calls seatAct (`bench/legislature.ts:219`) and holdVote (`legislature.ts:4206`).
  - It adds the file to the M3-01 command.
- **Done when:** buildBenchWorld runs in a place drawn by data from the preempting states, with the seed printed.
  - The seat view marks the item blocked, with its reason key.
  - seatAct leaves the bill `blocked`, with the rule's reason, by bill id.
  - holdVote keeps it blocked, and no `vote:<billId>:*` row exists.
- **Seam, the lane:** "One played test of a banned bill from the seat, in a new src/bench file, with no screen change. Is anything of yours open on bench/legislature.ts:219-420?"

### 3. gov-m3-01-passes-in-five-places (new)

- **Player:** nothing new; M3-01 reads as passing.
- **Files:** the six M3-01 test files.
  - Each prints one line with the place it actually played (name, state, key, seed, record ids), and names any fallback body or extra draw.
  - `legislature-bill-form`, `legislature-sections` and `policy-authority` print nothing today.
  - `features.json` gets `passes: true`.
- **Done when:** every M3-01 file passes under five `GOLDEN_PATH_SEED` values, with `BILL_PAPER_SEED` unset. The printed lines name five different places. The PR body tables them.
- **Seam, CTO (session_01S4WSHrFBAnJLwUcjDV8Vc3):** "Flipping M3-01 to passes:true makes it an accepted quick spec, sorted first (runner.mjs:128-133). The quick job already overruns its 450 s (`tests-golden-path-quick-budget-spent-before-m3-09`, yours, open). M3-01 measured N s. Should it go in the long job as #6860 did for M3-04/05 (merged Nov 1 13:49), or stay quick?"

### 4. gov-record-vote-per-question (new bug)

- **Player:** a member's record keeps their vote on every part of a multi-part bill, not only the last part.
- **Defect:** record.ts:74 builds the id `vote:<measureId>:<personId>`. The loop at `legislature.ts:3493-3506` writes once per provision, so each provision overwrites the one before. promisesOf, which judges by question, then sees only the last question.
- **Files:**
  - `src/core2/modules/record.ts:74`
  - `src/core2/past-laws.ts:215`, which writes the same id shape
  - `src/bench/reached.ts:184`, which reads the old id
  - a record test
- **Done when:** in a drawn place, a passed two-provision bill leaves two record vote rows per member, one per question. promisesOf judges a promise on the first question by that row's id. The vote-recorded event ids stay unique.
- **Seam, the lane:** "Record vote ids gain the question. bench/reached.ts:184 builds the old id. May I change it in this PR with your review?"

### 5. gov-m3-02-one-promise-store (new; plan Unit 4)

- **Player:** nothing on screen changes. A back-their-item deal now records which question was promised.
- **Files:**
  - `record.ts`: the store, under its existing promises header, judged by promisesOf (:127).
  - `campaigns.ts`: PromiseRow (:275), the table (:435) and makeStatements (:3612) move out.
  - `legislature.ts`: offerDeal (:3124), dealValue (:3199) and the obligation write (:3172).
  - `types.ts:273` (Relationship.promise, removed) and `past-elections.ts`.
- **Shape:** `{id, fromId, toId|null, contestId?, billId?, question?, side, firmness, causeId, date, venue?, audience?}`, with indexes byFrom, byTo and byBill.
- **Removed:**
  - Relationship.promise
  - back-their-item obligation rows
- **Registered stopgap:** PledgeRow (`campaigns.ts:260-273`) is already a word given, with its own firmness. It stays put as `SG-GOV-pledges-outside-promise-store` until Unit 13. Moving it now would collide with #6912 and `governing/door-yes-counted-split`.
- **Done when:** `src/core2/promises-one-store-played.test.ts` runs in a drawn bench world.
  - A campaign promise row id is judged against a later vote row id exactly as on main, and recordAppeal reads it.
  - An accepted back-their-item deal's promise row names its question, and dealValue reads it.
  - campaigns.ts no longer has a `promises` table.
- **Seam, Words (session_01J5HkKbts1QhKYPKVHcFASz) and the lane (session_01S4WSHpJWHzmGsPvFQC9BCj), since both edit campaigns.ts:** "I'm moving campaigns.ts's promises table (PromiseRow :275, table :435, makeStatements :3612) into record.ts, with the same fields plus fromId, toId, billId, side, firmness and causeId. makeStatements will write through one record.ts call. Do you have open work on makeStatements or that table?"
- **Seam, the speed lead (session_01S4WSHpRbBHKwtCjaf1meFB):** "New promise rows come only from a word said in a scene with the player, or from a public campaign promise. Readers: promisesOf, recordAppeal, pledgeDoubt, press, positionOn. Proposed fold: keep rows made by or to the player's circle and every public promise of a sitting official; fold the rest to counts once judged. Is that OK under Oct 30 04:14?"

### 6. gov-m3-02-word-given-binds (new; plan Unit 6)

- **Player:**
  - In the vote-seeking talk, "Count me in" is a firm word and "I'll look at it" a vague one.
  - Your own "yes" to a colleague is your word.
  - The vote weighs the word.
- **Files:**
  - `legislature.ts`: keepReply (:377-448), replyPull (:457-486), positionOn (:2730).
  - `data/content/trait-decisions.json`: a new `legislature.give-word` beside `legislature.member-position`.
  - A TUNABLE word weight in the campaigns parameters.
  - `stopgaps.json`.
- **Wiring:**
  - keepReply reads `facts.keeps` and `facts.firmness`.
  - The promiser and the one promised come from the voteAsks row (askedId to askerId), so the scene needs no new field.
  - The player's "agree" (:413-421) also writes a promise row with its cause.
  - Replies are keyed by (bill, member, asker), and the latest answer wins. Today asking on several days stacks a favor each time (:469-486).
  - replyPull stops counting a reply that wrote a promise.
- **Resolves:** `SG-WORDS-favor-promise-keeps-unread` (`src/director/data/stopgaps.json:436`).
- **Done when:** `src/core2/word-given-played.test.ts` runs with the player seated as sponsor in a drawn place.
  - The chain is the vote-ahead id, then the scene.reply id, then the promise row id (from the colleague, to the player, with billId and firmness).
  - At the roll, that colleague's vote row reasons name the promise id.
  - A second ask replaces the first reply row instead of adding one.
- **Seam, Words:** "keepReply will read facts.keeps and facts.firmness and write a promise row whose promiser is the voteAsks askedId. Does will-look fire in vote-sought, and are 'firm' and 'vague' the final values? Do you or I close SG-WORDS-favor-promise-keeps-unread?"
- **Seam, laws lead (session_01S4WSHq6yHHZL4YM5PwWATS):** "positionOn (:2730-2836) gains one word term, firmness times a TUNABLE weight. Do you have anything in flight there?"
- **Seam, CTO:** "Who owns data/content/trait-decisions.json now, for one new decision row?"

### 7. gov-m3-02-aide-estimate (new; plan Unit 11)

- **Player:** before a vote, each colleague is marked likely for, likely against or unsure, dated, with its sources, as an estimate that can be wrong.
- **Files:** `staff.ts`:
  - briefOnBill (:913-940) stops calling `learnStake(...,"record")` (:933) and stops discarding the result.
  - workQuality (:835) sets coverage. Members are taken by who the aide knows, not in id order (:928-932).
  - The result lives on the aide's WorkRecord, read through workOf (:1041).
  - It runs the evening before the floor, not at the beforeVote hook (:155).
- **Sources:**
  - votesOf
  - promise rows to the reader
  - remarks
  - party and district lean
  - BillRow.deals
  - never positionOn or memberPosition
- **Stopgap:** with no aide, the player's own reading of the voting record stands in. The record is a route REG:284 names. Registered as `SG-GOV-estimate-without-aide`, replaced by `play-officeholder-hires-aide`.
- **Done when:** `src/core2/aide-estimate-played.test.ts` runs in a drawn place.
  - Estimate rows by member id, each citing source record ids.
  - At least one estimate differs from that member's roll-call row, or the test says none did; nothing is inserted.
  - A grep shows staff.ts calls neither positionOn nor memberPosition.
- **Seam, Words:** "The vote-sought facts will carry the estimate, not the exact margin (your #6947 already drops the counted shortfall). Which fact names do you read?"

### 8. gov-m3-02-two-stakes-in-a-played-world (existing; done-when rewritten)

- **Player:** on the bill paper and Your office before a vote, you see:
  - each colleague's word to you (said yes, said they'd look at it, or said no), with the day
  - your aide's estimate, marked as one that can be wrong
  - no exact for/against count
- **Files:**
  - `legislature.ts`: a new reader `beforeTheVote(api, billId, personId)`.
  - whipCount (:5457) is deleted.
  - askBeforeTheRoll (:502) picks whom to ask from the estimate when the player sponsors. Background sponsors keep the exact count as a registered stopgap.
  - learnStake (:2844) returns only what each route can know.
  - `office-day-acts.ts:640` and `:661` stop storing the exact total.
  - `bench/legislature.ts` floorOf (:126-148).
  - `src/bench/office-deals.test.ts`.
  - `legislature.test.ts` test 1, whose learnStake and total assertions (:197-206) are rewritten.
- **Done when:** office-deals.test.ts runs in a drawn place, with a line printed (it prints nothing today).
  - One stake is learned by a talk (promise row id) and one by the estimate (work row id).
  - Both come back from beforeTheVote and appear in `/api/office` and the paper.
  - `git grep whipCount src` is empty.
- **Seam, the lane:** "beforeTheVote replaces floorOf's whip (bench/legislature.ts:139) and the whip lines at play.mjs:2197-2200 and 2327-2331, and whipCount is deleted in the same PR. Do you build the view, or do I with your review? #6830's after-the-vote tally stays."
- **Seam, Words:** bank words keyed to the reader's fields.
- **Seam, CTO:** the panel's look. No meter (OD:47-49).

### 9. gov-m3-02-amend-and-endorsement-deals (existing)

- **Player:** trade an amendment (the section's value changes) or your endorsement for a vote.
- **Files:**
  - `legislature.ts` offerDeal (:3124) gains an endorsement kind that reads `campaigns.ts` askForEndorsement (:4356) and endorsementsOf (:4232).
  - `src/bench/data/controls.json:227-232`
  - `src/bench/office.ts:285-311`
  - `office-deals.test.ts`
- **Change to the item:** it goes through the existing talk-to-colleague act now. Unit 16's chosen talk reuses offerDeal later, so each action has one path.
- **Done when:** the item's own done-when, with one change. Today the accepted branches are conditional (`legislature.test.ts:210`, `:238`). The test instead requires an accepted amend and an accepted endorsement by id in the drawn place. It keeps drawing until one is taken, and says so if none is taken in N draws.
- **Seam, the lane:** "controls.json:227-232 and office.ts:285-311 gain 'An amendment' and 'Your endorsement'. Do you add them, or do I with your review?"
- **Seam, Words:** "Do the section-bargain lines name the section and the new value from the deal row?"

### 10. gov-m3-02-acts-cite-deal-records (new; governing half of gov-m3-02-deals-in-the-journal)

- **Player:** the journal can tell the deal you made and the favor you owe, once Words adds the lines.
- **Files:** `office-day-acts.ts:654-664`. `host.keep` stores dealId, obligationId and promiseId in place of `position` (the exact total) and the "favor: accepted" detail.
- **Done when:** in a drawn place, the talk-to-colleague act row cites the bill's deal row id and, when taken, the obligation row id, and stores no exact position.
- **Seam, Words:** "talk-to-colleague act rows will carry dealId, obligationId and promiseId (office-day-acts.ts:654-664). Will you add the journal rows for gov-m3-02-deals-in-the-journal, and should the item be reassigned to you, since journal.ts is yours?"

### 11. gov-m3-02-passes-in-five-places (new)

- **Done when:** the same as Unit 3, for the M3-02 command, after Units 6-10 and Words' journal line. Five places are named from the tests' own lines, and passes flips.
- **Seam, Words:** "May I add the promise row id to player-asks-for-a-vote.test.ts's PLAYER ASKS line (your file)?"
- **Seam, CTO:** the same budget question as Unit 3.

### 12. gov-m3-02-word-kept-or-broken (plan Unit 7)

- **Player:** a colleague who gave their word and voted against it has broken it. You remember, and their next yes counts for less. A colleague remembers your broken word the same way.
- **Engine:** the afterVote seam with the shape of `settleBribes` and `settleBribe` (`corruption.ts:564-612`, called from `interest-groups.ts:153`).
  - The judge reads the legislature's own row `vote:<billId>:<member>` (`legislature.ts:3476`).
  - A broken word strains the tie with negative hours times firmness, like settleBribe.
  - The discount follows pledgeDoubt's broken share (`voting.ts:719`).
  - recordPromises (:4120) writes promise rows instead of vote-promise events.
- **Resolves:** `SG-WORDS-recall-promise-record`.
- **Done when:** `src/core2/word-kept-or-broken-played.test.ts`:
  - Promise rows settle kept or broken, citing vote row ids.
  - The promised person's knowledge holds the promise key.
  - The tie's latest change cites the promise.
  - The next ask's discount names it.
  - If nothing broke in the run, the test says so.
- **Seam, Words:** "Will the vote-confirmed scene (purpose-scene.ts:490) read the promise row instead of the vote-promise event? Do you want journal lines for kept and broken?"
- **Seam, laws lead:** the discount in askBeforeTheRoll and dealValue.
- **Researcher (through the CTO):** how often co-sponsors vote against their own bill, so the word weight becomes ESTIMATED.

### 13. gov-m3-02-pledges-join-the-promise-store

- **Start:** after #6912 and `governing/door-yes-counted-split` merge.
- **Files:** PledgeRow (`campaigns.ts:260-273`) moves into the store, and the door writer (:686-731) writes through it. pledgeDoubt and the ballot read it. `SG-GOV-pledges-outside-promise-store` is cleared.
- **Done when:** a door pledge row id is read by the ballot exactly as on main.
- **Seam, speed lead:** "The pledge fold ('every pledge' kept, Oct 30 08:15) moves with the rows unchanged. OK?"

### 14. gov-m3-cosponsors-on-the-bill (plan Unit 5)

- **Player:**
  - The paper names the co-sponsors.
  - Background bills carry named co-sponsors.
  - The player is never signed on without their own word.
- **Files:**
  - `legislature.ts`: BillRow (:181) gains `cosponsors: {memberId, date, causeId}[]`, and draftBill (:1934) takes them.
  - `world-legislating.ts`: fileChanges (:442) turns its counter (:479-483) into member ids, and the copies at :518, :530, :623, :975, :1154 and :1246 plus the floor rank at :544 read the list.
  - promisesOf reads the list as a firm public promise.
- **Already answered (no owner question):** OD:119. A co-sponsor's name is on the bill, which is firm. "I'll look at it" is a vague promise row, not on the list.
- **Done when:** `src/core2/cosponsors-played.test.ts`, as in the plan's Unit 5 proof.
- **Seam, laws lead:** "Named co-sponsors change fileChanges (world-legislating.ts:442-535). Your U2 and U3 touch the same function: which goes first? Is BillRow.cosponsors as {memberId, date, causeId}[] fine?"
- **Seam, the lane:** the paper's co-sponsors line.
- **Researcher (through the CTO):** each body's co-sponsor rules, as `bodies.json` data.

### 15. gov-m3-ask-to-cosponsor (plan Unit 8)

- **Player:** ask a colleague to sign on. They sign, say they'll look at it, or say no. A colleague can ask you the same, and you answer in the talk.
- **Engine:** `askToCosponsor`, on the askToCarry pattern (:2888; carryAsks :311, put :2971).
  - A firm yes goes on `BillRow.cosponsors`.
  - A vague answer writes a promise row.
  - An ask to the player is held for their answer.
- **Done when:** `src/core2/cosponsor-ask-played.test.ts`. The chain is the ask id, then the reply id, then the member on the list or a vague row, then that member's vote row reading it.
- **Seam, Words:** "A cosponsor-ask record (asker, member, bill) is a new scene cause. Can the ask-vote arc carry it? It backs the orphan bank line at scene-talk.json:45409-45412."

### 16. gov-m3-ask-a-colleague-any-day (plan Unit 9, core half)

- **Player:** raise your bill with a colleague on any day you choose.
- **Files:** `legislature.ts` exports `askForVote(api, {askerId, askedId, billId, origin})`.
  - It writes the existing voteAsks row and the same event as askBeforeTheRoll (:567-598), with `facts.origin: "chosen"`, so keepReply and replyPull need no second path.
  - The day-choice act (`office-day-acts.ts:629`) calls it too.
- **Done when:** `player-asks-for-a-vote.test.ts` is extended. On a day that is not the eve, an ask id causes a vote-sought scene id, and its reply writes a promise or deal row by id.
- **Seam, Words:** "Can vote-sought take the same vote-ahead record with facts.origin 'chosen' as one cause, not a second? Can subjectsBetween (conversation.ts:835) raise the speaker's pending bill with a fellow member? A player-opened talk must compose directly, not through scheduling.ts:787-815's repeat skip."

### 17. gov-office-close-vote-stop (plan Unit 14)

- **Player:** the clock stops for any vote where yours could decide it, judged by what you know.
- **Files:** `office-day.ts`. A `close-vote` kind, on by default, beside :86-88. It is decided the evening before from beforeTheVote (Unit 8), sets `playerPresent` (:404-410) and calls holdPlayerAt (:838).
- **Done when:** `src/core2/close-vote-stop-played.test.ts`. A meeting within one vote by the estimate has a hold record id; a lopsided one has none; neither reads positionOn.
- **Already answered:** OD:117.
- **Seam, Words:** the opening line.
- **Seam, the lane:** the client handles only `office-day.meeting` and `office-day.desk` (play.mjs:561-562).

### 18. gov-office-ahead-reader (new; plan Units 15-16, core half)

- **Player:** the data behind "what stops you" and "your calendar in office".
- **Files:** `office-day.ts` gains `officeAhead(api, personId, from, through)`.
  - It returns dated meetings (:307), the budget hearing, invited debates and interviews, open cases and ribbons.
  - Each item carries its record ids and whether it stops, from stopsOf (:234).
- **Done when:** in a drawn place every item cites a record id, and every table's size is the same before and after the call, so no facts are made.
- **Seam, CTO and the lane:** "I supply officeAhead in core. Who adds office items to calendarItems (bench/calendar.ts:41) and the stops control over stopsOf and setStops (office-day.ts:234, 244, no caller today)?"

### 19. gov-seated-governor-appointment-job-ends (existing, open, lead governing)

- **Defect:** the swearing-in test stands aside for it (`swearing-in-scene.test.ts:149-157`). The office-stops reader said no item exists for this; this item covers it.
- **Done when:** the item's own done-when.
- **Files:** `offices.ts`, `executive.ts`, `job-lifecycle.ts:129`.
- **Time:** 2h.

### 20. gov-path-check-swearing-in (new)

- **Files:** `src/bench/path-check.ts`. After a win it prints and asserts the took-office record id and the swearing-in scene id. Today it resumes any stop blindly.
- **Seam, Words:** "Which ledger key names the swearing-in scene for a lookup by the took-office id?"
- **Time:** 1h.

### 21-25. The booked calendar (plan Units 17-21)

- **21a/21b, gov-office-booked-day-loop (4h + 4h):** the state day's entry loop (`office-day-state.ts:1135-1216`) moves into `office-day.ts`, and local acts with a named counterpart become dated entries, each set to play or let happen. Then the state loop is deleted.
  - Seam, laws lead: "Does your U3 touch stateDay or scheduleTomorrow?"
  - Seam, speed lead: "Entries are booked only for the controlled person and act on change. OK?"
- **22, gov-office-booked-named-meetings (3h):** department heads, colleagues on your bill, constituents and the aide's briefing go through that loop. Proof chain: entry id, then act id, then scene id.
- **23, gov-office-lobbyists-booked-before-vote (3h):** `organize` (`interest-groups.ts:202`) runs when the bill reaches an agenda.
  - Seam, laws lead: "Can organize run on agenda placement instead of in the vote-day hook, and with or after gov-lobby-meeting-stake-and-lobbyist?"
- **24, gov-office-appearances-at-events (3h):** entries from organization founding and closing, ribbons and disasters, delivered through deliverSpeech. Strikes and protests have no record; see the CTO line below.
- **25, gov-office-speeches-by-invitation (3h + research):** organizations invite the official for their own recorded reasons. A researcher sets the invitation cadence as ESTIMATED.

### 26. gov-office-expert-dinners: OWNER DECISION NEEDED

- **The question:** what does learning a subject at an expert dinner change for the player?
- **Proposed default:** the experts teach facts the records already hold (the law in force, its cost, who it reaches) as known facts, read by talks, debates and the paper's estimate. No skill number.
- **Reading line:**
  - OWNER-DECISIONS.md on 41ef0ac386: "expert" appears only at :117, which asks for the dinners but doesn't say what they change.
  - DECISION-REGISTER.md: the only hit is OCD-PRESS-002 (:956, interview preparation). OCD-PRESS-001 (:950) rules out a flat stat reward.
  - prior-rulings/ and play-first/LAW.md: no hit.
  - docs/: only OD:117 and the work order (:32) mention expert dinners.
  - The pool has no item.
  - Not decided.

## Needs from others (not governing units)

- **Words:**
  - The swearing-in item still reads `claimed` although #6840 merged at 13:59 UTC on Nov 1. The flip and the bench screenshot are Words'.
  - #6947 (vote lines with no shortfall) is open.
  - Bank words for estimate, told, firm and vague.
  - The "your bill" talk subject.
  - The close-vote opening line, the calendar kinds and the stop-reason labels.
  - Journal rows for deals, favors and kept or broken words (`gov-m3-02-deals-in-the-journal`).
  - Speech and appearance scenes.
- **The lane:**
  - Your office's seat plate shows the job title, not the body's name (play.mjs:1974; data from `/api/office`, bench/office.ts:139).
  - The Acts plate prints `a.detail` raw (play.mjs:2028).
  - The state and federal hold reasons fall back to "Something needs you" (play.mjs:484-490, 561-562).
  - The before-the-vote view (Unit 8).
  - The calendar's office items and the stops control (Unit 18).
  - `play-officeholder-hires-aide` (priority 1, open) has no `lead:` line.
- **CTO:**
  - Record that OD:117 and OD:613 ("The player chooses what stops them") make stops customizable again over #6497's reading of OD:318.
  - Where the stop settings sit.
  - The Your office look.
  - The M3 quick-job budget (Units 3 and 11).
  - Who owns strikes and protests as world records (no record exists).
  - The owner of trait-decisions.json.
  - Orientation (`research-new-member-orientation-distilled`).
  - Who adds Talk to a colleague's card, which exists only on People (play.mjs:2486-2489).
- **People (session_01S4WSHrjSXRBi1MtqEkbXWF):** "#6830 shows the meeting's members as faces only. Is drawing council members at the chamber plate's spots in people-pack-v4, and does the meeting panel hand you its cast?"
- **Researchers, through the CTO:**
  - co-sponsor rules per body
  - how often co-sponsors vote against their own bill
  - how often invitations come

## Corrections to the readers' reports

- The job-lifecycle defect has an item: `gov-seated-governor-appointment-job-ends` (open, lead governing).
- #6860 merged Nov 1 at 13:49 UTC. The channel's 14:00 line saying it waits on Checker 0 is stale.
- The trait decisions file is `data/content/trait-decisions.json`, not under src.
- The record vote id overwrite (Unit 4) is also written by `past-laws.ts:215` and read by `bench/reached.ts:184`.
- Who promised whom is already on the voteAsks row (askedId, askerId), so `scene.reply` needs no promiser field (Unit 6).

## Review (Nov 1, 14:18 UTC): keep, fix or drop each unit

I read `origin/main` at f155403fa2 (Nov 1, 14:18 UTC). That is the planner's 41ef0ac386 plus #6937, #6907, a few pool claims and one new ruling entry (OWNER-DECISIONS, Nov 1 14:20). I also read the branch `origin/governing/phase-in-dated-steps` (f21566c533) and the open PRs through REST. I edited nothing and ran no tests.

Because of the new ruling entry, every OWNER-DECISIONS line the planner cites is now 6 lines lower: OD:117 is 123, OD:119 is 125, OD:47-49 is 53-56, and OD:613 is 619.

### Per unit

**1. gov-m3-01-phase-in-by-dated-steps: FIX**

- Drop the question to the lane. It is already answered: `play-draft-phase-in-steps` exists (open, lead play-first, `blocked-on: gov-m3-01-phase-in-by-dated-steps`).
- Narrow the question to Words. #6951 (merged Oct 30) already added "dated-section lines for a bill, and one purpose for two steps on one law". Only the billPaper date pass is left.
- Add `gov-phase-in-weighed-once` (open, lead governing) to this unit or the next. positionOn counts each dated step's question again. The branch does not touch positionOn: its legislature.ts diff is only billSections, billForm, sectionDates and enact. As it stands, the vote in this unit's own done-when is skewed.
- The branch changes `laws-in-force.ts:267-272` so that a township's law governs in every place. Name that in the PR body and get the laws lead's review.

**2. gov-m3-01-ban-blocks-the-seats-bill: FIX**

- A ban is already tested in a bench world inside the M3-01 command: `policy-authority.test.ts:117-180` uses buildBenchWorld and drawPlace, and expects `status "blocked"` with reason `level-lacks-power`.
- The state-preemption case is `legislature.test.ts:911-933`, a small world built with createLifeCore at :123-163. It already asserts `holdVote(...).status === "blocked"`.
- Extend those tests with seatView, seatAct and holdVote rather than adding `bill-ban.test.ts`. That is about 1 hour, not 2.

**3. gov-m3-01-passes-in-five-places: FIX**

- None of the 8 M3-01 and M3-02 test files reads `GOLDEN_PATH_PLACE_KEY`. 54 other tests do (for example `campaigns.test.ts:102`, `budgets.test.ts:64`), so the runner reports a place the M3 tests never played. Read the key first, and redraw only with a printed reason.
- Flip precedent (`roadmap-m0-flip-proven-five`): every spec clause is proven by the command, and the spec is played in the bench with a screenshot. M0-04 was sent back for one unproven clause. Add a table from each clause to its assertion, and add the screenshot.
- Keep the CTO question about the quick-job budget (`tests-golden-path-quick-budget-spent-before-m3-09`, open, lead cto).

**4. gov-record-vote-per-question: KEEP, widened**

- The defect is confirmed. `legislature.ts:3494-3506` calls recordVote once per provision with `measureId: bill.number`, and `record.ts:74` builds the id from those two only. The second provision's vote-recorded event is dropped silently (`state.ts:2119`, `if (core.eventIds.has(event.id)) return`).
- It also collides across sessions. Congress numbers "H.R. 25" by the two-year Congress with no Congress in the label (`legislature-bill-form.test.ts:62-68`), so a two-term member's later H.R. 25 overwrites the first. Key the id by `bill.id` plus the question, not the bill number.
- No pool item exists for this.

**5. gov-m3-02-one-promise-store: FIX (smaller)**

- Moving the table is not needed for M3-02, and it collides with open #6912, which edits `campaigns.ts` and `voting.ts`.
- Extend PromiseRow and the promises table where they are (`campaigns.ts:275`, `:435`, written at `:3664`, read by `record.ts:131-135` and `past-elections.ts:411-413`). Add optional toId, billId, side, firmness and causeId, and make contestId optional. promisesOf stays the one judge.
- The fold is built under the Oct 30 04:14 ruling (OD:25-27), so the speed lead builds it after agreeing each reader's window.

**6. gov-m3-02-word-given-binds: FIX**

- Drop the question to Words about will-look. "will-look" with `firmness: "vague"` already exists (`purpose-arcs.json:110-113`, `:193-196`). scene.reply already carries keeps and firmness (`purpose-scene.ts:1088-1089`), and the journal already tells a vague promise (`journal.ts:627-631`).
- "Count me in" (agree) ends in `vote-given`, which keeps **favor-owed**, not a promise (`purpose-arcs.json:56-63`). Ask Words to change that ending.
- Drop the `legislature.give-word` trait decision. The colleague's answer is already chosen from memberPosition and favorWorth (`purpose-scene.ts:830-844`; `asks` yes/carried/no at `purpose-arcs.json:38-41`), so it would be a second chooser of the same answer. The trait-decisions ownership question is also moot: each row names its owner, and the legislature rows say `"OPUS-GOV"` (`trait-decisions.json:1142-1145`).
- The gap is real: a stall is not in the favor list (`vote-replies.json`), so a vague word leaves nothing.
- The stacking claim is wrong. voteAsk ids are unique per bill, chamber and member and are skipped if present (`legislature.ts:565-566`). Stacking happens within one scene: each reply round is its own scene.reply (`purpose-scene.ts:1035`), each puts a replies row (`legislature.ts:392-403`), and replyPull sums them all (`:469-486`). Fix the done-when to match.

**7. gov-m3-02-aide-estimate: FIX**

- Limit the eve estimate to the controlled person's aide, under the Speed rule. `briefBeforeVote` (`staff.ts:155`, `:1263`) runs for every member who has a staffer, and work rows are kept only for the player's circle (`staff.ts:877-879`).
- The player has no aide today: `play-officeholder-hires-aide` is open with no `lead:`, and the work order puts the aide in phase D. So the stopgap is the only route in play. Register it, and get that item a lead rather than leaving it under "Needs from the lane".

**8. gov-m3-02-two-stakes-in-a-played-world: FIX**

- whipCount is also read by `floor-every-bill.test.ts:32,161`, a test from the laws-side floor work (#6226). Rewrite it with the laws lead.
- `legislature.test.ts` is in all four M3 commands, so rewriting its learnStake asserts at :194-206 touches four specs.
- floorOf calls `placeOnAgenda` (`bench/legislature.ts:130-133`, which writes agendaItems at `modules/office-day.ts:319-339`) from seatView and billPaper. That is a read-only view creating facts. Fix it in the same change that replaces floorOf's whip.

**9. gov-m3-02-amend-and-endorsement-deals: FIX**

- The deal control is a dropdown with no amount (`bench/office.ts:290-311`, `controls.json:227-232`). An amend needs offerDeal's `amend.index` and `value` (`legislature.ts:3130`, `:3140-3145`). Say where the value comes from: the member's stated stake from the talk, never positionOn.
- `askForEndorsement` weighs the endorser's own views, "never for a price" (`campaigns.ts:4349-4404`). With the player as endorser it would decide for the player. The deal must record the player's own word, and it applies only where the colleague has a filing. R3 allows the player to offer it.

**10. gov-m3-02-acts-cite-deal-records: FIX**

- BillRow.deals entries have no id (`legislature.ts:233-252`; written at `:3150-3168`), so `dealId` does not exist.
- Mint one in offerDeal, using the counter the obligation id already uses (`:3173`).
- `gov-m3-02-deals-in-the-journal`'s done-when also assumes a "deal row".

**11. gov-m3-02-passes-in-five-places: FIX.** Same fixes as Unit 3. Also add the journal test file to the M3-02 command, which today lists three files; `gov-m3-02-deals-in-the-journal`'s done-when requires it.

**12. gov-m3-02-word-kept-or-broken: FIX**

- `vote-promise` is the cause of the vote-confirmed scene (`situation-types.json:3645-3655`, `director.json:1053`, `purpose-scene.ts:527`). Replacing the event needs Words to move that cause in the same PR.
- `SG-WORDS-recall-promise-record` is closed in `purpose-scene.ts` (that is the stopgap's own replacement text). This unit only supplies the record.

**13. Pledges join the store: KEEP.** Start after #6912 and door-yes-counted-split. Every pledge is kept by the Oct 30 08:15 ruling (OD:20-23).

**14. Co-sponsors on the bill: KEEP.**

- The path is `src/core2/modules/world-legislating.ts`.
- Add the copy at `:1366` to the list.
- The laws lead's branch `claude/gov-every-state-and-town-governs` touches this file too.

**15. Ask to co-sponsor: FIX.** An `askToCosponsor` with its own table would be a third ask engine beside carryAsks (`:311`, askToCarry `:2888`) and voteAsks (`:326`, askBeforeTheRoll `:502`). Use one ask record (voteAsks with `what: "vote" | "cosponsor"`) through Unit 16's askForVote.

**16. Ask a colleague any day: FIX**

- The id `vote-ahead:${bill.id}:${chamber}:${askedId}` and the skip at `:565-566` mean a chosen ask blocks the eve ask, and the reverse. The id needs the date.
- Drop the CTO question about who adds Talk to a colleague's card. The owner ruled "Clicking a person starts the talk; no Talk button" (OD:326).

**17. Close-vote stop: KEEP.** The path is `src/core2/modules/office-day.ts`: registerStopKinds `:84-88`, playerPresent `:420`, holdPlayerAt `:838`.

**18. Office-ahead reader: KEEP.** Same file path. It must not call placeOnAgenda.

**19. Governor appointment job-ends: KEEP, but off phase B's done-when.** It is a governor (phase F) defect. The stand-aside is at `swearing-in-scene.test.ts:149-157`.

**20. Path-check swearing in: KEEP.** `path-check.ts:301-305` moves on after a win without checking took-office.

**21-25. The booked calendar: KEEP, after M3 passes.**

- 21a: the laws lead's branch also edits `office-day-state.ts`.
- 24: there is no strike or protest record in `src/core2`.
- 25: there is no speech-invitation mechanic. The `invitedId` in campaigns is for volunteer offers (`campaigns.ts:2006-2025`).

**26. Expert dinners: KEEP the owner question.** The reading line holds on main (OD:123 and REG:956 are the only hits). Point the proposed default at the existing preparation engine (`prepareAct`/`preparedFor`, `modules/office-day.ts:1073-1105`) rather than a new store.

**Needs from others:**

- The People question is already answered by `people-chamber-plates` (open, lead cto). Cite it instead of asking.
- File pool items with `lead:` for:
  - the body's name on Your office (`play.mjs:1974`)
  - the raw act detail (`play.mjs:2028`)
  - the "Something needs you" fallback (`play.mjs:484-490`)

  None of the three has an item.

### Missing for "M3-01 and M3-02 pass in five drawn places"

1. **`gov-phase-in-weighed-once`** (existing, open, lead governing) is not on the list. It covers M3-01's phase-in clause.
2. **The seat drafts through the catalog's operation.** M3-01 names "subject, operation, applicable sections", but this is unproven on the player's path:
   - seatAct builds the provision by hand (`bench/legislature.ts:236-252`).
   - The draft card sends no operation (`play.mjs:2291-2305`).
   - `provisionFor(policyId, operation)` (`bill-catalog.ts:105-140`) is tested only in a small world (`legislature.test.ts:825-890`).
   - No pool item exists.

   Either add a unit (seatAct calls provisionFor; the lane adds the operation control) or show the clause met in Unit 3's clause table.

3. **Deal ids**, before Units 8 and 10.
4. **`GOLDEN_PATH_PLACE_KEY` read in all 8 M3 test files.**
5. **The M3-02 journal test in the command.** The journal already tells scene-ending promises (`journal.ts:604-640`). `officeActMoments` (`:649-690`) tells only town halls, interviews and votes, so no deal or obligation reaches the journal.
6. **A bench screenshot of each spec played in a drawn place**, plus the clause table, per the flip precedent.
7. **Verify before filing:** the planner dropped the phase B plan's Unit 23 (journal lines for your own bill's result and for a signing or veto). `director.json:1017` and `:1068` already map legislative-vote and executive-action events to moments. This is phase B scope, not part of the done-when.
