---
id: core-long-run-stance-causes-year
title: "Fold a circle stance's causes to a year and the newest"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/fold-stance-causes
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T19:59:45.121Z
---

**What.** A circle member's stance kept every source that ever moved it and copied the whole list on every change, so it grew with the save. No reader in play looks past the newest cause. Over four years the row count stays at 6,092 either way; the saving is in the size of each row, and it grows over long saves. Part of core-long-run-tables-grow-with-history.

**Rules.** Speed and the Oct 30 01:55 ruling: old records fold into summaries once play no longer reads them, so a long save keeps the same memory and time per year. Ask why: every reader keeps what it reads, agreed with the engine's owner, and the records proof differs only in the folded rows.

**Done when.** A circle stance keeps the causes from the last stanceCauseKeptDays plus the newest, while heard, strength and desired change stay whole. The four-year Ringgold proof differs from main only in the views engine's stance rows; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table but the folded ones (views.stances:) in the played world (buildBenchWorld), the tests the PR names pass, with the times in the PR body.

**Files.** src/core2/data/views/views.json, src/core2/modules/views.ts, src/core2/views.test.ts

**Notes.** TODO
