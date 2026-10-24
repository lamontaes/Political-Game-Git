---
id: tests-schools-line-base-staff-fairport
title: "The schools-line staffing test fails in Fairport, New York: the staffing row's base counts one or two fewer teachers than the test"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/budget-line-schools-staffing.test.ts` fails on main 48a52cc156 in Fairport, New York (3625076), the fourth place its seed fd3206c32c6734df draws (place seed 32d3fd2544eb…). Both cases fail on the same line: the staffing row's `baseStaff` is 62 teachers, while the test counts 63 teachers in place, named and counted. On the justice family's branch the test counts 64 against the same 62. The engine takes its base when the bill's change runs (`src/core2/law-reach/group-a-staffing.ts`), and the test counts afterward. So a teacher who joins or leaves between those two moments, or a counted teacher one side counts and the other does not, would explain the gap; the cause is not traced.

**Rules.** One model, two tiers: a counted teacher counts toward the district's staff with the same rule in the engine and in the test, times its count. One rule, all 56 places: the base is taken the same way in every drawn town.

**Done when.** The test passes in Fairport, New York (draw 3 of seed fd3206c32c6734df, reproduced by starting the draw loop at 3) and on a fresh seed, in a world from `buildBenchWorld`. The fix names which teacher the two counts disagreed on, by person or counted-job id.

**Files.** src/core2/budget-line-schools-staffing.test.ts, src/core2/law-reach/group-a-staffing.ts

**Notes.** From the laws lead, Oct 24: reproduced on main and on claude/laws-nine-links-justice (a76605eef4) with the draw loop pinned to 3.
