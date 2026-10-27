---
id: corruption-bribe-offer-reaches-player-seat
title: "A bribe offer is an event the director hears, and the player's seat answers it"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: effects
source: added with npm run pool -- add
---

**What.** considerBribe (src/core2/modules/corruption.ts) writes the offer only as a crime row and a self knowledge record, so no director scene can fire on it, and for an official the player plays it runs the take decision from the player's traits as for anyone, so the engine answers for the player. Seen Oct 27 in the scenes-from-life episode docs/design/scenes/from-life/envelope-refused-developer.md. Until it does, the director's bribe-offer scene waits and no offer ever reaches the player.

**Rules.** No dice: who offers and who takes stays the chooser's (traits, money, tie). The player's answer is the player's: for the seat the player holds the engine records the offer as pending and the scene answers it. Wire to the world; an effect is a read, not a record.

**Done when.** In a one-year run of buildBenchWorld in a drawn place and seed the builder did not choose, an offer to the player's seat writes a corruption.bribe-offered event (personIds official then offerer; facts officialId, offererId, favor vote or contract, subjectId, amountMinor) named by record id; the director's bribe-offer situation (waiting on awaitingProducer bribe-offer) fires from it; the scene's reply calls a writer that records bribe-taken (money moves as today), bribe-refused or bribe-reported on the same crime row and both parties' knowledge records; a test fails when the event is absent; the press and justice engines read the reported record by id.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/contracts.ts, src/core2/modules/interest-groups.ts, src/director/data/situation-types.json (remove awaitingProducer when the record exists)

**Notes.** Filed by Helper E (scenes-from-life). lead: effects. The director half (type, arc, lines) is on words-scene-bribe-offer-envelope.
