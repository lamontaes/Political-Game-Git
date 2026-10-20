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

**What.** The interview screen opens the interview through `interviewLines` (src/director/interview.ts): the reporter's open and each question are shown as spoken lines, and the player picks how to answer each one (plain, further, turn, brief, or the lie) from worded choices before the answers are passed to `answerInterview`. The choices are worded by the English engine from the mined interview bank, never typed into the screen. The player notices an interview that reads as a conversation with a reporter, not a form.

**Rules.** No hand-written player text: every line and choice comes from the English engine and the interview bank, the screen shows record data and control names. An effect is a read, not a record: the chosen move is passed to `answerInterview`, which the press engine reads when it prints the story.

**Done when.** In the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a candidate opens an interview from the screen, picks a move for each question, and the printed story's record id names the move chosen; a screenshot of the screen is in the PR body, and SG-PEOPLE-press-interview-conversation is closed.

**Files.** src/director/interview.ts, src/core2/modules/press.ts, src/core2/data/stopgaps.json

**Notes.** Follows people-words (PR #5180), which composes the lines. Closes SG-PEOPLE-press-interview-conversation.
