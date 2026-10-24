---
id: core-speed-kernel-walks-no-copies
title: "Walking the counted households and reading a module table's rows make no copy or result object per call"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Two kernel readers allocate on every call in a played year. The counted store's liveHouseholds is a generator, so each walk of the town's 21,000 counted households allocates a result object per household, and the year walks them hundreds of times (credit, residents, place prices, the census, counted moves). A module table's rows() copies and freezes the whole table on every call, 65,968 times a year for the budgets engine's governments table and 25,434 for the offices table in Long Hill, Connecticut (seed m7b). The walk now reuses one result object and still skips a household that goes mid-walk and sees one added mid-walk; rows() hands out one frozen list until a row is written or removed.

**Rules.** No dice: every reader sees the same households and rows in the same order, so nothing anyone does changes. Speed: no change makes a year slower, measured before and after on the same machine. Replace, never layer: the generator and the per-call copy are deleted.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) the deep fingerprint is identical before and after on the same base; the module-state test that rows() returns one frozen list until a put or remove passes and fails when the list is not cleared on a write; the counted-groups, residents and module-state tests pass.

**Files.** src/core2/counted-groups.ts, src/core2/module-state.ts, src/core2/modules/residents.ts

**Notes.** Filed Oct 24 by the speed lead. Bounds PR #5433 (branch claude/speed-live-households, sent back Oct 21 for naming the GC umbrella) and adds the module-table list cache from claude/speed-kernel-copies.
