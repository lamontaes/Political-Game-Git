---
id: director-producer-canvass-visit
title: "A door the player's own canvass knocks plays as a porch scene with the household that has the most at stake"
area: director
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/director-producer-canvass-visit
pr: #6406
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T19:46:51.349Z
---

**What.** The scene web counts two rows waiting on a canvass-visit producer: first-meeting at a door, and visit to a door knocked before. The campaign engine already keeps a record of every resident who opened the door to the player's canvass, with their agreement with the player's platform. No director row reads it, so a canvass ends with a tally and nobody talks. The owner's Oct 8 design is a montage with an occasional porch scene for a household with a stake. This item is the director's part of words-door-knocking-montage-with-porch-scenes: the porch scene's producer.

**Rules.** Wire to the world: the scene reads the campaign engine's own door records and casts the resident who opened the door, never a drawn person. No dice: the household with a stake is the one whose recorded agreement with the platform is the day's strongest, a ranking of the engine's numbers, not a roll or a cut-off. Sliding scales and causes: the scene comes from the knock, spaced by the row's own days.

**Done when.** In a buildBenchWorld drawn place with the seed named, a played year in src/director/circumstance.test.ts where the filed player canvasses once a week through the bench's campaign day stages first-meeting or visit at the resident's home, citing the door's campaign cause record id and the resident cast; the scene web report shows two fewer rows waiting on a producer.

**Files.** src/director/doors.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/circumstance.test.ts

**Notes.** TODO
