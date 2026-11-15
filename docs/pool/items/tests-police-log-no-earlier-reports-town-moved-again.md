---
id: tests-police-log-no-earlier-reports-town-moved-again
title: "Surrency's police log now has a usual to compare, so the no-earlier-reports check moves to St. Marys, Iowa"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: interviews thread
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
source: "Train #9554 (29ef4685) bisect, Nov 15, 2026: red right after the fold of #9117 5c3dc321"
root: none
---

**What.** In `src/bench/printed-police-log.test.ts`, the case "a town with no earlier reports compares no month and says nothing of the usual" at Surrency, Georgia (1374852, seed pl4) is red on the Train with #9544 merged: "police-log:2025-11 has no usual to compare: expected '9' to be undefined".

**Cause.** Measured on Surrency, pl4, 330 days, before and after the fold of #9117 (058294ec, 4fcbe42e). After renters-buy, Surrency keeps renting households: 11 renting and 35 owning by November, against 4 and 41 before. Renters carry more property-crime exposure (data/crime/victimization.json), so expected other-property crime rises from 0.661 to 0.724 a month. The carried remainder crosses one in November instead of December, and November's report is real. November's log then has July's report behind it: a usual of 0.1 over nine months, vsUsual 9. The old premise, one reported month in the first eleven, is gone. The renters thread confirms the tenure direction is intended.

**Fix.** Re-pin the case to a town that reports crime in exactly one month of its first eleven, found by a script outside the test (seeds pl10 to pl60 on 29ef4685, capped at one hour): St. Marys, Iowa (1970095, seed pl42), one report month, October 2025. The old premise is kept in the test's comment.

**Time box.** 1 hour.

**Rules.** Named place and seed, pinned by record id; no draw, no staging, no loosening of the check.

**Done when.** The case passes at St. Marys (pl42) on the Train head with #9544, and the same check is red at Surrency (pl4) on that head.

**Waits on.** #9544 folding.

**Files.** src/bench/printed-police-log.test.ts
