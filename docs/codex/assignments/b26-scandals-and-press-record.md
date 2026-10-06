# B26 Scandals and your press record: the reporter who knows you

Bank id b26 (spec file `b26-scandals-and-press-record.md`) · Phase P2 (Session 25 takes it after its parts and extends its records) · Unlocks step 9: "next election runs on the record" (views, not a penalty, carry a scandal).
Code checked at origin/main ec9a9601a.

## What the player experiences

Your town has a reporter who knows you. She calls for a quote when a story names you, reads your filings, and remembers how you treated her: the calls you returned, the lies, the time you went after her paper in public. When something real comes out (misused campaign money, a lie caught on the record, an old arrest, a vote that contradicts a promise, or something in your personal life that is on the record), she calls and you choose: deny it, apologize, attack whoever is behind it, go quiet, or resign. Lying is always one of the choices and is recorded. How it lands is not a number the game picks. Each person who hears judges it from what can be proved, who is reporting, how they feel about you and that paper, and what kind of person they are. Old supporters may forgive an apology that people who never liked you will not. A denial that later collapses costs far more than the truth would have. Other officials face the same five choices their own way. Presentation settings let the player soften how personal-life stories are depicted.

## Owner decisions it rests on

- "Scandals: deny, apologize, attack the source, go quiet, resign; lands by what's provable, who's reporting, relationships."
- "Local reporter knows you, calls for quotes, digs into your record, remembers how you treated them." "Lies: recorded; found out by anyone with contradicting facts; damage by who and their personality." "Opinion: word of mouth and local paper at council; real polls higher up."
- Owner ruling Oct 5: personal-life scandals are IN from the start, from real recorded events, with presentation settings to soften them. The fixed 300/150 basis-point scandal penalty is DELETED.
- OCD-PRESS-003: familiarity affects willingness to talk "without guaranteeing favorable reporting"; "off the record" is not a magic privacy button. Constitution #17: scandals "causally grounded rather than arbitrary spectacle."
- Zero dice. Nothing blank. One rule for all places. One writer per record kind. Delete what you replace.

## Existing code to extend (verified)

