---
id: office-budget-line-reaches-pay
title: "An amended budget line changes what the people it funds are paid: today a treasury pays wages first and the line's due amount follows"
area: office
kind: wiring
priority: 3
size: M
status: claimed
claimed-by: claude/budget-line-reaches-pay
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:02:49.960Z
---

**What.** PR #5573 showed the money moves against an amended administration line but a city employee's pay does not depend on the line's size. Make the line's amount an input the treasury reads when it sets or holds a department's payroll.

**Rules.** An effect is a read not a record; No dice; One rule all 56 places; Replace never layer

**Done when.** In a drawn place and seed a budget amendment cutting a line changes a named employee's later paycheck or hours, followed by record id.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/treasury.ts

**Notes.** Found by the office-budget-season-payment-chain session (#5573).
