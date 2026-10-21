---
id: gov-press-interview-conversation
title: "Press interview as a director conversation: the reporter's questions as lines and the four moves as the player's choices (SG-PEOPLE-press-interview-conversation)"
area: words
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr: #5602
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** An interview's answers carry the conversation's moves (plain, further, turn, brief) and the lie as record data, but the screen does not open the interview through the director's conversation, so the player cannot see the reporter's questions as spoken lines or choose a move from worded choices. Open an interview as a director conversation subject: the reporter asks each question as a line, the four moves and the lie are the player's choices, and the chosen move is passed to answerInterview in src/core2/modules/press.ts.

**Rules.** No hand-written player text (words come from the English engine); replace never layer; an effect is a read; no dice.

**Done when.** SG-PEOPLE-press-interview-conversation resolved in stopgaps.json; in a played year in a drawn place a player interview runs as a conversation and the chosen move reaches answerInterview, printed story and readers named by record id.

**Files.** src/core2/modules/press.ts, src/director

**Notes.** TODO

Sent back 2026-10-20 from PR #5602 (branch claude/press-interview-conversation): adds src/director/press-interview.ts and its test (Words-session area per the merger skill) and a dated 'Done Oct 20' note in the stopgap resolution text; finish on that branch, merge main into it first.
