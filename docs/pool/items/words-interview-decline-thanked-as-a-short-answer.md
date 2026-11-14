---
id: words-interview-decline-thanked-as-a-short-answer
title: "After the player declines an interview or debate question, the reporter thanks them for a short, clear answer"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
source: "Account lead interview check, Nov 14, 2026 (train 04a2c7e4)"
root: none
claimed-at:
---

**What.** In the sitting the player picks "Nothing to add on that." and the reporter answers "Short and clear. Thanks." It reads as praise for an answer the player did not give. Seen at Cannonville, Utah (4910330), place seed 3a5884384393f00611b28a5ce609187c999d9b0f21d97ef4a4e9e0a15f724a08, Oct 1, 2025, William Smith's interview, screen /mnt/project-files/seen/interviews/cannonville-ut-b4c11bc5/10-sitting-q1-answered.png (project files). Seen: the reporter's line after a declined question in an interview or debate sitting.

**Cause.** Found in code: since #9152 (play-sitting-answer-reads-own-stand-on-record) the `brief` reply is the way not to answer and stores no position. The reporter's take after it still comes from the lines written for a short answer: `conversation.interview-take-brief-reply-take.short-and-clear-thanks` ("Short and clear. Thanks.") and `conversation.debate-take-brief-reply-take.short-and-clear-thank-you` in data/english/parts/conversation.json, with the other pieces under the moves `interview-take-brief-reply-take` and `debate-take-brief-reply-take`.

**Fix.** The Story session rewrites the pieces under those two moves as a reporter or moderator taking a pass on the question ("Fair enough. Moving on.", "Noted. Let's keep going."), or gives a decline its own take move that the sitting picks when the brief reply is chosen. Lines under data/english/parts/ are the Story session's alone, so this item only names the moves.

**Time box.** 1 hour.

**Rules.** People say how it feels, never the figure. Plain American English.

**Done when.** A second session declines a question in an interview and in a debate, at a drawn place and seed, and the line after it reads as a pass taken, never as thanks for an answer.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json