- `src/simulation/press/records.ts:204 MATTER_RESPONSES` (deny, acknowledge, correct-record, decline-comment, cooperate, contest, resign, request-explanation, defend, distance, maintain-support, call-for-resignation, no-action; no apologize or attack-source); `:332 MatterRecord`, `:391 MatterResponseRecord`.
- Three player answer sets to unify: `press/views.ts:61 PressAnswerChoice` and `:289 pressAnswerOptions` (used `views.ts:186,386`); `src/presentation/office-response.ts:36 OfficeAnswerKind`, `:246 answerForOffice` (called `:345`); `press/matters.ts:1587 respondToComplaint` (called `player/PressDeskPanel.tsx:420`). `office-response.ts:345` is the live caller of `governing/office-consequence.ts:145 recordOfficeConsequence`; `:364 resignationImportance` is private (spec said exported) and uses placeholder tiers.
- Reporter call: `press/desk.ts:417 needsSubjectResponse`, `:434 requestSubjectResponse`, `:521 recordSubjectResponse`, `:732 produceNonPlayerResponses`, `:920 editorialDecision`, `:286 assignStory`, `:1985 chooseReporter` (private; prefers a reporter who covered the subject; no relationship read). Relationship writer is `src/simulation/records.ts:233 recordRelationshipInteraction`.
- How it lands today, to delete: `press/findings.ts:45 UNRESEARCHED_FINDING_EFFECTS` (`supportLossBasisPoints` 300/300/150, `laterContestWeightPenalty` 90, `memoryDays` 6 years), `:92 rememberedAdverseFindingsAgainst`, `:136 repeatOffenseMultiplier`. Readers the spec missed, all must change: `src/simulation/campaign-support.ts:327 applyFindingSupportLoss` (calls the multiplier at :351; caller `press/finding-consequences.ts:57`), `record-in-office.ts:115`, `campaign-opponents.ts:1199`, `campaign-life-activities.ts:1375`, and `governing/finding-restitution.ts:233` (uses the multiplier for civil penalties: keep escalation there only if it reads the person's actual prior findings, else drop).
- Reactions: `press/responses.ts:161 produceMatterResponses`; colleague cap of 6 at `:151`. Lies: `press/caught-lying.ts:36 produceCaughtLyingLeads` (files `cost-of-being-caught-lying`, still unanswered), `src/simulation/claim-contradiction-routes.ts` and `press/claim-route.ts` (the spec's press/claim-contradictions.ts does not exist); `src/presentation/lie-marker.ts:13-25`.
- Hearing the news: `press/story-exposure.ts:53 recordStoryHeardExposure` (callers `press/read-publication.ts:88`, `desk.ts:1304`); `living-world/official-views.ts:168 officialViewReflectionHandler`; `election-contests.ts:177 countRecordedVoterBallots`. Conviction: `justice/prosecution.ts:152 UNRESEARCHED_JAIL_EFFECTS`.
- Personal-life sources that exist: crime records (`crime/producer.ts`, `crime/journal.ts`: an old arrest), claims (`records.ts:180 recordClaim`), couple events (`couples.ts endCouple`). No affair or recorded-remark event exists, and cheating is banked in b21: do not invent one. UI replacement targets under Session 4: `player/PressDeskPanel.tsx`, `player/PressInterviewPanel.tsx`, `press-interviews.ts:165`.
- Newer code covering part: none (no apologize or attack-source anywhere in src).

## Build steps (each is one PR)

1. **One answer, five real choices.** `respondToMatter(world, {matterId, personId, response, meaning})` in `press/responses.ts` writes one `MatterResponseRecord`. Add `apologize` and `attack-source` to `MATTER_RESPONSES`; "go quiet" is `decline-comment` plus cancelled public appearances until the person chooses otherwise; "resign" calls `recordOfficeConsequence`. A false denial or attack is also a recorded claim with intent deceive. `PressAnswerChoice`, `OfficeAnswerKind` and `respondToComplaint` become thin callers (delete the duplicated lists; `Replaces:` lines). NPC subjects choose the same five through `evaluateDecision` from traits, what can be proved, party calls and the next election.
2. **The reporter call is a scene.** When `requestSubjectResponse` reaches the player, Session 4 composes a situation row: the reporter and only the facts she holds, five choices with Lie present, every line through `composeGroundedLine`; the reply flows back through `recordSubjectResponse`.
3. **Press record between people, no new store.** Every call answered or ducked, lie caught, attack, exclusive tip and access given writes `recordRelationshipInteraction` between reporter and subject. `chooseReporter`, `assignStory`, `editorialDecision` and the reporter's willingness to hold a story or open a b15 inquiry read that history as considerations. Familiarity never guarantees friendly coverage.
4. **How it lands, person by person.** Extend `recordStoryHeardExposure` to matter stories. Each person who learns of one updates their view through `officialViewReflectionHandler` from: provability (evidence links, proceeding outcome), who is reporting (reader's relationship and lean toward the outlet, its corrections record), the response (apology versus a lie later caught), the reader's relationship with the official, the reader's traits. Word of mouth uses the existing tie paths. Delete `UNRESEARCHED_FINDING_EFFECTS`, `applyFindingSupportLoss`, `repeatOffenseMultiplier`, and the memory window, and repoint all five readers above to views. Support follows views (Session 24 part 4).
5. **Personal-life matters.** Allow a matter whose occurrence is a recorded personal event (an arrest on record, a recorded breakup or claim, a recorded remark). Add a presentation setting `personalLifeDepiction` (full, softened, summary-only) read only by the story-voice and journal text; it never changes what the world knows or how people judge.
6. **Pressure to resign.** `call-for-resignation` reactions from the official's party and colleagues become considerations in the official's own resign-or-stay decision; remove the cap of 6 (who reacts comes from who knows). The player is forced out only by law (conviction, or a body's removal vote through an existing path).
7. **Remembered.** Matters, responses and caught lies stay on the person's record and in the Journal; no fixed memory window; rivals can cite them (Session 24).

## Must not build

A scandal meter, store or fixed support loss; dice; authored scandals (every matter points to a real recorded event); a new news engine or interview minigame; dark events or parties (Session 25); investigations (b15); the misconduct acts (b14); an invented affair or remark event; single-place rules.

## Research tables

In repo: `docs/research/requests/how-far-a-scandal-travels.json` (open: who covers what) and `what-opens-a-scandal-about-somebody-else.json` (answered: broaden eligible actors, no quota; allegation, evidence and finding stay separate). No numbers are needed: effects come from views and records. If a view-shift size is wanted, it is the existing reflection's strength; add no constant.

## Done when

New game, random town, council player who misused campaign money or whose lie was caught gets a call from a named local reporter who covered them before; the player picks a response in a scene and the story runs with it. Ten named residents' views move with printed reasons that differ by provability, relationship and traits. After an attack the reporter's next call reflects it. An NPC official in the same run resigns or stays with reasons. A personal-life matter from a real arrest record runs, and the depiction setting changes only its wording. Tests: `respondToMatter` (each of five), apology versus caught false denial gives different view changes, reporter history read in `chooseReporter`, and a grep test that `supportLossBasisPoints`, `laterContestWeightPenalty`, `memoryDays`, `repeatOffenseMultiplier` and the cap of 6 are gone.

## Proof to post

Under `docs/codex/evidence/b26-scandals-and-press-record/`: scene screenshots (call, five choices), printed view records for ten residents with reasons, the reporter's relationship history before and after, the NPC resign-or-stay trace, softened versus full wording of one personal matter.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: none (personal-life scandals were ruled in). Open items, each with its switch:

- Softening levels: data rows on `personalLifeDepiction`; the default is a setting, not code.
- Whether civil-penalty escalation keeps a repeat factor: one function `priorFindingsFor(person)` feeds it; delete the call if the answer is no.
- If Session 4 scenes or Session 24 view readers have not landed: steps 1, 3, 4, 5 (data side), 6, 7 now; step 2 uses a stubbed `reporterCallScene(matter)` the scene system replaces.

## Standing rule (owner, Oct 5)

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
