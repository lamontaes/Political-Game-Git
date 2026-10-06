# Playing as a judge (bank id b13, phase P4)

## What the player experiences

Once someone appoints you, or the voters elect you where the state elects judges, cases land on your docket: a theft plea, a man asking to go home before trial, a landlord's eviction, a challenge to a law the town just passed. A case you choose to hear plays as a courtroom scene: the real people in that case stand in front of you and speak from their own records. The law's limits are said plainly ("the law requires at least 24 months for this"). You pick the ruling and the reason. The reasons on offer come from your own judicial outlook, so a strict reader of the text and a judge who looks at purpose are offered different reasons. Cases you don't want to hear are decided in the background the way you usually rule. The losing side may appeal, and real judges on the higher court can uphold or reverse you. Notable rulings show up in the local paper. The defendant, their family, the lawyers and the town remember, and it comes up again at your retention vote or in conversation.

## Owner decisions this rests on

- "Judge play: cases as scenes, rule within law and philosophy, appealed, reported, remembered."
- "Depth is optional for the player; background simulation handles what the player doesn't play." / "Constituents … most simulated in background from the office's usual approach."
- "Appointed paths: someone who knows and trusts you can appoint you."
- Owner, Sept 27 (missing list item 20): judges have integrity and philosophy, "you could have a Clarence Thomas, or you could have a John Marshall"; the court is not locked at nine.
- Ruling A103: "the judge picks the term inside" the real legal range for what was proven. Ruling A100: one "which court" function.
- Zero dice; personality is the lens and life decides the side.

## Existing code it must use

- `src/simulation/justice/court-reasoning.ts:67` `CourtCase`; `:439` `sentencingJudge` (rotates the docket, skips judges close to the defendant); `:513` `judgePrincipleConsideration`; `:545` `sentencingConsiderations`; `:652` `evaluateDetention`; `:752` `evaluateSentence` (`evaluateDecision`, `randomness: "none"`); `:818` `chosenReasons`.
- `src/simulation/justice/prosecution.ts:205` `sentenceDecisionForCase` (replays the saved `${caseKey}:sentence:trace`); `:772` `advanceProsecutions` (picks the judge at `:960-962`, detention at `:1182-1191`). Its plea rule is the model: "Nobody decides for the player." The player's plea is taken through `:1430` `enterPlea`. `:1311` `CourtCaseRecord`, `:1377` `courtCasesOf`.
- `src/simulation/justice/sentencing-term.ts:29` `sourcedCustodyBoundsForCase`, `:49` `evaluateCustodyTerm`.
- `src/simulation/living-world/town-rent.ts:2103` `trialJudge` (eviction hearings; `judgeLean` -1/0/1 at `:2097`).
- `src/simulation/judiciary/judicial-review.ts:121` `fileJudicialChallenge`, `:268` `reviewingCourt`, `:329` `justiceVotes` (reads principles, not philosophy), `:544` `applyJudicialReview`.
- `src/simulation/judiciary/court-for.ts:50` `courtFor`. `src/simulation/judiciary/types.ts:5` `JudicialCourtLevel` includes `local-intermediate` and `federal-appellate`.
- `src/simulation/judiciary/courts.ts:681` `seatHolderAt`; `:737` `vacantSeatsAt` has no callers; `:961` `seatJudge` has one caller, `governing/supreme-court-appointments.ts:989`.
- `src/simulation/judiciary/philosophy.ts:161` `recordJudicialPhilosophy` has no callers outside tests; `:33` `REVIEW_YEARS` is a placeholder. `types.ts:236` `JudicialPhilosophyRecord` (five outlooks plus rights by subject). `types.ts:166` `JudicialRetentionResultRecord` (`retentionResults` is always empty, `courts.ts:628`).
- Today's judge "work": `src/simulation/judicial-office-work.ts:77` `judicialOfficeContexts`, `:223`, `:439`, plus the authored bank `judicial-office-content.ts:20` `JUDICIAL_OFFICE_CONTENT`. Its start notice (`judicial-office-start.ts:23`) says it grants no "authority to decide cases". It is mounted at `src/player/JudicialOfficeWork.tsx` from `PlayerGame.tsx:4537`.
- Press: `src/simulation/press/desk.ts:1553` `eventIsNewsCandidate`, `:1821` `newsworthiness`.
- Scenes: Session 4's situation rows plus `src/presentation/english-composition.ts:215` `composeGroundedLine`.

## What to change

