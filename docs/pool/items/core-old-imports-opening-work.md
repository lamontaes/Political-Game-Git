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

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Looked at Oct 17 (claude/old-imports-town-households), not built, and the size is wrong.** `canonicalOpeningSchedules` calls `workSchedulesFor(world, personId, date)`, which builds a per-world index of every active job from the old World's history (work relationships, roles and rosters, through `currentLifeCutoff`, `organizationProfileAt`, `scheduledActivityState` and `townWorkplaceFor` in town-employment). The schedule shapes (`WORK_PATTERNS`, the title and workplace pattern tables, lines 47 to 240) are data and can move to a core data file as they are. The part that decides a job's pattern (`jobShape`, `scheduleOf`, the rosters for rotations) reads old-engine records that the opening builds before the core exists. It is therefore best ported together with core-old-imports-opening-employment and core-old-imports-population, which build those records, and should be M. Take it after the employment part.
