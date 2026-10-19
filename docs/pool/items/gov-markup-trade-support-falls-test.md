---
id: gov-markup-trade-support-falls-test
title: "legislature-committees.test.ts fails on main: a committee trade leaves the bill's support lower than before it (Leyner, Colorado, seed m3)"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/political-game-pool-yucp92-b
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:50:24.814Z
---

**What.** A sponsor short of a majority trades a holdout a section of their own for their vote. The new section also changes how other members read the bill, so the trade could leave the bill with fewer votes than before. The sponsor now makes the trade only when the bill ends with more support. The test legislature-committees.test.ts failed on main for this reason in a drawn place.

**Rules.** No dice: the sponsor's choice follows each member's position on the bill with the section in it, never a roll. An effect is a read: the trade reads every member's position before it is adopted.

**Done when.** legislature-committees.test.ts passes in drawn places, and every accepted committee trade in a two-year played world (buildBenchWorld) shows support after greater than support before.

**Files.** src/core2/modules/legislature.ts

**Notes.** Fixed on claude/political-game-pool-yucp92-b.
