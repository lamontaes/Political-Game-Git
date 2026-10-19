---
id: core-old-imports-opening-work
title: "The opening's work schedules come from the core, not the old work-schedules code"
area: core
kind: cleanup
priority: 2
size: S
status: claimed
claimed-by: claude/old-imports-opening-work
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:02:59.914Z
---

**What.** The opening's work schedules are built by the old engine's work-schedules code under src/simulation. Move what the opening still uses into the core and delete the old file once nothing imports it. The player notices nothing: the same town opens with the same schedules.

**Rules.** Replace, never layer: the old schedule code is deleted in the same change. Build only what the golden path needs, so port only the schedule rules the opening reads.

**Done when.** The reachability script lists no importer of src/simulation/living-world/work-schedules.ts from non-test code, that file is deleted with the count in the PR body, and the golden-path test and typecheck pass on a drawn-place world in buildBenchWorld.

**Files.** src/simulation/living-world/work-schedules.ts, src/core2/opening-employment.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
