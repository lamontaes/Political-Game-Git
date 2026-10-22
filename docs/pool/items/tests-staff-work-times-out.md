---
id: tests-staff-work-times-out
title: "staff.test.ts's work-follows-record case runs past its 30-second default on a 4-core container (49.9 s on main)"
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

**What.** The M3-06 case 'a staffer's work follows their record, improves with experience, and every result traces to them' in src/core2/staff.test.ts builds a drawn world and plays it, and has no limit of its own. On a 4-core cloud container at one worker it took 49.9 s on main at 541e548704 and timed out at vitest's 30-second default. Measure where its time goes, and either give it a limit sized from that measurement or make the world it plays smaller where the case does not need the whole town.

**Rules.** Never loosen, skip or early-return a test; a limit is raised only with a measured reason written beside it. One rule, all 56 places: the case keeps drawing its place.

**Done when.** staff.test.ts passes at one worker on a 4-core container three times on random draws, with the measured time and place named beside any limit.

**Files.** src/core2/staff.test.ts

**Notes.** TODO
