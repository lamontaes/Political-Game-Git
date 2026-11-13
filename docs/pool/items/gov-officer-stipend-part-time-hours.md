---
id: gov-officer-stipend-part-time-hours
title: "A town's appointed officers work a part-time schedule sized to their stipend, not a full-time week at a cut hourly rate"
area: gov
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: none
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-gov-officer-stipend-part-time-hours
---

**What.** startPublicJob (src/core2/public-payroll.ts, stopgap SG-GOV-officer-stipend-hours) cuts a post's hourly rate to fit its budget line but keeps the full 8.5-hour public-office week, so Prescott, Michigan's planning director holds an 8.5-hour day at about $1.07 an hour. The pay in total is right; the hours and the hourly rate are not. The minimum wage now skips these posts by law (PR 6190), so nothing breaks, but the schedule, the hourly rate and the work the post attends do not match a part-time stipend.

**Cause.** Found in code: src/core2/public-payroll.ts line 111 (stopgap SG-GOV-officer-stipend-hours in src/core2/data/stopgaps/gov.json): a post whose line carries less than a full-time week is paid by cutting its hourly rate, not its hours.

**Fix.** Give such posts a part-time schedule from real part-time municipal payroll figures (with spread and source) so that scheduled minutes times the going rate equals the line's daily pay, and delete the cut-rate path.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: hours and rate start from the real part-time municipal payroll figures with a spread and source. One rule, all 56 places. No dice. Replace, never layer: the cut-rate path is deleted when the part-time schedule lands.

**Done when.** A second session, in buildBenchWorld in two drawn places (seeds named), including a small town, finds every post whose line carries less than a full-time week holding a part-time schedule whose scheduled minutes times the going hourly rate equals the line's daily pay, no such post scheduled for a full-time day, and SG-GOV-officer-stipend-hours resolved; src/core2/wage-floor-exempt.test.ts and the staff and executive tests pass.

**Waits on.** Nothing.

**Files.** src/core2/public-payroll.ts, src/core2/work-patterns.ts, src/core2/data/stopgaps/gov.json

**Notes.** Time box: 3 hours, Sonnet, no helpers. Split from gov-town-officers-paid-under-minimum-wage (PR 6190).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sized a stipend post's hours to its pay; the pay in total is already right and no screen shows the hours or hourly rate.

Released (2026-11-11): Read and scoped, not built: startPublicJob (public-payroll.ts lines ~108-170) copies the template's full-week commitment shape and divides the posted rate over its scheduled minutes; a part-time post needs a new weekly schedule (days and minutes per day) written into that commitment and its work calendar, plus a sourced part-time municipal pay figure (hours and going rate, with spread) that is not in the repository. Two parts: the sourced figure first (researcher), then the schedule build. Continue on branch claude/pool-gov-officer-stipend-part-time-hours.
