---
id: dev-mode-force-scene-for-player
title: "Dev mode can force a scene for the player from a cause that names them"
area: play
kind: feature
priority: 2
size: L
status: done
claimed-by:
pr: #7530
blocked-on:
source: added with npm run pool -- add
---

**What.** The director stages a scene for a person only from a moment whose cause record names that person, and 91 situation types each carry one cause record kind. A dev control that picks a type can only play on screen when the forced cause names the player, such as the player as sponsor, official, offerer or the one grieved. Build the forcing recipes one cause at a time through the game's own code (bills, the bribe offer, a death, a layoff), then hand the day to the director so the scene stages like any moment.

**Rules.** Wire to the world: every recipe forces the world event through the engine that writes the cause record, and the director's scheduling stages the scene from that record id, never from a dev-made moment.

**Done when.** In a drawn place, the dev Scenes panel lists the situation types with the cause each needs, forces at least one type whose cause names the player, and plays it on screen from the cause record id; a screenshot names the place and seed.

**Files.** src/director/scheduling.ts, src/bench/dev-mode.ts, src/bench/ui

**Notes.** TODO
