---
id: core-every-life-moves
title: "Every life is simulated, unit 1: relatives living elsewhere move through the moves engine"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by: lives/every-life-simulated
pr: #7032
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:15:06.052Z
---

**What.** Unit 1 of core-every-life-simulated (owner, Nov 1: every life is simulated). People of the inactive tier living in a real place outside the played town (the relatives every resident has elsewhere, and town leavers after they leave) are skipped by the moves engine, so they never move. They join its monthly review: the same pull at their stage of life and their state's ACS rate, the same chooser, holds read where they live. A move writes the same person.moved-away record, witnessed by their relatives in town.

**Rules.** One engine per mechanic: the moves engine moves them, through the same pull and chooser as the town's people, with no second simulator. No dice: the pull builds from their records and their state's ACS rate checks totals. Two-level population: a move fills nobody in and moves no money.

**Done when.** In a generated world of a place drawn from all 56, the number of people living elsewhere who move in half a year is within three standard deviations of their ACS rate (src/core2/moves-elsewhere.test.ts, three draws); in a buildBenchWorld run of a drawn place with a seed the builder did not choose, a relative's move is a person.moved-away record named by id, witnessed by the player and read by the player's knowledge.

**Files.** src/core2/modules/moves.ts, src/core2/moves-elsewhere.test.ts, src/core2/moves.test.ts, src/core2/place-lookup.ts

**Notes.** Split from core-every-life-simulated by the lives lead, Nov 1, so the parent stays open across units (work, partnerships and births next).
