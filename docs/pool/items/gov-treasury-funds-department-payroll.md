---
id: gov-treasury-funds-department-payroll
title: "A treasury keeps back the payroll of the employers it funds and matches a state or national office to its treasury by jurisdiction"
area: gov
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/treasury-funds-departments
pr: #5019
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T00:57:39.244Z
---

**What.** Two rules in the Government engines that the town departments' pay needs. At a month's close a treasury keeps back its employees' wages for the coming month (`payrollReserve`, `src/core2/budgets-treasury.ts`); it should also keep back the wages of every employer it funds through `api.fundPublicPay`, or the lines paid out first leave nothing for payday (the village treasury in Arlington, Wisconsin, seed sp1, paid its own staff $41,000 short in a year once its departments drew on it). And a state's or the nation's office in town carries a jurisdiction, not a local government key, so `sameGovernment` matches an employer to its treasury by key where it has one and by jurisdiction where it does not, and the state and national treasuries now record their jurisdiction ids (`src/core2/government-jurisdictions.ts`).

**Rules.** An effect is a read: the close reads the funded employers' jobs. One rule, all 56 places: a state's treasury carries its own jurisdiction from the place data. Every dollar balances. Replace, never layer: `notePublicPay` and the funding loop in `openBudgets` use the one matching function.

**Done when.** In a drawn place and a seed the builder did not choose (named in the PR body), `src/core2/treasury-government-match.test.ts` shows a treasury's reserve covering the wages of a funded employer with staff, and the state and national treasuries carrying the jurisdiction ids the matching function reads.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/government-jurisdictions.ts, src/core2/data/government-jurisdictions.json

**Notes.** Split Oct 17 from the department pay change (world-public-employer-staff-never-paid, PR 4984) because the merger asked that the Government part land on its own. That change stacks on this one. Nothing is linked by this change alone, so no dollar moves until the departments carry an authority.
