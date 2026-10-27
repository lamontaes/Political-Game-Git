---
id: gov-officer-stipend-part-time-hours
title: "A town's appointed officers work a part-time schedule sized to their stipend, not a full-time week at a cut hourly rate"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** startPublicJob (src/core2/public-payroll.ts, stopgap SG-GOV-officer-stipend-hours) cuts a post's hourly rate to fit its budget line but keeps the full 8.5-hour public-office week, so Prescott, Michigan's planning director holds an 8.5-hour day at about $1.07 an hour. The pay in total is right; the hours and the hourly rate are not. The minimum wage now skips these posts by law (PR 6190), so nothing breaks, but the schedule, the hourly rate and the work the post attends do not match a part-time stipend.

**Rules.** Estimate, never UNKNOWN: hours and rate start from the real part-time municipal payroll figures with a spread and source. One rule, all 56 places. No dice. Replace, never layer: the cut-rate path is deleted when the part-time schedule lands.

**Done when.** In buildBenchWorld in two drawn places (seeds named), including a small town, every post whose line carries less than a full-time week holds a part-time schedule whose scheduled minutes times the going hourly rate equals the line's daily pay, no such post is scheduled for a full-time day, and SG-GOV-officer-stipend-hours is resolved; src/core2/wage-floor-exempt.test.ts and the staff and executive tests pass.

**Files.** src/core2/public-payroll.ts, src/core2/work-patterns.ts, src/core2/data/stopgaps.json

**Notes.** Time box: 3 hours, Sonnet, no helpers. Split from gov-town-officers-paid-under-minimum-wage (PR 6190).
