---
id: core-old-imports-opening-work
title: "The opening's work schedules come from the core, not the old work-schedules code"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr: #5035
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The opening's work schedules still import the old work-schedules code. Read the core's own schedule data instead, porting only the part the opening uses. The old import is removed in the same change, so the opening builds schedules from one place.

**Rules.** Replace, never layer: the old work-schedules import is deleted when the core's read lands, and the PR body counts what was removed. One rule, all 56 places: schedules come from data, with no place named in logic.

**Done when.** In a drawn place and a seed the builder did not choose, `buildBenchWorld` opens with the same work schedules by record id as before the change, the tests for the changed files pass, and no import of the old work-schedules module remains in the opening files.

**Files.** src/core2/opening-work.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

**Looked at Oct 17 (claude/old-imports-town-households), not built, and the size is wrong.** `canonicalOpeningSchedules` calls `workSchedulesFor(world, personId, date)`, which builds a per-world index of every active job from the old World's history (work relationships, roles and rosters, through `currentLifeCutoff`, `organizationProfileAt`, `scheduledActivityState` and `townWorkplaceFor` in town-employment). The schedule shapes (`WORK_PATTERNS`, the title and workplace pattern tables, lines 47 to 240) are data and can move to a core data file as they are. The part that decides a job's pattern (`jobShape`, `scheduleOf`, the rosters for rotations) reads old-engine records that the opening builds before the core exists. It is therefore best ported together with core-old-imports-opening-employment and core-old-imports-population, which build those records, and should be M. Take it after the employment part.

Sent back 2026-10-23 from PR #5035 (branch claude/old-imports-opening-work): The definition-only slice names already-ported helpers and pattern data, while its in-pr PR link would falsely complete the still-unimplemented opening-work task; finish on that branch, merge main into it first.

Sent back 2026-10-24 from planning PR #5035 (branch claude/old-imports-opening-work): own-environment applicable checks passed on 2f8bcb91dc390ed3df2a36eb86799138682257db, but the head-pinned merge returned 405 merge conflicts after main advanced; implementation acceptance remains open. Finish the planning merge on that branch, merge current main into it first and rerun the changed-file checks.
