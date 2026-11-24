---
id: words-scene-bribe-offer-envelope
title: "Scene: an offer left for an official, and what the official does with it"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: helper-e/bribe-offer-envelope
pr: #6224
blocked-on:
lead: words
source: added with npm run pool -- add
claimed-at: 2026-10-27T05:21:35.010Z
---

**What.** Scenes-from-life episode 1 (docs/design/scenes/from-life/envelope-refused-developer.md, from the 2025 Antioch indictment): a bribe-offer situation type with cast from the offer record, a purpose arc with five stances (take it, hand it back, say it will be reported, put it off, play along) and bank lines with versions by bearing and by favor. Waits on corruption-bribe-offer-reaches-player-seat for its record. The scene cannot fire in play until the offer is an event.

**Rules.** No dice. scene-standard. No real name or quoted line in any player-facing file. One producer, three episodes (a vote, a contract, a go-between).

**Done when.** The type, arc and at least 70 bank pieces are on main; the scene composes with all five endings reachable; a test fails if the type fires from anything but the offer record; two other lives are named as covered by the same producer; the scene reaches the player in ordinary play once corruption-bribe-offer-reaches-player-seat is done (named by record id then).

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, scripts/english-corpus/scene-talk-pieces.py, src/director/purpose-scene.ts, src/director/bribe-offer-scene.test.ts

**Notes.** Filed by Helper E. lead: words. Time box 4 h.
