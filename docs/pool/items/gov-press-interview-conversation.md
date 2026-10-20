---
id: gov-press-interview-conversation
title: "Press interview as a director conversation: the reporter's questions as lines and the four moves as the player's choices (SG-PEOPLE-press-interview-conversation)"
area: words
kind: wiring
priority: 3
size: M
status: claimed
claimed-by: claude/press-interview-conversation
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:45:25.633Z
---

**What.** An interview's answers carry the conversation's moves (plain, further, turn, brief) and the lie as record data, but the screen does not open the interview through the director's conversation, so the player cannot see the reporter's questions as spoken lines or choose a move from worded choices. Open an interview as a director conversation subject: the reporter asks each question as a line, the four moves and the lie are the player's choices, and the chosen move is passed to answerInterview in src/core2/modules/press.ts.

**Rules.** No hand-written player text (words come from the English engine); replace never layer; an effect is a read; no dice.

**Done when.** SG-PEOPLE-press-interview-conversation resolved in stopgaps.json; in a played year in a drawn place a player interview runs as a conversation and the chosen move reaches answerInterview, printed story and readers named by record id.

**Files.** src/core2/modules/press.ts, src/director

**Notes.** TODO
