---
id: gov-official-salary-through-payroll
title: "Officials' salaries are paid through the payroll with withholding, from salary rows that cite their source"
area: gov
kind: feature
priority: 2
size: M
status: done
claimed-by:
pr: #4679
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** An official's salary (`modules/official-pay.ts`) is a ledger transfer on the 1st, not a paycheck: no tax is withheld, another state's officials are paid by an outside payer, and the salary figures in data/research/offices/official-salaries-2026.json are marked "recalled published values", not cited to a statute or comptroller schedule (SG-CORE-official-salary). Pay each official through the payroll as a salaried seat job so income and payroll tax are withheld like any paycheck, pay from the matching treasury, and cite each state's salary to its statute or schedule (ESTIMATED with a spread where it can't be found). Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** One rule, all 56 places (no state named in code); research before building (every figure cites its source, SOURCED or ESTIMATED with spread); estimate, never UNKNOWN; an effect is a read (the payroll engine withholds, the treasury pays); the chain is the acceptance; no dice.

**Done when.** In a one-year run of a drawn place a state legislator's monthly pay shows a paycheck with withholding to the treasuries, traced from the treasury to the member's cash by journal record ids, and every salary row cites its source. SG-CORE-official-salary is resolved.

**Files.** src/core2/modules/official-pay.ts, data/research/offices/official-salaries-2026.json, src/core2/modules/budgets.ts

**Notes.** Split out of office-pay-through-the-payroll-and-per-diem, whose per diem half is verified: the table covers all 56 places and every row cites a source (office-day-per-diem-data.test.ts).

Sent back 2026-10-16 from PR #4679 (branch claude/gov-official-salary-payroll): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
