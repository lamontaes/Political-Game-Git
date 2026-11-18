---
id: gov-serve-ask-price-said-aloud
title: "A running mate brings up the word the player gave them on their question, kept or broken"
area: gov
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
after: gov-serve-ask-price-end
blocked-on:
lead: words
source: S6 (brief J, the price end), Nov 15 2026; Words lead, Nov 15 06:36Z
standard: 2
model: sonnet
effort: medium
root: none
claimed-at:
branch: claude/project-thread-d5qa0q
---

**What.** A player who promised a running mate to hold their side on a question, and then voted or signed with it or against it, keeps or breaks that promise on the record, and the tie between them moves. But when they next talk, the running mate never brings it up. Seen: in a talk with the running mate after a vote on their question.

**Cause.** Found in code: `promiseSubject` (src/director/promise-talk.ts) offers a `hold-question` promise that has been kept or broken as the talk's subject, with the facts `promise-hold-question` and `issue`. The conversation bank (data/english/parts/conversation.json) has promise-kept-raise and promise-broken-raise lines only for `promise-vote`, `promise-pay-on-time` and `promise-show-around`, so the talk finds no line for this subject.

**Fix.** Pass the proposal itself to the talk as `about` (`questionAbout`), and only for a word given for it. Add the Words lead's lines (Nov 15 17:35Z, 17:36Z, 18:23Z and 18:24Z) to conversation.json, said by the running mate. Each requires `promise-hold-question` and `about`:

- `promise-kept-raise`: "You said you'd back {about}. You did." and "You stood up for {about}, like you said you would."
- `promise-broken-raise`: "You said you'd back {about}. Then you went against it." and "I joined your ticket for {about}. You moved."

The player answers from the promise talk's existing answers (own-it, explain, deny). make-it-right is not offered, because the kind is not renewable. No new reply lines are added (Words lead, 17:35Z). "I had no choice on that one." is its own item, words-promise-broken-no-choice-from-a-cause.

**Time box.** 3 hours for one sonnet session.

**Rules.** No hand-written player text: the lines come from the bank, read by the Words lead. Wire to the world: the second reply is offered from a record, never by chance.

**Done when.** A second session, in a played world at a drawn place with a joint ticket and a seed it did not choose, promises a running mate their price, votes against their question, and in the next talk hears the running mate bring it up by the question's name, then picks either reply. In another run, a vote with the question brings the kept line.

**Waits on.** gov-serve-ask-price-end.

**Files.** data/english/parts/conversation.json, src/director/promise-talk.ts, src/director/serve-price-scene.test.ts

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-d5qa0q since 2026-11-16 02:32 UTC, more than twice its 3-hour time box. Continue on branch claude/project-thread-d5qa0q.
