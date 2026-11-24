---
id: play-card-fill-in
title: "The person card fills in a counted resident"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/play-card-fill-in
pr: #4619
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-16T05:01:56.386Z
---

**What.** `/api/card` (handler.ts, card.ts) reads `core.people.get` and throws "Resident does not exist" for a counted person. Use `personOrFillIn`. The card is what a player sees when they click anyone in town. Counted residents are most of the town, so clicking them must work. A filled-in person must match the records, such as the business's books for their job and pay.

**Rules.** One model, two tiers: a counted person is filled in the moment the player clicks them, seeded from the world, matching what the records say about their job and pay.

**Done when.** A test calls personCard for a counted resident's id in a drawn place and gets a card whose job and pay match the business's books by record id; the click path through the bench handler returns it.

**Files.** src/bench/card.ts, src/bench/handler.ts

**Notes.** core.md line 215, checked Oct 15: scene, talk, known and play already fill in.
