---
id: words-own-view-offers-the-player-one-reply
title: "A neighbor's own-view stand offers the player only the reply that disagrees"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead on #9455, Nov 15
---

**What.** After a neighbor says where they stand, the player is offered one reply ("I'd vote the other way, Mom.") and never an agreeing or a neutral one. That leaves a player with no stake unable to answer where the neighbor stands except by disagreeing. A talk with one possible answer reads as a trap, not a conversation. Seen: the neighbor's own view in the talk of #9455 at Creve Coeur, Illinois (1717549, seed pl5); the same one reply in every played case.

**Cause.** Found in code: the player's replies to an own-view line come from the pieces `own-view-answer-agree` and `own-view-answer-disagree` in data/english/parts/conversation.json, whose uses require the facts `my-same` and `my-other` that src/director/conversation.ts sets from the player's own recorded view on the question (`playerFacts`, the `news` branch around `newsStake`), so a player whose record differs from the neighbor's is offered only the disagreeing reply, and `offerChoices` filters the rest to `OWN_VIEW_TAKES` or the why reply; no neutral reply ("Tell me why" aside) is written for a player with no stake.

**Fix.** Offer the neutral and why replies beside the one the record picks: write the neutral reply as an own-view answer for a player with no stake (`my-none`), by the Words lead, and let `offerChoices` keep it. The agree and disagree replies stay gated by the player's record.

**Time box.** 3 hours.

**Rules.** No hand-written player text; a reply the player's own record contradicts is never offered.

**Done when.** In the played world at a drawn place, Creve Coeur, Illinois (1717549, seed pl5, found by buildBenchWorld in a test), a second session opens the neighbor's own view with a player whose record has no view on the question and sees a neutral reply and the why reply offered beside any the record allows.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts,data/english/parts/conversation.json
