---
id: director-save-restore
title: "The story director's memory goes into a save and comes back whole"
area: director
kind: feature
priority: 1
size: S
status: claimed
claimed-by: lane3/director-save-restore
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T09:17:40.458Z
---

**What.** Lane 5's path 6 (quit and come back) needs the director's ledger and closure maps saved beside snapshotWorld; createDirector keeps them in closures nothing saved (agreements/3-5.md, proposed by Lane 5).

**Rules.** Agreements are written first (ruling 5); Lane 3 owns src/director, Lane 5 the save call sites.

**Done when.** director.save() and director.restore() exist; a test in a drawn place shows a save restored into a fresh director saves the same, and a director restored to an earlier save forgets what came after; Lane 5's snapshot-played.test.ts is the check that the world then runs as the original.

**Files.** src/director/ledger.ts, src/director/director-save.test.ts

**Notes.** Filed by Lane 3 (Nov 4) to answer agreements/3-5.md; branch lane3/director-save-restore.
