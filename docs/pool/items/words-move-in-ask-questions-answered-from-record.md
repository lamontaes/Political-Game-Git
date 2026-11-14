---
id: words-move-in-ask-questions-answered-from-record
title: "Moving in together: the questions in the talk are answered from a record"
area: director
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
root: design-words-machine
source: Rule 108 (Words lead, Nov 14); found on train 8bb1ff9d by the door scenes builder (PR #9288), for the Account lead to route
---

**What.** In the move-in-ask talk (asking a partner to move in), three asking lines have no answer from a record: "Yes. When?" is answered by a thank line with no date, "What brought this on?" by "Nothing happened. I just like coming home to you..." with no fact, and the plea "I thought we wanted the same thing. Did I get that wrong?" ends the scene on the question. Seen: rule 108 in tests/english-answerable-asks.test.ts reports `scene-talk.reply-agree.yes-when` (the answer (thank) carries no record fact), `scene-talk.reply-ask.what-brought-this-on` (the answer (answer) carries no record fact) and `scene-talk.follow-plea.i-thought-we-wanted-the-same-thing-did-i-get-that-wrong` (the scene ends on the question).

**Cause.** Found in code: `src/director/data/purpose-arcs.json` purpose `move-in-ask` (line 3929) follows agree with thank only and ends plea with no reply that answers it; the thank and answer lines in `data/english/parts/scene-talk.json` (author: family life builder, Nov 14) require no fact, and the move-in packet (partnerships.ts `move-in-asked` stage) carries none for a date or a reason.

**Fix.** Either give the packet the facts that answer (the day the move is set from the partnerships record, the reason the asker has on record) and guard the answers on them, or take the three asks out of the offer. The family life builder owns the lines; the Words lead words any new answer.

**Time box.** 1 hour, Sonnet.

**Rules.** Rule 108: a question is offered only when a record answers it. Never raise tests/english-answerable-asks-baseline.json. No new lines without the Words lead; deleting an unanswerable ask is allowed.

**Done when.** `npx vitest run tests/english-answerable-asks.test.ts` no longer lists those three keys on the train, with the baseline unchanged; a played scene at three drawn places shows the question answered from its record or not offered. A second session sees it in play.

**Waits on.** Nothing.

**Files.** src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/core2/modules/partnerships.ts

**Notes.** Filed by the door scenes builder on branch claude/project-thread-9d3ex7 (PR #9288), Nov 14. The rule-108 test lists it as new (not in the baseline) on train 8bb1ff9d and on #9288's head ef87c8d5.
