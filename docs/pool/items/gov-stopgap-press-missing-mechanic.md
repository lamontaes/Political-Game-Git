---
id: gov-stopgap-press-missing-mechanic
title: "Stopgaps in press (missing-mechanic): 4 open"
area: gov
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-press-enroll
pr: #5273
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/press.ts, kind missing-mechanic"
claimed-at: 2026-10-19T23:22:30.405Z
---

**What.** Replace or clear the 4 open missing-mechanic stopgap row(s) in src/core2/modules/press.ts: SG-PEOPLE-press-interview-conversation, SG-PEOPLE-press-favors-and-leaks, SG-PEOPLE-press-endorsements, SG-PEOPLE-press-employer-enrollment. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/press.ts

**Notes.** First row: An interview's answers carry the conversation's moves (plain, further, turn, brief) and the lie as record data, but the screen does not yet open the interview through the director's conversation, so the player cannot see

Oct 20 (claude, claude/political-game-pool-76ksvw): SG-PEOPLE-press-interview-conversation is resolved by the interview screen (`people-interview-screen`, #5180); its marker in `press.ts` is removed. Three rows remain here: favors-and-leaks, endorsements and employer-enrollment (and the outlet-revenue row elsewhere).

Oct 20 (claude, claude/political-game-pool-76ksvw): SG-PEOPLE-press-endorsements is resolved. In the run-up to a contest each outlet's head endorses once the candidate they agree with most (never when none beats their own lean), and the outlet's followers are reached by it as cause rows. Played world: Bellingham, Massachusetts (2504965), run seed pe1:0, 9 endorsements, a follower reached by the head's act (`src/core2/press-endorsements.test.ts`). The endorsement is not printed as a story yet, and the owner's and the head's regard for each candidate are not inputs (only the head's views and traits). Two press rows remain here: favors-and-leaks, and employer-enrollment (claimed by claude/pool-press-enroll). I did not claim this item: its claim is another session's, so these edits touch `press.ts` beside theirs.

SG-PEOPLE-press-favors-and-leaks, looked at Oct 20 (claude): not built, and a question for the owner rather than a feature. Neither favors-to-reporters nor leaks appear in `docs/roadmap/political-process-baseline.md` or in a ruling in `OWNER-DECISIONS.md` or the register (the register cuts "favors" as a chore, a different thing), and the golden path does not need them. Under "this is a game, not a spreadsheet" a real-world step the game lacks is a question, so the row stays open until the owner says whether a candidate leaking a story, or doing a reporter a favor, belongs in the game; if not, the row is resolved by deleting the feature (its marker in `press.ts`, which is the only place it lives), with his say.
