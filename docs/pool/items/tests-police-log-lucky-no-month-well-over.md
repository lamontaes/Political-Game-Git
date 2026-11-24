---
id: tests-police-log-lucky-no-month-well-over
title: "At Lucky, Louisiana, the police-log test finds no month well over usual, where it once found two"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
source: "Interview check thread, Nov 15, 2026, gating the outlet-of-record change on train 53e4b29f"
root: none
---

**What.** `src/bench/printed-police-log-one-outlet.test.ts` at Lucky, Louisiana (seed s23) was pinned because it had two months the town's record puts well over usual. On the clean train 53e4b29f it has none in its 300 days: the Sept and Oct 2025 logs stand at 7 and 4 times usual and are not called well over. Seen: the paper never says the town had an unusually busy month there.

**Cause.** Measured: Lucky, Louisiana (2246370), seed s23, 300 days on train 53e4b29f, from the test's proof file: police-log:2025-09 vsUsual 7 and police-log:2025-10 vsUsual 4, neither with `busier: "yes"` (`monthIsWellOver` in src/core2/modules/press.ts). Which fold changed it is not yet bisected.

**Fix.** Bisect the train's folds with this test alone (red-main skill, bisect by folds) to the change that stopped the busy month, and say whether the new reading is right. If it is, re-pin the check to a place and seed that has such a month, with the old premise in the test.

**Time box.** 2 hours.

**Rules.** No dice: a month is called busy from the town's own usual and the chance of a month that busy, never from a roll.

**Done when.** The cause is named by fold and code line, and the test checks a month well over usual at a named place and seed that has one. A second session plays a drawn place for a year on main, names its seed, and sees the paper call a busy month once the town's record has one.

**Waits on.** Nothing.

**Files.** src/bench/printed-police-log-one-outlet.test.ts, src/core2/modules/press.ts
