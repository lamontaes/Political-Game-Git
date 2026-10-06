# Playing as a judge: cases as scenes, rulings within the law and your outlook (bank id b13, phase P4 build; unlocks the judicial path of the 1.0 office ladder and the "courts strike down laws" half of governing)

Verified against origin/main 47c2ecb0e (Oct 6). Bank spec: docs/codex/specs/bank/b13-judge-play.md. Extends the one court engine under src/simulation/justice and src/simulation/judiciary (federal, state and local share it; Register: one "which court" function, `courtFor`).

## What the player experiences

Once you are on a bench (appointed, or elected where the state elects judges), cases land on your docket: a theft plea, a man asking to go home before trial, a landlord's eviction, a challenge to a law the town just passed. You choose how your chambers work: hear every case yourself, or decide the kinds you pick "as I usually do". A case you hear plays as a courtroom scene with the real people in it speaking from their own records, and the law's limits are said in plain words ("the law requires at least 24 months for this"). You choose the ruling and the reason, and the reasons on offer come from your own outlook, so a strict reader of the text and a judge who weighs purpose are offered different ones. The loser may appeal; named judges above you uphold, reverse or send it back. Notable rulings reach the local paper. The defendant, the family, the lawyers and the town remember it, and it returns at your retention vote or in conversation.

## Owner decisions it rests on

- "Judge play: cases as scenes, rule within law and philosophy, appealed, reported, remembered."
- "Depth is optional for the player; background simulation handles what the player doesn't play." Constituents: "player decides how their office handles them"; the rest runs in the background.
- Sept 27: judges have integrity and philosophy, "you could have a Clarence Thomas, or you could have a John Marshall"; the court is not locked at nine.
- A103: "the judge picks the term inside" the real legal range for what was proven. A100: one "which court" function.
- Fixed: zero dice; nothing blank or placeholder (estimate from similar places, mark it); one rule for all 50 states, D.C. and territories; emergent not authored; real data calibrates the start only; one writer per record kind; delete what you replace.

## Existing code to extend (verified on 47c2ecb0e)

