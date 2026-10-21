---
id: office-budget-line-reaches-pay
title: "An amended budget line changes what the people it funds are paid: today a treasury pays wages first and the line's due amount follows"
area: office
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr: #5588
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** PR #5573 showed the money moves against an amended administration line but a city employee's pay does not depend on the line's size. Make the line's amount an input the treasury reads when it sets or holds a department's payroll.

**Rules.** An effect is a read not a record; No dice; One rule all 56 places; Replace never layer

**Done when.** In a drawn place and seed a budget amendment cutting a line changes a named employee's later paycheck or hours, followed by record id.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/treasury.ts

**Notes.** Found by the office-budget-season-payment-chain session (#5573).

Sent back 2026-10-20 from PR #5588 (branch claude/budget-line-reaches-pay): school teachers are counted workers since #5568, so the budget-line-schools-staffing test's named-teacher precondition never holds and it fails in every draw with main merged in; prove the line change on the district's counted payroll; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5588 (branch claude/budget-line-reaches-pay): Merging current origin/main conflicts in src/core2/budget-line-schools-staffing.test.ts and src/core2/law-reach/group-a-staffing.ts. This branch now carries the #5632 fixes, but both branches conflict with the staffing changes that have since landed on main. Resolve these code conflicts against current main and rerun the counted-teacher cut and raise proofs before resubmission.; finish on that branch, merge main into it first.
