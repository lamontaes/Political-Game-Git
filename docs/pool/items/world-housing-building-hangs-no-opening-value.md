---
id: world-housing-building-hangs-no-opening-value
title: "A town with no owner-occupied home at the opening hangs the game when the first one appears: building starts divide by an opening home value of zero (Millwood, Georgia, seed pc8)"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/housing-no-opening-value
pr: #5048
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T10:01:32.047Z
---

**What.** A town whose opening has no owner-occupied home or no rent records an opening home value or rent of zero on its housing stock row. The first month a value exists, building divides today's value by that zero, the number of starts becomes infinite, and the monthly building loop starts projects for ever, so the game never returns. In the played world from the start with seed pc8 (Millwood, Georgia, 1,762 people, 25 rental units) the headless path check ran for 28 minutes without finishing; stopped, it stood in the housing builder's month on December 1, 2025. The first month a value exists should become the base the town's building is measured against, since no opening figure was ever set.

**Rules.** Estimate, never UNKNOWN: a base starts from the first value the place has, kept on its row. Speed: no loop may run on a quantity that can be infinite. No dice: starts follow value, cost, zoning and cash as before. One rule, all 56 places: the guard is on the figure, never on a place.

**Done when.** In the played world (`buildBenchWorld`, a drawn place and a seed the builder did not choose, with the stock row's opening base set to zero after the first month) the month's building ends, starts at least one project, and leaves a positive base on the row; `src/core2/housing-no-opening-value.test.ts` states it and times out on main.

**Files.** src/core2/housing-construction.ts

**Notes.** Found Oct 18 (claude/housing-no-opening-value) running `src/bench/path-check.ts` for seed pc8, found with a debugger paused on the running process. The row's opening value comes from the median of owner households' homes at the opening (`townFigures` in modules/housing.ts), which is empty in a small town; the path check then finishes in about 50 seconds.
