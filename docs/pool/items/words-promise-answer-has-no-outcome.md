---
id: words-promise-answer-has-no-outcome
title: "When the player answers a broken promise brought up in a talk, the other person says nothing back and the tie barely moves"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: S6 (gov-serve-ask-price-said-aloud, #9548), Nov 15 2026; Account lead, Nov 15 20:30Z
standard: 2
model: opus
effort: medium
root: none
---

**What.** A running mate brings up the word the player broke, and the player owns it, explains or denies it. Whichever answer the player picks, the running mate's next line is the talk's farewell ("Glad we talked."), and the tie between them moves by less than 0.001. The answer is written down, but nothing the player can see comes of it, so the exchange has no outcome. Seen: at Santa Rita, Guam, seed fedcba9876543210, Sandra Orr on Dec 23, 2025, closeness 0.9285 before and 0.9285 to 0.9286 after each of the three answers (the played file of #9548).

**Cause.** Found in code: `answerPromise` (src/director/promise-talk.ts) writes the `promise.answer` record and moves the tie by contact hours. Owning it gives back `promiseOwnShare` times `promiseBrokenHours` (at most one hour), and denying it takes off `promiseDeniedHours` (one hour). Hours of contact are a small part of closeness for two people who already work together. data/english/parts/conversation.json has no move for the one owed to react to the answer (there are `promise-broken-answer-*` lines for the player only), so the conversation engine goes straight to the farewell.

**Fix.** Give the one owed a reaction to each answer, read from the answer record and their traits: for example, accepting an owned break, doubting an explanation, cooling at a denial. The Words lead writes those lines. Move the tie by a share of the tie, not by fixed hours, as item people-broken-promise-costs-share-of-tie does for the break itself. Build on that item if it lands first.

**Time box.** 4 hours for one opus session.

**Rules.** No hand-written player text: the lines come from the bank, read by the Words lead. Ask why: each reaction cites the answer record it follows.

**Done when.** A second session, at a drawn place with a joint ticket and a seed it did not choose, gets a running mate to bring up a broken word and presses each answer. Each answer brings a different reaction line, and the tie moves by an amount the screen shows as a change in how they get along.

**Waits on.** Nothing; people-broken-promise-costs-share-of-tie is built on if it lands first.

**Files.** src/director/promise-talk.ts, src/director/data/promise-kinds.json, data/english/parts/conversation.json
