---
id: words-witness-stake-ask-answered-from-their-life
title: "After a hearing, 'What does it do to you?' is answered from the witness's own life"
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

**What.** After a committee hearing, the member asks a witness "Be straight with me. What does it do to you?" and can be answered by a line with no record behind it. Seen: rule 108 reports `scene-talk.reply-ask.be-straight-with-me-what-does-it-do-to-you` (the answer (answer) carries no record fact).

**Cause.** Found in code: the witness-stake answers in `data/english/parts/scene-talk.json` include two that require no fact ("It means things get a little easier for us. Or harder, if they get it wrong.", "It means I can stop worrying about it. That'd be enough."); when the witness packet (`src/director/purpose-scene.ts` near line 1196, `life-*` facts from the hearing record's witnessLives) holds no life fact, one of them answers.

**Fix.** Offer the ask only when a `life-*` fact is set (or `life-believes`), and take the two fact-less answers out, or guard them on a life fact. The stages-of-a-bill builder owns the lines.

**Time box.** 1 hour, Sonnet.

**Rules.** Rule 108: a question is offered only when a record answers it. Never raise tests/english-answerable-asks-baseline.json. No new lines without the Words lead; deleting an unanswerable ask is allowed.

**Done when.** `npx vitest run tests/english-answerable-asks.test.ts` no longer lists `scene-talk.reply-ask.be-straight-with-me-what-does-it-do-to-you` on the train, with the baseline unchanged; a played scene at three drawn places shows the question answered from its record or not offered. A second session sees it in play.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts

**Notes.** Filed by the door scenes builder on branch claude/project-thread-9d3ex7 (PR #9288), Nov 14. The rule-108 test lists it as new (not in the baseline) on train 8bb1ff9d and on #9288's head ef87c8d5.
