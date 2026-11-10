---
id: core-fast-clock-part-3-prices-pay-and-jobs-in-skipped-time
title: "The fast clock, part 3: prices, pay and hiring move in skipped time as they do day by day"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: high
root: design-country-tier
source: split from core-fast-clock-twenty-years by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
---

**What.** With only dated work running, a skipped year leaves prices flat and unemployment well above the day-by-day year's. Some of what moves prices and fills jobs runs in daily loops. This part finds which, and gives those engines a monthly step.

**Cause.** Measured: Chumuckla, Florida (953 people; world seed aa4665b284a797eb671c6eafef8865086489b881e3eb81e1116a200598fb6482), one year: prices up 1.2 percent and 4.0 percent out of work day by day; prices flat and 7.2 percent out of work with only the module calendar's dated work. Which daily loops make the difference has not been traced; the largest daily costs measured there were the health producer, the jobs engine and the news pass.

**Fix.** First list, from a profile of one day-by-day month (skill speed-work), every module's `onDay` and what it writes that the calendar's dated work does not; put the list in the pull request. Then give the jobs engine and the engine that sets the town's prices the monthly hook from part 1, each applying a month of its own daily work on counts: openings filled from the people looking, and the month's price change. Nothing else is added.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One engine per mechanic: each hook calls the engine's own functions. No dice. Sliding scales. Speed: a hook reads indexes the engine already keeps. One model, two tiers.

**Done when.** A second session runs the part's test in a drawn place it names with its seed and reads its printed line: the town's price change and share out of work after one year day by day and after the same year skipped. They are within a fifth of each other, or the pull request explains each difference by its cause. The share out of work never leaves the range from zero to all adults in any skipped month.

**Waits on.** core-fast-clock-part-1-a-results-mode-for-skipped-time.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/place-prices.ts, src/core2/life.ts, src/core2/results-mode.test.ts (new)
