---
id: gov-budget-asked-versus-adopted
title: "Asked versus adopted: keep what each department asked for beside what the budget adopted"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** The approved Budgets screen shows each line with "Asked" and "Last year" on one small line. Last year comes from the prior budget, which the game keeps. What a department asked for is computed (`departmentRequests` in the budgets module) but not kept beside the adopted line, so the screen's "Asked" is a figure derived from the line before the bill, not the recorded request. Keep the request and the adopted figure together per line and per fiscal year, and who wrote the adopted budget, so the screen can answer "since last year" (the Nov 8 budget screen ruling) from a record.

**Cause.** Found in code: `src/core2/modules/budgets.ts` `departmentRequests` (line 1460) computes the request; `src/bench/budget.ts` `totaled` takes an optional `askedMinor` callback (line 151) that is fed from `lineBeforeBill` (line 265), not from a kept request.

**Fix.** Record each line's request next to the adopted figure when the budget is written, per line and fiscal year, with the adopted budget's author, and have the Budgets screen read it for "Asked", showing "Last year" only where no request was kept.

**Time box.** 5 hours for one sonnet session.

**Rules.** No placeholder numbers: the requested figure is the department-request computation's own output, recorded when the budget is written. One budget engine. An effect is a read, not a record: the Budgets screen reads the kept figure. Speed and memory: old years fold into summaries once nothing reads them.

**Done when.** A second session plays a year in a drawn place (named with its seed), opens the Budgets screen, and sees "Asked" beside "Last year" for each line of a budget written in that run, each Asked equal to the request recorded for that line by record id; a line with no recorded request shows "Last year" only.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/bench/budget.ts, src/bench/play.mjs

**Notes.** TODO
