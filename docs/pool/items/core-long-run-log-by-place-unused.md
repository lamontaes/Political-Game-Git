---
id: core-long-run-log-by-place-unused
title: "Delete the event log's per-place index, which nothing reads"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: speed/cut-log-by-place
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T21:16:04.344Z
---

**What.** The core keeps core.logByPlace, an index from each place to every event log row there, and writes it for every kept row. A reader map of main on Nov 1 found no reader of it in play, in dev mode or in tests beyond those that assert it is written. It costs one set entry per kept row, and the event log is the largest table in an election year: 360,967 rows in Chamblee, Georgia in 2026.

**Rules.** Replace, never layer: an index nobody reads is deleted with its writers and its check. Speed: a save's year 100 holds no more than 1.2 times the records of year 1. A records proof shows the change touches only this index.

**Done when.** A four-year run of the played world (npm run speed:year -- --seed long-1 --years 4, Ringgold, Louisiana) on main and the branch, one process each, keeps dev mode's records proof identical in every table except core.logByPlace, which is gone, and the PR body lists every writer and check removed by file and line.

**Files.** src/core2/state.ts,src/core2/act-cash.ts,src/core2/work-attendance.ts,src/core2/decision-detail.ts

**Notes.** lead: speed. Round four; Words told Nov 1 21:12.
