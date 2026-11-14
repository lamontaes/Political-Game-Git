---
id: gov-serve-ask-price-end
title: "A person asked to serve who is near yes names a price the player can accept, bargain down or refuse"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: S6 (brief J, asking someone to serve), Nov 14 2026
standard: 2
model: opus
effort: medium
root: none
---

**What.** A person asked to be the player's running mate says yes or no. Someone just short of yes says no as firmly as someone far from it, and nobody says "yes, if you'll promise me something". Seen: the running mate sit-down from Politics, then Campaign, then Your running mate, then Ask.

**Cause.** Design: docs/pool/items/gov-running-mate-agrees-and-is-replaced.md and the owner's card of Nov 14 05:17Z ("Yes, but ask again later"), with brief J's shape (a yes with a price, Words lead Nov 14 05:24Z) and the Account lead's 05:15Z note: the price end is built only with a bounded promise record that a later vote or signature reads. `ticketStanding` in src/core2/modules/serve-asks.ts returns only `lean`, and the scene passes the asks block a favor of zero, as the door scenes do: the answer is yes where `lean` is above zero and no below.

**Fix.** Add a favor term to `ticketStanding` (what the promise is worth to the person, from how strongly they hold the question). Where `lean` is below zero but `lean + favor` is above, the answer is the director's asks-block carried move: the person names one promise on the question they hold most strongly. The player accepts (seated, with a PromiseRow in src/core2/modules/record.ts owed to the person, settled through `promisesOf`), bargains it down to a softer promise (seated when the softer one still carries them), or refuses (not seated, the no kept as today). One promise per seated person, dropped when they leave the seat. The closeness writer strains the tie when the player later votes or signs against the promise. Lines follow rule 106: the price is never named in the same breath as the yes.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: the price and the answer come from the person's record. Nothing is promised for the player without their press. Only dialogue in the scene.

**Done when.** A second session plays a governor filing at a drawn joint-ticket place, asks someone whose read sits near yes, accepts the price and sees them seated with the promise on record. They later cast a vote against it and see the tie strained, by record id.

**Waits on.** gov-running-mate-agrees-and-is-replaced (the player's half, on branch claude/project-thread-d5qa0q) and #9102's asks middle.

**Files.** src/core2/modules/serve-asks.ts, src/core2/modules/record.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json
