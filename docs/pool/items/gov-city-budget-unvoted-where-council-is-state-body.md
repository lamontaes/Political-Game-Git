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

**Done when.** In a one-year played world (buildBenchWorld) of a place whose council is its state-level legislature, drawn from all 56 by that record and named with its seed in the PR, the mayor's proposed administration change goes to a council budget bill by record id, the vote is recorded, and when it passes the city's adopted budget for the next fiscal year carries the change (the adopted line differs from the carried-forward one); src/core2/budget-line-administration-staffing.test.ts passes for such a draw. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/office-day-acts.ts, src/core2/budget-line-administration-staffing.test.ts

**Notes.** Found Oct 25, 2026 by the fixer on PR 5588 (office-budget-line-reaches-pay): the merger's drawn place 1150000, world seed f73674b020840528c35ee69e493ace9ce2b5ece15f39c2162b48622e3256ae64, kept its administration line at 190276913260 because the city budget (budget:place:1150000:2025) was carried forward unvoted; the council's own budget bill (HB 34) passed with every line 0.

Sent back 2026-10-25 from PR #5588 (branch claude/budget-line-reaches-pay): current-main head e0c51ae576 fails the raise payroll proof at budget-line-administration-staffing.test.ts:192 in Worley, Idaho (1688480), independent root cef553a7f374d5e75a07778b1a15fd77, world seed c178de8f3b3288aac2e9dd092ab200910a1abdec5c2dc6eeb443e826535e5850 (adopted administration 2373322 + 1582214, zero new hires); preserve this failure, prove shared-government payroll and add the routing item's Done-when table row (the body still says proof only); finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5588 (branch claude/budget-line-reaches-pay), checked 542f2acd5c14c56819112d845f12404f7183d801: the fresh root 4d270ecee38ac27ae50d1415c8d9cdcb draws Breda, Iowa (1908290), world seed 9c556e9e0b8b774aea57fc3f814fde92c552f37336befced09bbcb890e492429; a raise from 3922954 by 2615302 fills a counted job (person_4db3017461d05b47, group), but the test at line 221 counts only new full-person jobs and fails. Preserve this input and the named cut/payroll assertion; prove a nonempty legitimate hire and its actual later payment in either tier, not just an applied record. Original shared-government payroll/full-year recheck is still required and was not claimed green. Paired ADMIN_LINE_PLACE_KEY and ADMIN_LINE_WORLD_SEED now replay the original input without changing default draws or assertions. Finish on that branch, merge main into it first.

Merger 0, Oct 26: Sent back again from PR #5588 (branch claude/budget-line-reaches-pay), merged-main head fe5a8a6391: the counted-hire/payday correction fixes the prior single-tier check, but the author explicitly hands back Cornlea (3110600) with no hire in either tier within 75 days and only a truncated replay seed; test:254-257 remains unsatisfied and the body still claims the older all-green head. Preserve the complete input, distinguish absent eligible seekers from broken hiring through pre-treatment records without output redraw or forced hires, and update current evidence; finish on that branch, merge main into it first. No new local green gate claimed.
