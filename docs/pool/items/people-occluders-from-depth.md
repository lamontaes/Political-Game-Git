---
id: people-occluders-from-depth
title: "Furniture covers people along its real edge, from a depth map of each painting, not a straight crop"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/people-occluders-depth
pr: #6405
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T20:55:48.559Z
---

**What.** Today the bench hides furniture with one straight horizontal crop per spot (clipBelowY in art/backdrops/staging.json, applied in src/bench/play.mjs drawPeople), which cuts legs off in a flat line across slanted desks and chair backs. The people research of Oct 27 showed a depth map per painting (Depth Anything V2 Small, offline, seconds a painting) seats a body behind desks and chair backs cleanly. This item bakes one occluder mask per staging spot from that depth map, committed as derived art naming its parent painting, and the screen lays the painting's own pixels through the mask over the person on that spot.

**Rules.** Replace, never layer: the clipBelowY crop, clipBandEndY and the client's squeezed figure box are deleted in the same change and counted in the PR body. One rule, all 56 places: every staged place is baked by one script, no room named in logic. Wire to the world: the masks are read by the scene the player sees.

**Done when.** In a drawn place with a seed, screenshots before and after of the Oval Office, the U.S. House floor, the council chamber and a home show seated and standing people covered by the desk or chair in front of them along its edge; src/bench/occluders.test.ts checks every staged place has a mask index naming its parent painting by sha256 and every mask belongs to a spot of that place; the crop fields are gone from src and art/backdrops/staging.json.

**Files.** scripts/people/occluders.py, art/backdrops/occluders, src/bench/occluders.ts, src/bench/whole-figures.ts, src/bench/play.mjs, src/bench/play.css, art/backdrops/staging.json

**Notes.** TODO
