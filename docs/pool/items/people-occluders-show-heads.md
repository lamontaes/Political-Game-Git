---
id: people-occluders-show-heads
title: "Furniture never hides a person whole: head and shoulders always show"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/people-occluders-show-heads
pr: #6409
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T21:23:17.336Z
---

**What.** After the occluder masks landed, a person on a spot staged inside furniture is covered whole by the depth mask, because the spot's own depth reads as the furniture behind them. The merger saw it on the U.S. House floor: the two far seats at the edges and the people at the rostrum in the opening vanish. The bake now clears every mask above the person's shoulder line, so whoever is in a room is always seen even where the staging is off by a row, until the mannequin plates measure the spots.

**Rules.** Wire to the world: every person the scene stages is drawn and can be seen, nobody vanishes into the painting. One rule, all 56 places: one shoulder line for every spot of every room, from its own scale.

**Done when.** In a drawn place with a seed, a screenshot of the opening's U.S. House floor shows the rostrum people's heads and shoulders behind the rostrum where the merged masks hid them whole, before and after; occluders.test.ts still passes and every mask is rebaked by scripts/people/occluders.py.

**Files.** scripts/people/occluders.py, art/backdrops/occluders

**Notes.** TODO
