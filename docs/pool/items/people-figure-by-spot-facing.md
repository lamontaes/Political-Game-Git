---
id: people-figure-by-spot-facing
title: "Each person is drawn at the angle their spot faces: back, three-quarter or front"
area: play
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/people-figure-by-facing
pr: #6408
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T21:17:57.304Z
---

**What.** Today a person is drawn in the three-quarter view almost everywhere: a spot that faces the viewer still gets the three-quarter figure turned toward the room's front, and only seats facing away or two people side by side get another angle. The figure set paints standing and seated people from the front, seated people from behind, and both in three-quarter. This item makes the spot's facing pick the painted angle (away is the back view, viewer is the front view, left or right is the three-quarter view turned that way), with the three-quarter view where an angle is not painted.

**Rules.** One rule, all 56 places: one mapping from a spot's facing to an angle for every room type, no room named. Replace, never layer: the old side-by-side profile rule and the view field of a turn are deleted. Every person drawn is the filled-in person: their own look and build at every angle.

**Done when.** In a drawn place with a seed, screenshots before and after of the Oval Office and a council chamber show the President seated facing the viewer behind the desk and the player standing facing the viewer; a test in src/bench/whole-figures.test.ts checks every spot of a random place draws the angle its facing asks for, or the three-quarter view where the set paints none.

**Files.** src/bench/whole-figures.ts, src/bench/scene.ts, src/bench/whole-figures.test.ts

**Notes.** TODO
