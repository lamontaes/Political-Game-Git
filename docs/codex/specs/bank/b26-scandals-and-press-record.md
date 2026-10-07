# Scandals and your press record (bank id b26, phase P2)

## What the player experiences

Your town has a reporter who knows you. She calls for a quote when a story names you, reads your filings, and remembers how you treated her: the times you called back, the times you lied, the time you went after her paper in public. When something real comes out (misused campaign money, a lie caught on the record, an old arrest, a vote that contradicts what you promised), she calls, and you choose: deny it, apologize, attack whoever is behind it, go quiet, or resign. Lying is always one of the choices, and it is recorded. How it lands is not a number the game picks. Each person who hears about it judges it from what can actually be proved, who is reporting it, how they feel about you and that paper, and what kind of person they are. Your oldest supporters may forgive an apology that people who never liked you won't. A denial that later collapses costs far more than the truth would have. Other officials face the same choices and handle them in their own ways. Some ride it out, and some resign before the vote.

## Owner decisions this rests on

- "Scandals: deny, apologize, attack the source, go quiet, resign; lands by what's provable, who's reporting, relationships."
- "Local reporter knows you, calls for quotes, digs into your record, remembers how you treated them."
- "Lies: recorded; found out by anyone with contradicting facts; damage by who and their personality."
- "Opinion: word of mouth and local paper at council; real polls higher up."
- Register OCD-PRESS-003: reporter familiarity affects willingness to talk "without guaranteeing favorable reporting"; "'Off the record' is not a magic privacy button."
- Constitution #17: major scandals "must be causally grounded rather than arbitrary spectacle." No fixed percentages.

## Existing code it must use

- Matters and responses: `src/simulation/press/records.ts:204` `MATTER_RESPONSES` (deny, acknowledge, decline-comment, cooperate, contest, resign, call-for-resignation…); `:391` `MatterResponseRecord`; `:332` `MatterRecord` (null occurrence means the allegation is false).
- Three separate player answer sets, to be unified:
  - `press/views.ts:61` `PressAnswerChoice` (deny / confirm / false-denial / false-confirmation / decline) and `:289` `pressAnswerOptions`;
  - `presentation/office-response.ts:36` `OfficeAnswerKind` (explanation, defense, cooperation, resignation) and `:246` `answerForOffice`;
  - `press/matters.ts:1587` `respondToComplaint` (counsel or no response).
