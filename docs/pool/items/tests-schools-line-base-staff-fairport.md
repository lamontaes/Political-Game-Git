---
id: tests-schools-line-base-staff-fairport
title: "The schools-line staffing test fails in Fairport, New York: the staffing row's base counts one or two fewer teachers than the test"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6148
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `src/core2/budget-line-schools-staffing.test.ts` fails on main 48a52cc156 in Fairport, New York (3625076), the fourth place its seed fd3206c32c6734df draws (place seed 32d3fd2544eb…). Both cases fail on the same line: the staffing row's `baseStaff` is 62 teachers, while the test counts 63 teachers in place, named and counted. On the justice family's branch the test counts 64 against the same 62. The engine takes its base when the bill's change runs (`src/core2/law-reach/group-a-staffing.ts`), and the test counts afterward. So a teacher who joins or leaves between those two moments, or a counted teacher one side counts and the other does not, would explain the gap; the cause is not traced.

**Rules.** One model, two tiers: a counted teacher counts toward the district's staff with the same rule in the engine and in the test, times its count. One rule, all 56 places: the base is taken the same way in every drawn town.

**Done when.** The test passes in Fairport, New York (draw 3 of seed fd3206c32c6734df, reproduced by starting the draw loop at 3) and on a fresh seed, in a world from `buildBenchWorld`. The fix names which teacher the two counts disagreed on, by person or counted-job id. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/budget-line-schools-staffing.test.ts, src/core2/law-reach/group-a-staffing.ts

**Notes.** From the laws lead, Oct 24: reproduced on main and on claude/laws-nine-links-justice (a76605eef4) with the draw loop pinned to 3.

Merger 0: Sent back 2026-10-26 from PR #6148 (branch claude/schools-base-staff): own merged-tree validation blocked by this merger workspace's invalid GH_TOKEN/HTTP401, preventing real-head fetch and main integration/push; no code defect claimed. Status/Notes updated through connected GitHub because the pool CLI cannot authenticate. Finish validation on that branch with working checkout credentials, merge main into it first.

Merger 0: Rechecked after authentication recovered, 2026-10-26, PR #6148 branch claude/schools-base-staff at 432c50894f90b690a0e8c2f7a3ebb09d397e1c70. Sent back for a code conflict in src/core2/budget-line-schools-staffing.test.ts when integrating current main; merge aborted with no hand resolution, push or checks on a conflicted tree. Keep main's recorded council-reason/producer guard while integrating the eve-of-year count and government-specific base fix, then rerun named Fairport and fresh generated-world evidence. Current open CLI succeeds; this actual conflict reason supersedes the resolved authentication blocker. Finish on that branch, merge main into it first.
