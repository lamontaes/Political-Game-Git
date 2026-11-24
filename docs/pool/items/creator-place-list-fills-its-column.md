---
id: creator-place-list-fills-its-column
title: "The creator's place list is a four-row scrolling box with dead space under it"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pt-carryover-n16-12
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N16-12)
---

**What.** The owner, Nov 16: "lots of empty, dead space right here" (the creator); his Nov 17 ruling: no empty space in the creator. In a played creator the "Where I'm from" list is a box capped at 150 px that scrolls inside itself, while about 100 px of the left column sits empty under it.
Seen: Nov 23, a drawn place, creator at 1440x900, after a gender is picked: four state rows, a scroller, and an empty strip above the Random place button.

**Cause.** Found in code: the rule `#cr-screen .choice-list { max-height: 150px }` (about line 1438 of src/bench/play.css), under a left column that is shorter than the look column beside it.

**Fix.** The place list takes the rest of its column (it grows to the column's height and scrolls only past that), and the portrait is drawn to the room the window leaves (230 px to start, never below 140 px or above 270 px), so it fills the band above How I look and a tall look with a name filled in still fits 900 px (the CTO caught the panel top running off screen on Nov 24). The creator is the row (Coordinator, Nov 23: "no empty space in the creator"). No player text changes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the fix covers both the state list and the town list, since both are the same `.choice-list`, and adds no player text.

**Done when.** In a played creator after a gender is picked, the place list fills its column down to the Random place button with no empty strip, in a drawn place at 1440x900. A second session starts a new game, picks a gender in the running game, and sees more state rows than before with no gap under the list.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/play.mjs

**Notes.**