- `justice/court-reasoning.ts`: `CourtCase` :67, `sentencingJudge` :439 (rotates `judges[turn % n]`, skips judges close to the defendant), `judgePrincipleConsideration` :513, `sentencingConsiderations` :545, `evaluateDetention` :652, `evaluateSentence` :752 (`randomness: "none"`), `chosenReasons` :818.
- `justice/prosecution.ts`: `sentenceDecisionForCase` :206 (private; replays the saved `${caseKey}:sentence:trace`; called :1057), `advanceProsecutions` :772 (judge picked :962; detention :1182-1191), `referForProsecution` :335, `CourtCaseRecord` :1311, `courtCasesOf` :1377, `enterPlea` :1430 (the model: nobody decides for the player; callers `presentation/legal-record.ts:155`, `player/LegalRecord.tsx:91`). Also :651 binds a court from a judge's saved trial-seat tenure (reuse its tenure check).
- `justice/sentencing-term.ts:29 sourcedCustodyBoundsForCase`, `:49 evaluateCustodyTerm`. Newer, covers detention money only: `justice/pretrial.ts`, `justice/cash-bail.ts` (bail amounts and refunds; the hold/release decision is still `evaluateDetention`).
- `living-world/town-rent.ts:2103 trialJudge` (first seat holder with a person record; eviction hearings), `judgeLean` -1/0/1 at :2097/:2178.
- `judiciary/judicial-review.ts`: `fileJudicialChallenge` :121, `reviewingCourt` :268, `considerationsFor` :275 (precedent rows + the justice's own principles only), `justiceVotes` :329, `applyJudicialReview` :544. `judiciary/court-for.ts:50 courtFor` (levels include `local-intermediate`, `local-highest`, `federal-appellate`).
- `judiciary/courts.ts`: `seatHolderAt` :681, `vacantSeatsAt` :737 (no callers), `seatJudge` :961 (one caller: `governing/supreme-court-appointments.ts:989`; nothing seats a judge for the player or a local bench), `retentionResults: []` :628 (always empty; Session 13 owns elections).
- `judiciary/philosophy.ts:161 recordJudicialPhilosophy`: no caller outside tests. :33 `REVIEW_YEARS = 3` is marked `PLACEHOLDER(overnight)`: owner-banned, must go. Types: `JudicialPhilosophyRecord` (five axes: reading, deference, federalism, rights, precedent; rights by seven subjects) in `judiciary/types.ts`.
- Today's judge "work": `judicial-office-work.ts:77 judicialOfficeContexts` and :195-726 receivers, authored bank `judicial-office-content.ts:20 JUDICIAL_OFFICE_CONTENT`, start notice `judicial-office-start.ts:24` (grants no "authority to decide cases"), mounted by `player/JudicialOfficeWork.tsx` from `player/PlayerGame.tsx:4537`.
- The controlled person: `world.control.kind === "person"` and `world.control.personId` (the pattern at `local-elections.ts` `played`; `controlledPersonId` in `press-interviews.ts:1170` is private, do not copy it: add one exported helper beside `courtFor` and use it everywhere).
- Chambers setting model: `types.ts:5122 OfficeCaseworkWorkflowMode` (three modes) and the `caseworkMode` preference record at :5184. Reuse the record kind, add a bench variant; no second preference store.
- News: `press/desk.ts:1553 eventIsNewsCandidate`, `newsworthiness`; reporter "Courts and public safety reporter" `press/outlets.ts:291`. Scenes: Session 4 situation rows and `presentation/english-composition.ts:215 composeGroundedLine`.
  Corrections to the bank spec: every cite above checks out; it missed that `seatJudge` has no local-bench or player caller at all (so a fixture is needed), and that `evaluateDetention` now sits beside the bail files.

## Build steps (one PR each, in this order)

1. **The player's bench holds its decisions.** Files: `prosecution.ts`, `town-rent.ts`, `judicial-review.ts`, one helper in `judiciary/court-for.ts`. At the three judge picks (sentence :962, detention :1182, `trialJudge`, and each `justiceVotes` seat) if the judge is the controlled person, do not evaluate: leave the case pending on the docket (as `enterPlea` waits). The ruling is saved under the same stable keys (`${caseKey}:sentence:trace` and siblings) so replay guards keep working. Add the chambers setting (hear it myself, or decide as I usually do, per case kind); "as I usually do" runs the existing evaluate function with the player as actor. Must not: auto-sentence a seated player; add a case queue outside `courtCasesOf`.
2. **Outlook recorded and read.** Call `recordJudicialPhilosophy` from `seatJudge` for every judge seated (player included) built from their life records. Add outlook considerations to `sentencingConsiderations` (right: criminal-procedure), `evaluateDetention` and `considerationsFor` (`deference` toward the legislature, `precedent` toward the weight of precedent rows) using the one ordinal importance table the decision engine already has. `Replaces:` `REVIEW_YEARS` and its PLACEHOLDER comment: a philosophy changes when the judge's own recorded rulings and life events cross the axis, not on a timer. b13 owns outlook; queued Q2 part 6 owns recusal and conflicts (same files: land after it or rebase on it).
3. **Courtroom scenes.** Situation rows for Session 4: parties present, the law's bound from `sourcedCustodyBoundsForCase`/`mandatoryJailUnderLaw`, pending matters; choices are the same decision's options (probation or jail then a term inside the bounds; hold or release; eviction outcomes; law stands or struck), each with a reason taken from the player's own considerations. Every line through `composeGroundedLine`. `Replaces:` `JUDICIAL_OFFICE_CONTENT`, its receivers in `judicial-office-work.ts`, `JudicialOfficeWork.tsx`'s authored responses and the "no authority to decide cases" text for seated judges. Keep `judicialOfficeContexts` only as the "is this person on a bench" check reading the seat tenure.
4. **Appeals** in new `justice/appeals.ts`. After a conviction, sentence or eviction judgment the losing side decides through `evaluateDecision` (means, size of the outcome, evidence strength, whether the ruling sat at the edge of the range). An acquittal cannot be appealed. The court above is `courtFor(..., "local-intermediate" | "local-highest" | "federal-appellate", ...)`; each seated judge votes affirm, reverse or send back from: inside the law's bounds, precedent rows, their outlook. A reversal is recorded on the case and on the trial judge. Same module serves federal, state and local. Must not: a reversal rate or appeal odds.
5. **Reported and remembered.** Make detention rulings, eviction judgments, reversals and law reviews public events tagged with the court office so `newsworthiness` and the existing courts reporter pick them up (referral and declined-charge events stay private, correct as is). Parties and households get knowledge and a relationship interaction (`recordEventKnowledge`, `recordRelationshipInteraction`). Retention: build the reading function only; Session 13 writes `retentionResults`.

## Must NOT build

A second court engine, verdict calculator or appeal odds; any dice or fixed reversal rate; authored case lists or dialogue banks (facts come from crime, prosecution, rent and law-review records); a judge-selection system (appointment is Session 23 part 3, elections Session 13); a daily docket tick (cases move on their due dates); single-state cases; a new news path.

## Research tables

None new: bounds come from `data/research/justice/sentencing-ranges-2026.json` and precedent rows from `data/research/laws/judicial-review-precedents-2026.json`. If a place has no appellate court row, `courtFor` already returns null and the case stays final; do not invent a court. No source exists for how judge philosophy changes; derive from records, do not cite one.

## Done when (played-game proof)

New game in a random state; player seated on a general trial court by a test fixture through `seatJudge` (until Session 23). Docket shows real pending cases. One case plays as a scene with the floor said in words, the sentence inside the bounds, the trace saved under the case key. A second is deferred and decided from the player's outlook. A named party appeals; named appellate judges vote with printed reasons. The paper runs the ruling; the defendant's household holds knowledge. Same save, same answers. Repeat in a territory or D.C. place. Tests: `justice/appeals.test.ts` (out-of-bounds reversed, in-bounds affirmed), a prosecution player-bench test (never auto-sentenced), `philosophy` read test, a `judicial-review` test (outlook changes a vote), an eviction knowledge-plus-desk-lead test, grep test that `JUDICIAL_OFFICE_CONTENT` and `REVIEW_YEARS` are gone.

## Proof to post

Per PR: random place and seed, the printed docket, the scene's printed options and reasons with record ids, the decision trace key, appeal votes, the news lead and knowledge rows, the delete list for each "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
Switches kept: (1) bench handling default for each case kind = one data row (default: hear sentencing and detention myself, decide evictions as usual); (2) whether a deferred case can be reopened by the player = one boolean row; (3) until Session 23 lands, the player reaches the bench only through the fixture; the "seated" check reads tenure so the real path plugs in unchanged. No open owner questions.
