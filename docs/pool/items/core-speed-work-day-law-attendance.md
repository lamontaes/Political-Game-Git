---
id: core-speed-work-day-law-attendance
title: "Paycheck taxes look up the law in force for every paycheck, and a day's attendance runs check-only work in play"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Every paycheck's Social Security, Medicare and unemployment shares (src/core2/modules/employer-taxes.ts) and every resident's local tax (src/core2/modules/budgets.ts residentLaw) ask the laws engine which law is in force, though the answer changes only when the laws table is written or the day changes. The work engine (src/core2/modules/work.ts) walks every module for an attendance hook that none defines, and src/core2/work-attendance.ts runs ownership checks and copies kept only for the guards. Both run for every worker every working day.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** paycheck taxes read one law-in-force answer per series a day, kept until the laws table is written, and attendance in play skips the module walk and the check-only work; npm run speed:year -- --seed long-1 --years 2 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table of the played world at year 2, with both runs' times in the PR body.

**Files.** src/core2/module-state.ts, src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/modules/employer-taxes.ts, src/core2/modules/work.ts, src/core2/work-attendance.ts

**Notes.** TODO
