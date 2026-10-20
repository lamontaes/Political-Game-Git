---
id: world-territory-aides-unpaid-vi
title: "Every aide in Charlotte Amalie East, Virgin Islands (seed p3) is unpaid: the town opens with no full-tier job that has a schedule and payday to follow"
area: gov
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-yucp92-bx
pr:
blocked-on: world-territory-village-opens-with-no-employers
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:39:07.010Z
---

**What.** The merge audit asked for a pinned regression case territory:VI:charlotte-amalie-east, seed p3, in src/core2/staff-paid-every-place.test.ts. It fails on main: after 120 days all 19 aides hold the post without a job. Cause found Oct 20: startPublicJob (src/core2/public-payroll.ts) copies a schedule and payday from a full person's job, and in this world none of the 1,426 full-tier jobs has hours or a work commitment and calendar (the town's only jobs are zero-hour office seats), so every hire returns null. PR #5559's scheduleFromPlaceId points at the town, which holds the same seats. Counted jobs (residentsRuntime) carry schedules but are not read by startPublicJob.

**Rules.** Replace, never layer. One rule, all 56 places. Wire to the world: proven in buildBenchWorld. An aide hired with no job to follow must stop the game or carry a registered stopgap, never be silently unpaid.

**Done when.** The pinned case (seed p3, territory:VI:charlotte-amalie-east) is added to staff-paid-every-place.test.ts and passes: every aide has a job and is paid on payday, shown by record id; a hire that cannot find a schedule is a registered stopgap or a thrown error.

**Files.** src/core2/public-payroll.ts, src/core2/modules/staff.ts, src/core2/staff-paid-every-place.test.ts

**Notes.** Split from release-merge-audit-oct20-morning-fixes fix 5. Found Oct 20 by claude/political-game-pool-yucp92-as.
