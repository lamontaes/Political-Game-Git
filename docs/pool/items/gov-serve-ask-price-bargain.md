---
id: gov-serve-ask-price-bargain
title: "A running mate who names a price can be offered a softer promise: they hear first before the player moves on their question"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-serve-ask-price-end
blocked-on:
lead: governing
source: S6 (brief J, the price end), Nov 15 2026; Words lead rulings Nov 14 16:15Z, ruling 4
standard: 2
model: opus
effort: medium
root: none
---

**What.** A person who would say no to running on the player's ticket, but would say yes for the player's word on the question they hold most strongly, names that price. The player can promise or refuse (gov-serve-ask-price-end). The player cannot offer something softer: "I can't tie my hands on {issue}. I can promise you'll know before I move on it." The only two replies are the promise and the refusal. Seen: Politics, then Campaign, then Your running mate, then Ask someone whose answer carries a price.

**Cause.** Design: docs/pool/items/gov-serve-ask-price-end.md and Words lead ruling 4 (Nov 14 16:15Z, /mnt/project-files/words-lead/picking-people/rulings-price-end.md): "The bargain is offered only if the game can keep it." A softer promise to tell the person first can only be kept if the game has (a) a way for the player to tell that person before moving on the question, a talk or call that the promise check reads, and (b) a check that a vote or signature on the question, made without that telling, strains the tie. Neither exists. The `hold-question` promise kind (src/core2/data/promises/promise-kinds.json) settles on the player's own vote or signature (`settleQuestionPromises`, src/director/promises.ts), and no event records "told them first".

**Fix.** Add a promise kind `tell-first-question`, held by the player (heldBy "second"), tied to the question and the side. It is settled by the player's vote or signature on a bill that moves the question: kept if a talk between the two that names the question (the conversation engine's subject record) came first within the window, broken if not. Give the conversation engine the subject the player raises ("I wanted you to hear it from me") where an open `tell-first-question` promise exists. Add the asks-block `again` row {bargain, carries: "softer"}, where "softer" carries when lean plus a share of `promiseWorth` (a TUNABLE row in willingness.json with its spread) is above zero. The Words lead's lines for the bargain and its answers ("Hearing it first doesn't help me much. No.") go in with it.

**Time box.** 6 hours for one opus session.

**Rules.** No hand-written player text: the bargain's lines come from the bank, read by the Words lead. No dice: whether the softer promise carries comes from the person's record. Look before you ask: ruling 4 decides it, so nothing goes to the owner.

**Done when.** A second session, at a drawn joint-ticket place with a seed it did not choose, asks a running mate whose answer carries a price, offers the softer promise, and sees them seated with a `tell-first-question` promise on record. Then it tells them first in a talk, votes on a bill that moves the question, and sees the promise kept, by record id. In another run it votes without telling them and sees the tie strained.

**Waits on.** gov-serve-ask-price-end.

**Files.** src/core2/data/promises/promise-kinds.json, src/director/promises.ts, src/director/conversation.ts, src/director/data/purpose-arcs.json, src/director/scene-talk.ts, src/core2/data/serve/willingness.json, data/english/parts/scene-talk.json
