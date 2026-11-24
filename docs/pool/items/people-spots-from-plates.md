---
id: people-spots-from-plates
title: "Spots measured from the mannequin plates replace the hand-typed ones, with each person's head set on the mannequin's"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/people-spots-from-plates
pr: #6418
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T21:45:40.554Z
---

**What.** The owner's art session paints each room again with a mannequin at every natural spot and measures each one (art/people-rooms/spots: head top, middle and width, pose, facing angle, the front line where furniture covers it, and a role such as the President's chair). Today the hand-typed spots in art/backdrops/staging.json give people the wrong size at many seats, and on the House rostrum seat them on top of the desk. This item writes the plate's spots into the staging in place of the hand-typed ones, sizes and sets every figure by the mannequin's head, bakes each front line into the spot's occluder mask, and seats an office holder in the seat the plate keeps for their office.

**Rules.** Replace, never layer: a place's hand-typed spots are replaced by the plate's measured spots, not kept beside them. One rule, all 56 places: one importer and one placement rule for every scene the art session delivers, no room named in logic. Wire to the world: the President on record takes the seat the plate tags for the President.

**Done when.** In a drawn place with a seed, before and after screenshots of the opening's U.S. House floor and the Oval Office with the Resolute desk show people at the plate's size, the rostrum officials behind the rostrum and the President at the desk; src/bench/plate-spots.test.ts checks every mannequin is a spot with its head, pose and facing and that a drawn figure's head lands on the mannequin's head.

**Files.** scripts/people/room-spots.ts, scripts/people/figure-heads.ts, src/bench/data/figure-heads.json, art/backdrops/staging.json, src/bench/whole-figures.ts, src/bench/scene.ts

**Notes.** TODO