1. **The player's bench holds its decisions.** Wherever a judge is chosen (`advanceProsecutions` sentence and detention, `trialJudge` evictions, `justiceVotes`), check whether that judge is the controlled person.
   - If they are, do not evaluate. Leave the case pending on the player's docket, the same way `enterPlea` waits.
   - The player's ruling is saved under the same stable key (`${caseKey}:sentence:trace` and its siblings), so replay guards keep working.
   - The player sets how their chambers handle cases, the same way constituent mail works: hear it myself, or decide as I usually do (optionally per case kind). "As I usually do" runs the existing `evaluateSentence` (or its sibling) with the player as the actor, from their own principles and outlook.
   - Test: a seated player judge is never auto-sentenced, and a deferred case is decided from the player's own considerations.
2. **Outlook recorded and read.**
   - Call `recordJudicialPhilosophy` inside `seatJudge` for every new judge, the player included, built from their life records.
   - Add outlook considerations to `sentencingConsiderations` (the `criminal-procedure` right), to `evaluateDetention`, and to `justiceVotes`' `considerationsFor` (`deference` toward the legislature, `precedent` toward the weight of precedent rows).
   - Replace `REVIEW_YEARS` with changes drawn from the judge's own record. Coordinate with queued Q2 part 6 (judge integrity) on the same files: b13 owns outlook, Q2 owns recusal and conflicts.
3. **Courtroom situation rows (data for Session 4).**
   - Context: the case record, the parties present (defendant, the complainant or landlord, counsel where recorded), the law's bound from `mandatoryJailUnderLaw` / `sourcedCustodyBoundsForCase`, and pending matters.
   - Choices are the same decision's options (probation or jail, then a term inside the bounds; release or hold; eviction outcomes; the law stands or is struck). Each ruling's reason is picked from the player's own supporting considerations.
   - Every line goes through `composeGroundedLine`.
   - Delete `JUDICIAL_OFFICE_CONTENT` and its responses, with `Replaces:` lines. Keep `judicialOfficeContexts` only as the "is this person on a bench" check, reading the seat tenure.
4. **Appeals.** New `src/simulation/justice/appeals.ts`, in the one court engine.
   - After a conviction, sentence or eviction judgment, the losing party decides whether to appeal through `evaluateDecision`. Their considerations come from their means, the size of the outcome, the evidence strength, and whether the ruling sat at the edge of the law's range. An acquittal cannot be appealed.
   - The court above comes from `courtFor(…, "local-intermediate" | "local-highest" | "federal-appellate", …)`. Each seated judge votes affirm, reverse or send back, with considerations: was it inside the law's bounds, the precedent rows, their outlook.
   - A reversal is recorded on the case and on the trial judge.
   - Test: an out-of-bounds sentence is reversed; an in-bounds one is affirmed.
5. **Reported and remembered.**
   - Sentences are already public (`prosecution.ts:482` defaults follow-ups to public; referral and declined-charge events stay private at `:370`, `:841`, `:915`, which is correct). Make detention rulings, eviction judgments, reversals and law reviews public too, and tag each with the court office, so `newsworthiness` scores them as public-office news and the existing "Courts and public safety reporter" (`press/outlets.ts:291`) picks them up. No new news path.
   - Parties and their households get knowledge and a relationship interaction through `recordEventKnowledge` / `recordRelationshipInteraction`, which official views then read.
   - Test: an eviction ruling creates knowledge for the tenant's household and a desk lead in the local outlet.

## Must NOT build

- A second court engine, verdict calculator or appeal odds.
- Any dice or fixed reversal rate.
- Authored case lists or dialogue banks (case facts come only from crime, prosecution, rent and law-review records).
- A judge-selection system. Appointment is Session 23 part 3; judicial and retention elections are Session 13.
- A daily docket tick: cases move on their existing due dates.
- Single-state special cases.

## Done when (proof in a played game)

- In a new game in a random state with a player seated on a general trial court (a test fixture through `seatJudge` until Session 23 lands), the docket shows real pending cases.
- One case plays as a scene: the law's floor is said in words, the player sentences inside the bounds, and the decision trace is saved under the case key.
- A second case is deferred and decided from the player's outlook.
- An appeal is filed by a named party and decided by named appellate judges.
- The local paper runs the ruling, and the defendant's household holds knowledge of it.
- Tests: `justice/appeals.test.ts`; `prosecution` player-bench test; `philosophy` read test; a `judicial-review` test showing outlook changes a vote.

## Depends on

- Session 4 (scene rows and the consumer).
- Session 23 part 3 (player appointments) and queued Q7 (seated courthouses everywhere) for real paths onto the bench.
- Session 13 (judicial and retention elections).
- Queued Q2 part 6 (judge integrity).

## Open questions for the owner

None. Which cases play follows the constituent rule he already gave: the player decides how their office handles them, and the rest run in the background from their usual approach.
