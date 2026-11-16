---
id: words-promise-broken-no-choice-from-a-cause
title: "After a broken word is brought up, the player can say they had no choice, only when a record holds the cause"
area: gov
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after: gov-serve-ask-price-said-aloud
blocked-on:
lead: words
source: S6 (gov-serve-ask-price-said-aloud), Nov 15 2026; Words lead, Nov 15 17:35Z
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** When someone the player gave their word to brings up a broken promise, the player can own it, explain or deny it. The player has no answer for having been forced to break it, such as a party order on the floor. The Words lead's line for that answer is "I had no choice on that one." It may be offered only when a record shows a cause. Seen: in a talk with a running mate after the player votes against the proposal they promised to back.

**Cause.** Found in code: `promiseAnswers` (src/director/promise-talk.ts) offers the same broken answers from src/director/data/promise-kinds.json (own-it, explain, deny, make-it-right) for every broken promise, whatever settled it. Two kinds of record could show a forced vote, and nothing reads either one into the answers: the whip's asks before a floor vote (`whipCount`, src/core2/modules/legislature.ts) and a bill's `overridden` status.

**Fix.** Add a broken answer row `no-choice` to promise-kinds.json, with a condition read from the record that settled the promise (`endedBy`). The condition holds when the player's vote at that roll call was asked by their party's whip, or when the act was a veto that was overridden. Do not offer the answer otherwise. Add the Words lead's line "I had no choice on that one." as `promise-broken-answer-no-choice` in data/english/parts/conversation.json. Decide its tie move with the Words lead.

**Time box.** 3 hours for one sonnet session.

**Rules.** Wire to the world: the answer is offered from a record, never by chance. No hand-written player text: the line comes from the bank.

**Done when.** A second session plays a world at a drawn place with a joint ticket, on a seed it did not choose, where the player promises a running mate their price. The player is whipped to vote against it at the roll call. In the next talk, the player can answer "I had no choice on that one." In a world with no whip's ask, that answer is not offered.

**Waits on.** gov-serve-ask-price-said-aloud.

**Files.** src/director/data/promise-kinds.json, src/director/promise-talk.ts, data/english/parts/conversation.json, src/director/serve-price-scene.test.ts
