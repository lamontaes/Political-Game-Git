---
id: core-fast-clock-part-1-a-results-mode-for-skipped-time
title: "The fast clock, part 1: time nobody watches runs each engine's dated work only, and day-by-day play resumes after it"
area: core
kind: feature
priority: 1
size: M
status: merged
standard: 2
claimed-by:
pr: #8171
after:
blocked-on:
lead: speed
model: opus
effort: high
root: design-country-tier
source: split from core-fast-clock-twenty-years by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
merged-at: 2026-11-10T18:59:24.000Z
---

**What.** The world has one speed: every day runs every engine's day and every person due to act. This part adds a second way to advance, for time nobody is watching: each engine's dated work runs, the daily loops and people's own days do not, and play picks up day by day afterward without an error. It is the base the other parts of the fast clock add their monthly steps to.

**Cause.** Found in code: `advanceCore` (src/core2/life.ts line 576) calls `runDay` (line 536) for every day, which runs every module's `onDay`, the planned acts and every person due. Measured in Chumuckla, Florida (953 people; world seed aa4665b284a797eb671c6eafef8865086489b881e3eb81e1116a200598fb6482), one year: 41.5 seconds day by day; 14.6 seconds with only the module calendar's dated work, after which the first played day fails with "Business reviews must advance chronologically" (src/core2/finance-state.ts line 1471).

**Fix.** Give `advanceCore` an option, results mode. For each skipped day it runs `runModuleCalendar` (src/core2/module-calendar.ts line 215) and the end-of-day compaction, and skips the modules' `onDay` and the people due. Add one optional hook to the module interface (beside `onDay` and `onAfterDay`), called on the first day of each month in results mode, in which an engine brings its own daily work up to date with its own functions. In this part only the finance engine gets one: it settles everything that fell due in the skipped month (budgets that ended, business reviews, and bills, since the finance engine also refuses a skipped bill period with "Finance bills must settle chronologically, without skipped periods"), so the first played day after a skip does not throw. The hook is named `onResultsMonth`. The player's clock is not touched. A controlled person's household is never skipped past: results mode refuses while a person is controlled, as `advanceCore` does today.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One engine per mechanic: the monthly hook is each engine's own code at a coarser pace, never a copy of it. Bookkeeping is a debug switch. No dice. Speed: nothing in the hook walks all history. What a skipped year does not yet do (deaths, prices, hiring, campaigns) is said plainly in the pull request and belongs to parts 2 to 4.

**Done when.** A second session runs the new test in a drawn place it names with its seed and reads its printed line: the seconds one year took day by day and in results mode, and that seven days of day-by-day play after the skipped year finished with no error. It does the same in two more drawn places. Once part 6 is on main it presses the control in the running game and plays a week afterward.

**Waits on.** Nothing.

**Files.** src/core2/life.ts, src/core2/module-calendar.ts, src/core2/finance-state.ts, src/core2/results-mode.test.ts (new)

**Notes (Fable B, Nov 10, marked merged by hand).** Pull request 8171 merged at 2026-11-10 18:59 UTC and built this item, but the item stayed in review: its `pr:` field held the number with no `#`, which the merge's flip does not match, and the pull request's first line named no item (pool item pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash). A second session's check in the game is still owed.
