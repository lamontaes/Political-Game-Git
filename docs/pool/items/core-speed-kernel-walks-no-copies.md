---
id: core-speed-kernel-walks-no-copies
title: "Walking the counted households and reading a module table's rows make no copy or result object per call"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/speed-live-households
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T03:01:08.229Z
---

**What.** Two kernel readers allocate on every call in a played year. The counted store's liveHouseholds is a generator, so each walk of the town's 21,000 counted households allocates a result object per household, and the year walks them hundreds of times (credit, residents, place prices, the census, counted moves). A module table's rows() copies and freezes the whole table on every call, 65,968 times a year for the budgets engine's governments table and 25,434 for the offices table in Long Hill, Connecticut (seed m7b). The walk now reuses one result object and still skips a household that goes mid-walk and sees one added mid-walk; rows() hands out one frozen list until a row is written or removed.

**Rules.** No dice: every reader sees the same households and rows in the same order, so nothing anyone does changes. Speed: no change makes a year slower, measured before and after on the same machine. Replace, never layer: the generator and the per-call copy are deleted.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) the deep fingerprint is identical before and after on the same base; the module-state test that rows() returns one frozen list until a put or remove passes and fails when the list is not cleared on a write; the counted-groups, residents and module-state tests pass.

**Files.** src/core2/counted-groups.ts, src/core2/module-state.ts, src/core2/modules/residents.ts

**Notes.** Filed Oct 24 by the speed lead. Bounds PR #5433 (branch claude/speed-live-households, sent back Oct 21 for naming the GC umbrella) and adds the module-table list cache from claude/speed-kernel-copies.

Not shipped yet, Oct 24 (speed lead): inside the noise. Paired runs on base 185d76d7ce (both checkouts in one process, months alternated): Long Hill (seed m7b) 237.5 to 223.6 s (0.941) in the first pair and 246.4 to 247.7 s (1.005) in the second; Stanardsville, Virginia (seed cc91f5444b53bd47) 0.964, 0.985 and 1.015 for years one to three. Deep fingerprints identical in every pair, and the module-state, residents and fill-in tests pass with the break-it check done, so the branch (`claude/speed-live-households`, merged with main locally, not pushed) is ready if a later cut in the same readers takes it over the noise. Under the speed work order a fix that saves less than the noise is not shipped.

Defect found on the branch, Oct 24 (speed lead): `counted-demotion.test.ts` ("demotes it after a long while out of the player's life", Lawrence, New York, seed 69fb54d718cc69e358245405c6c5c465) fails on `claude/speed-live-households` with a demoted person still holding 129,685 instead of 0, and passes on main 185d76d7ce, so one of this branch's readers changes what demotion sees (the reused walk result or the cached row list); find and fix it before this ships. `fill-in-returning-dead-member.test.ts` fails on main too (filed as `core-fill-in-returning-commuter-job-start`).

Bisected, Oct 24 (speed lead), on base 185d76d7ce: with only the household walk change (`counted-groups.ts` and `residents.ts` from #5433's commit 2aa343dbea) `counted-demotion.test.ts` fails (a demoted member no longer found among the counted residents); with only the row-list cache (`module-state.ts`) all 3 of its tests pass. The walk differs from the generator it replaced in two ways a caller can see: it reads the household list when the walk is asked for, not when it starts, and it can be walked again from the start, where a generator, once partly read, continues; the failing reader is not yet found (it may also be one of the two readers that commit rewrote). The row-list cache can ship on its own once it is measured clear of the noise.
