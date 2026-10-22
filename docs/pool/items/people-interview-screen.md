---
id: people-interview-screen
title: "The interview opens as a conversation on the screen: the reporter's lines, the player picks a move from worded choices"
area: play
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by:
pr: #5180
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: people-words
source: added with npm run pool -- add
claimed-at:
---

**What.** The core already runs an interview from the player's side: `requestInterview` arranges one with an outlet, `interviewQuestions` (`src/core2/modules/press.ts`) picks the questions a reporter would ask from the player's record (broken promises, votes, where they are weakest with the audience), and `answerInterview` takes a position and a move for each question (plain, a further fact from the record, turning it back on a rival, brief, or the lie) and prints the result. The bench only has an outlet picker (`src/bench/play.mjs`, `interviewOutlet`); no screen asks the questions. Build the screen: the reporter's line for each question, worded by the English engine from the interview bank (`data/english/parts/interview.json`, reporter ask move), and the player's reply chosen from worded choices for the moves, with a stance control; picking one calls `answerInterview` and the screen shows the printed result.

**Rules.** No hand-written player text: the reporter's lines and the choices come from the English engine and the control data; the screen shows record data and control names. Look before you ask: the conversation shape is the owner's ruling (four replies ranked by traits, lies as the same moves made false, "say nothing" beside them) in `docs/coordination/OWNER-DECISIONS.md`; quote it. Ask why: each question cites the record it rests on (the promise, the vote). The player's choices are the player's: nothing is answered for them. Read-only screens spend no game time; answering an interview does.

**Done when.** In a played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) a player who holds office or filed for a race is offered an interview, sees each question worded with the record it rests on, answers with a chosen move, and the outlet's printed story names the answers; a test in `src/bench/` posts the choices through the bench API and checks the result by interview and statement record ids. The owner plays it: sits for a reporter's questions and chooses how to answer each.

**Files.** src/bench/play.mjs, src/bench/dev-api.ts, src/core2/modules/press.ts, data/english/parts/interview.json

**Notes.** Written Oct 20 (claude/interview-screen-spec) from the code; `after: people-words` still applies. The core's stopgap `SG-PEOPLE-press-interview-conversation` is marked in `answerInterview`; this item is where it is resolved or kept with a reason.