- Resignation: `governing/office-consequence.ts:145` `recordOfficeConsequence`; `:364` `resignationImportance` (placeholder tiers).
- Calls for quotes: `press/desk.ts:417` `needsSubjectResponse`, `:434` `requestSubjectResponse`, `:521` `recordSubjectResponse`, `:732` `produceNonPlayerResponses`, `:920` `editorialDecision`, `:286` `assignStory`. `:1985` `chooseReporter` prefers a reporter who covered the subject before, but there is no relationship record.
- How it lands today: `press/findings.ts:45` `UNRESEARCHED_FINDING_EFFECTS` (fixed 300/150 basis-point support loss, a 6-year memory) applied by `finding-consequences.ts:44` through `campaign-support.ts:327` `applyFindingSupportLoss`; `findings.ts:92` `rememberedAdverseFindingsAgainst`; `:136` `repeatOffenseMultiplier`.
- Reactions by others: `press/responses.ts:161` `produceMatterResponses` (party, staff, contacts; colleagues capped at 6 at about `:150`).
- Lies: `press/caught-lying.ts:36` `produceCaughtLyingLeads`; `claim-contradictions.ts:96`; `presentation/lie-marker.ts:25`.
- Hearing the news: `press/story-exposure.ts:53` `recordStoryHeardExposure` (law stories only today); `records.ts:154` `recordEventKnowledge`.
- Views the elections read: `living-world/official-views.ts:168` `officialViewReflectionHandler`; `election-contests.ts:177` `countRecordedVoterBallots` (Session 24).
- Interview and desk UI (replacement targets under Session 4's spec): `player/PressDeskPanel.tsx`, `player/PressInterviewPanel.tsx`, `press-interviews.ts:165` `arrangePressInterview`.

## What to change

1. **One answer, five real choices.**
   - New `respondToMatter(world, {matterId, personId, response, meaning})` in `press/responses.ts` writes one `MatterResponseRecord`.
   - Add `apologize` and `attack-source` to `MATTER_RESPONSES`. `go quiet` is `decline-comment` plus cancelling the person's public appearances until they choose otherwise. `resign` calls `recordOfficeConsequence`.
   - A false denial or false attack is also a recorded claim with intent deceive.
   - `PressAnswerChoice`, `OfficeAnswerKind` and `respondToComplaint` become thin callers, with `Replaces:` lines.
   - NPC subjects choose from the same five through `evaluateDecision`: their traits, what can be proved against them, party calls, and the next election.
2. **The reporter call is a scene.** When `requestSubjectResponse` reaches the player, Session 4 composes a situation row: the reporter (a person) and the story's facts the reporter actually holds. The five choices are offered with Lie present, and every line goes through `composeGroundedLine`. The reply flows back through `recordSubjectResponse`.
3. **Press record between people, no new store.**
   - Every call answered or ducked, lie caught, attack, exclusive tip (`source-contribution`) and access given writes `recordRelationshipInteraction` between the reporter and the subject.
   - `chooseReporter`, `assignStory`, `editorialDecision` and the reporter's willingness to hold a story, run a response in full, or open a b15 inquiry into the subject all read that history as considerations. Familiarity never guarantees friendly coverage.
4. **How it lands, person by person.**
   - Extend `recordStoryHeardExposure` to matter stories. Each person who learns of one updates their view of the official through the existing official-view reflection, from:
     - provability: evidence links, the proceeding outcome;
     - who's reporting: the reader's relationship and party lean toward the outlet, and the outlet's record of corrections;
     - the response: an apology versus a lie later caught;
     - the reader's relationship with the official;
     - the reader's traits.
   - Word of mouth uses the existing tie paths.
   - Delete the fixed `supportLossBasisPoints`, `laterContestWeightPenalty`, the 6-year memory and `repeatOffenseMultiplier`, with `Replaces:` lines. Support follows views (Session 24 part 4 makes both election paths read them).
5. **Pressure to resign.**
   - `call-for-resignation` reactions from the official's own party and colleagues become considerations in the official's own resign-or-stay decision. Remove the colleague cap of 6: who reacts comes from who knows.
   - The player is never forced out except by law: conviction (`UNRESEARCHED_JAIL_EFFECTS`), or removal by a body's vote (an existing vote path, not built here).
6. **Remembered.** Matters, responses and caught lies stay on the person's record and in the Journal (Session 4 wording). People remember what they know, and rivals can cite it (Session 24). There is no fixed memory window.

## Must NOT build

- A scandal meter, scandal record store or fixed support loss.
- Dice.
- Authored scandals: every matter must point to a real recorded event (a misconduct occurrence, a crime record, a contradicted claim, a recorded remark).
- A new news engine or interview minigame.
- Dark events or parties (Session 25).
- Investigations (b15) or the misconduct acts themselves (b14).
- Single-place rules.

## Done when (proof in a played game)

- In a new game in a random town, a council player who misused campaign money, or whose lie was caught, gets a call from a named local reporter who covered them before. The player picks a response in a scene, and the story runs with that response.
- Ten named residents' views move, with printed reasons that differ by provability and by each resident's relationship and traits.
- The reporter's history with the player shows the call. After an attack, her next call reflects it.
- An NPC official in the same run resigns or stays, with reasons.
- Tests: `respondToMatter` (each of the five), an apology versus a caught false denial producing different view changes, the reporter-relationship read in `chooseReporter`, and the fixed constants gone.

## Depends on

- Session 4 (scenes, Journal wording).
- Session 24 (views feed both election paths; rivals cite the record).
- b14 and b15 (where matters come from).
- Session 21 (removal votes, if any).

## Open questions for the owner

1. Personal-life scandals (an affair, an old arrest, a hurtful remark caught on tape): include them from the start alongside money and lies, or add them later? (a) from the start, any real recorded event (recommended, and presentation filters can soften depiction); (b) money, lies and crimes first, personal life later.
