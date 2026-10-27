---
id: people-seat-slots-gone
title: "Rooms hold only who is there: the unused seat-slots crowd art is deleted"
area: art
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/people-seat-slots-gone
pr: #6410
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T21:25:49.997Z
---

**What.** art/seat-slots holds Firefly-painted people for every seat of twelve chambers and meeting rooms (16 MB, plus 70 MB of sources, the pipeline under tools/seat-slots and a handoff folder), and nothing in the game reads it. The owner ruled on Oct 27 that big rooms hold only who is there and a spot with nobody on it shows the original painting. The bench already draws only the people a scene stages, and the depth masks draw nothing for an empty spot, so the painted crowds are deleted.

**Rules.** Replace, never layer: the painted crowd art is replaced by the staged people and the depth occluders, and is deleted with its pipeline and handoff, counted in the PR body. One rule, all 56 places: every room draws only the people its records put there.

**Done when.** git grep finds no reader of art/seat-slots in src, scripts, tests or package.json and the folders are gone; validate:art passes; a screenshot of the opening's U.S. House floor in a drawn place with a seed shows only the staged people and the painting's own empty seats.

**Files.** art/seat-slots, art/seat-slots-source, tools/seat-slots, docs/handoff/seat-slots

**Notes.** TODO
