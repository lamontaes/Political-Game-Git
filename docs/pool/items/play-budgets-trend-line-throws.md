---
id: play-budgets-trend-line-throws
title: "The Budgets page throws an error because the trend line reads the wrong valueOf"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by the Box and scroll lane's ui-look run, Nov 23
claimed-at:
after:
lead: play-first
model: sonnet
effort: low
root: none
---

**What.** In every world the ui-look browser run opened (six drawn worlds, Nov 23), the page threw "Cannot convert undefined or null to object" while the run moved on from Politics, Bills. The Budgets page's history lines for total revenue and total spending were not drawn. Seen: the small line of yearly totals under revenue and spending on the Budgets page, missing today.

**Cause.** Measured: `npm run ui-look` (src/bench/ui-look.browser.mjs) at Pleasanton, Kansas, seed 45be95ba-c21d-44f1-b297-10f26876f850, lists "after politics > Bills: Cannot convert undefined or null to object (at valueOf | at Array.map | at trendLine (ui/trend-line.mjs:18:26))". `trendLine` (src/bench/ui/trend-line.mjs line 13) takes an options object and destructures `valueOf = (point) => point.minor` from it. An options object with no own `valueOf` (the `size` that `history` in src/bench/play.mjs passes as `{ height: 36 }` at lines 4760 and 4764 for total revenue and total spending) still has `Object.prototype.valueOf`, so the default is never used, and `history.map(valueOf)` calls that inherited function with no object, which throws. The Metrics screen (ui/metrics-screen.mjs line 62) passes its own `valueOf`, so it is not hit.

**Fix.** In src/bench/ui/trend-line.mjs rename the option `valueOf` to `valueAt` (default `(point) => point.minor`) and change the one caller that passes it (ui/metrics-screen.mjs line 62). Then Budgets draws its two lines. N8-P31 (Bills) on the Nov 23 sitting may be this error; check it after the fix.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the trend line draws the department's recorded yearly figures, and no screen computes a figure of its own. Replace, never layer: the option is renamed in its one part, with no second name kept.

**Done when.** A second session starts the bench on main in a drawn place (named with its seed), opens Politics and Budgets at 1440x900 and sees the revenue and spending history lines drawn with no page error; `npm run ui-look` lists no page error.

**Waits on.** Nothing.

**Files.** src/bench/ui/trend-line.mjs, src/bench/ui/metrics-screen.mjs

**Notes.** Filed by Box and scroll (lane 2), Nov 23. The error was first attributed to Bills because the run names the last menu it opened; the stack shows `trendLine` called from the Budgets page code.
