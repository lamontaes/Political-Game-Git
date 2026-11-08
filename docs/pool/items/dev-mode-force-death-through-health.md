---
id: dev-mode-force-death-through-health
title: "Dev mode can start a fatal illness through the health module, so a funeral scene follows from a real death"
area: play
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The health module schedules every death from a case's onset and its remaining-days date, and nothing public lets a caller begin such a case for one named person. Dev mode's force-a-scene control (done-when item 4, Nov 8) needs a funeral to follow from a death the game's own code made, never a dev-only write of alive false. Add one exported function that opens the case the module already opens on an onset day, and call it from a dev control.

**Rules.** Wire to the world: the death must flow through health.ts deathsByDate, the estate, the vacancy rule and the director's cause records, never a dev write.

**Done when.** In a drawn place, a dev control picks a person, the health module records the onset and the death on its own dates, and a funeral scene stages from the life.death record id for a relative; a test names the place and seed.

**Files.** src/core2/modules/health.ts, src/bench/dev-mode.ts

**Notes.** TODO
