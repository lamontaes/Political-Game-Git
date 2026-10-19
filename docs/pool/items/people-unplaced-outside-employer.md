---
id: people-unplaced-outside-employer
title: "Commuting workers have an employer on the books: the place's outside account employs them, with pay and withholding"
area: people
kind: stopgap
priority: 2
size: M
status: open
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:25:08.641Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Tried Oct 19 (claude/peaceful-ritchie-03780x).** Started a job for a jobless full person at the place's outside-market account with a copied commitment and calendar (`api.startJob`), then advanced 60 days. Payroll stopped in `FinanceCashPlanner.available` (src/core2/finance-plan.ts): "Outside payment requires preparation of its actual due obligation." An outside account may pay only against an exact due record that a module resolver authorizes (`authorizeOutside`; see src/core2/finance-cash.ts and src/core2/public-work-pay.ts). So this item needs a new outside-wage obligation domain in the finance cash layer, which makes it L: split it before building. Withholding itself needs nothing new: every work payroll receipt reaches `withhold` in src/core2/modules/budgets.ts. The narrower fix that landed first (the filled-in flow is withheld, #5076) closes only the "untaxed" half of SG-CORE-filled-unplaced-income.
