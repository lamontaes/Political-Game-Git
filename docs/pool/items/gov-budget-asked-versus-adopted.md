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
---

**What.** The approved Budgets screen shows each line with 'Asked' and 'Last year' on one small line. Last year comes from the prior budget, which the game keeps. What a department asked for is built (departmentRequests in budgets.ts) but not kept beside the adopted line, so the Fixer's screen shows Last year only. Keep the request and the adopted figure together per line and per fiscal year, and who wrote the adopted budget.

**Rules.** No placeholder numbers: the requested figure is the department-request computation's own output, recorded when the budget is written. One budget engine. An effect is a read: the Budgets screen reads the kept figure. Memory: old years fold into summaries once nothing reads them. Wire to the world: the change is proven in a generated world through the engines that already read it, not in a test's own small world.

**Done when.** In a played year, the Budgets screen shows Asked beside Last year for each line of a budget written in that run, each Asked equal to the request recorded for that line by record id; a line with no recorded request shows Last year only.

**Files.** src/core2/modules/budgets.ts, src/bench/budget.ts, src/bench/play.mjs

**Notes.** TODO
