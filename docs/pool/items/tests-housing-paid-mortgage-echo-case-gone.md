---
id: tests-housing-paid-mortgage-echo-case-gone
title: "The paid-mortgage test's named Echo replay no longer has a paid household beside another group's shortfall"
area: release
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: none
checked: Account lead 2026-11-14
source: Account lead T45, Nov 14 2026, red on the clean train 998ba95bf5 and on #9084 alike
---

**What.** `src/core2/housing-paid-mortgage.test.ts`, case 'reported Echo shortfall', fails: "Echo, Utah 4921880 2d3cadf85fab…c335: no paid household alongside another group's shortfall: expected 0 to be greater than 0". The case was a named replay of the defect fixed by housing-mortgage-balance-grows-while-paid (#7243). The world at that seed no longer holds the situation, so the test checks nothing there. Seen: no player-visible effect; the test is red on the train.

**Cause.** Measured: Echo UT (4921880), seed 2d3cadf85fab3908af3e4cdbe95e98d5a45108549587024e8f762e4ba336c335, same message on the clean train 998ba95bf5 and on #9084. Found in code: the case is pinned to a named place and seed (housing-paid-mortgage.test.ts line 39) and has no fallback when the world drawn from that seed has changed since Nov 4.

**Fix.** Make the case find its situation by drawing places and waiting (skill `drawn-place-tests`): a paid household whose group's month has a shortfall elsewhere, and name what it passed over. Keep the assertion that the household's own payment is credited before and after fill-in.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Drawn-place tests: a test finds its case, never fails or passes by the luck of one seed.

**Done when.** A second session runs housing-paid-mortgage.test.ts on main with two seeds it draws and sees the case find a paid household beside a shortfall and pass, naming place and seed.

**Waits on.** Nothing.

**Files.** src/core2/housing-paid-mortgage.test.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request.
