---
id: words-desk-visit-cost-ask-needs-the-cost-fact
title: "At the desk, 'What does it cost?' is offered only when the bill's cost is on the packet"
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

**What.** At the desk visit (a member asks the executive to sign or veto), "What does it cost?" can end the scene on the question. Seen: rule 108 reports `scene-talk.reply-ask.what-does-it-cost` (the scene ends on the question).

**Cause.** Found in code: the ask requires only `for` in `data/english/parts/scene-talk.json`, while its answers ("About {budget-cost} a year.", "Nothing the budget shows.") require `budget-cost` or `no-cost`, which `src/director/purpose-scene.ts` sets (near line 2605) only when the desk packet is built from the bill; a desk packet without them leaves the ask with no answer.

**Fix.** Make the ask require the cost fact the way its answers do: either always set `budget-cost` or `no-cost` on every desk-visit packet, or offer the ask only when one of the two is set (split the use in two, one per fact). The desk builder owns it.

**Time box.** 1 hour, Sonnet.

**Rules.** Rule 108: a question is offered only when a record answers it. Never raise tests/english-answerable-asks-baseline.json. No new lines without the Words lead; deleting an unanswerable ask is allowed.

**Done when.** `npx vitest run tests/english-answerable-asks.test.ts` no longer lists `scene-talk.reply-ask.what-does-it-cost` on the train, with the baseline unchanged; a played scene at three drawn places shows the question answered from its record or not offered. A second session sees it in play.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts

**Notes.** Filed by the door scenes builder on branch claude/project-thread-9d3ex7 (PR #9288), Nov 14. The rule-108 test lists it as new (not in the baseline) on train 8bb1ff9d and on #9288's head ef87c8d5.
