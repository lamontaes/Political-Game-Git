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
---

**What.** A player who promised a running mate to hold their side on a question, and then voted or signed with it or against it, keeps or breaks that promise on the record, and the tie between them moves. But when they next talk, the running mate never brings it up. Seen: in a talk with the running mate after a vote on their question.

**Cause.** Found in code: `promiseSubject` (src/director/promise-talk.ts) offers a `hold-question` promise that has been kept or broken as the talk's subject, with the facts `promise-hold-question` and `issue`. The conversation bank (data/english/parts/conversation.json) has promise-kept-raise and promise-broken-raise lines only for `promise-vote`, `promise-pay-on-time` and `promise-show-around`, so the talk finds no line for this subject.

**Fix.** Add the Words lead's lines (Nov 15 06:36Z) to conversation.json, said by the running mate:

- `promise-kept-raise`, requiring `promise-hold-question`: "You gave me your word on {issue}. You kept it." and "You held on {issue}, like you said you would."
- `promise-broken-raise`, requiring `promise-hold-question`: "You gave me your word on {issue}." followed by "Then you went the other way.", and "I ran with you because of {issue}. You moved."

After a broken raise, the player gets two different replies: "I did. I changed my mind." and "I had no choice on that one." The second is offered only when the record holds a cause, such as a veto overridden or a party order; otherwise it is not offered. The answer moves in src/director/promise-talk.ts take the second reply's condition from the record, never a fixed share.

**Time box.** 3 hours for one sonnet session.

**Rules.** No hand-written player text: the lines come from the bank, read by the Words lead. Wire to the world: the second reply is offered from a record, never by chance.

**Done when.** A second session, in a played world at a drawn place with a joint ticket and a seed it did not choose, promises a running mate their price, votes against their question, and in the next talk hears the running mate bring it up by the question's name, then picks either reply. In another run, a vote with the question brings the kept line.

**Waits on.** gov-serve-ask-price-end.

**Files.** data/english/parts/conversation.json, src/director/promise-talk.ts, src/director/serve-price-scene.test.ts
