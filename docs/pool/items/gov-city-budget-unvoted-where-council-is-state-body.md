---
id: gov-city-budget-unvoted-where-council-is-state-body
title: "A city budget is voted where the place's council is modeled as its state-level legislature"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5588
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** Where a place's city and state government are one body, its council is built as the state-level unicameral legislature, and no chamber is attached to the city government. The mayor's propose-budget act sets priorities on the city government (setBudgetPriorities), but councilBudget in src/core2/modules/legislature.ts never runs for it (budgetChambers finds no city chamber). So each year the city budget is 'carried forward by the budget rule until the council or legislature votes it', and the mayor's changes never reach a vote. Meanwhile the state-level budget bill that council does pass carries every line at 0 (provisions with of: 0). Route the city budget to the body that actually governs it, from the place's government records (the city's council is the state-level chamber where the records say they are one), so the mayor's proposal is voted, passed, amended or rejected like any council's, and a passed change becomes the adopted line.

**Rules.** One rule, all 56 places: the route comes from the place's government records, never a place named in logic. No dice: the council's vote decides by its members' views, duty and the law. Replace, never layer: the carried-forward default stays only for a budget whose body did not vote.

**Done when.** In a one-year played world (buildBenchWorld) of a place whose council is its state-level legislature, drawn from all 56 by that record and named with its seed in the PR, the mayor's proposed administration change goes to a council budget bill by record id, the vote is recorded, and when it passes the city's adopted budget for the next fiscal year carries the change (the adopted line differs from the carried-forward one); src/core2/budget-line-administration-staffing.test.ts passes for such a draw.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/office-day-acts.ts, src/core2/budget-line-administration-staffing.test.ts

**Notes.** Found Oct 25, 2026 by the fixer on PR 5588 (office-budget-line-reaches-pay): the merger's drawn place 1150000, world seed f73674b020840528c35ee69e493ace9ce2b5ece15f39c2162b48622e3256ae64, kept its administration line at 190276913260 because the city budget (budget:place:1150000:2025) was carried forward unvoted; the council's own budget bill (HB 34) passed with every line 0.
