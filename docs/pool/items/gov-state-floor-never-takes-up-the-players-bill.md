---
id: gov-state-floor-never-takes-up-the-players-bill
title: "A State House bill the player drafts says the floor takes it up on a date, then the date slides and the bill stays drafted"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/cluster11-floor-date
pr: #9459
blocked-on:
source: found by hand while replaying the State House fee walks (cluster 13, PR #9308); the cause here replaces the first write-up
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A State Representative drafts a bill, the paper says "The floor takes it up on February 10, 2025", and the player plays the days past that date and into April with the bill still drafted. Seen: on the bill paper's "Where it is" line and its Staff and vote boxes, at Holiday Lakes, Texas, seed aa11, drafted January 20.

**Cause.** Measured: at Holiday Lakes, Texas (place key 4834502), seed aa11, by `npx vitest run src/core2/bill-floor-date-holds.test.ts`, the floor date on the paper is a projection (`projectedFloorDate` in `src/core2/modules/world-legislating.ts`, formerly the whole of `floorDateOf`) recomputed on every ask from a weekly pace; each member's bill filed after the player's shrinks the player's slot, so the date the paper first named (February 10) became May 19 four days later (January 24) and kept sliding. The floor never took the bill up on the date named because nothing had put it on the calendar: no record held the date.

**Fix.** The floor leader puts a bill on the calendar the day it is introduced to a sitting legislature: the bill row keeps `floorOn`, `floorWeeks` takes bills with that date first and fills the rest of the week to the pace, and `floorDateOf` reads the kept date. Recomputing the pace never moves a date already given; a bill drafted with no sitting ahead keeps the projection. No second scheduler: `floorWeeks` is the one that exists.

**Time box.** 4 hours for one opus session.

**Rules.** No dice. One engine for every chamber and place; pinned place and seed in the test.

**Done when.** A second session drafts a state bill at a place and seed it did not choose, reads the floor date the paper names, plays the days with other members' bills arriving, and sees the bill taken up on that date and reach a floor result by name in the running game, with the drawn place and seed written down and the bill's record id on the stage view.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/bill-floor-date-holds.test.ts (new)

**Notes.** Replaces the item of the same id on claude/project-thread-xy4wd4 (#9308), which had the symptom and no cause; that branch drops its copy. Pinned test: src/core2/bill-floor-date-holds.test.ts, which fails without the fix at January 24 and passes with it.
