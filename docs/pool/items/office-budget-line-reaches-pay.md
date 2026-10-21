---
id: office-budget-line-reaches-pay
title: "An amended budget line changes what the people it funds are paid: today a treasury pays wages first and the line's due amount follows"
area: office
kind: wiring
priority: 3
size: M
status: claimed
claimed-by: claude/budget-line-reaches-pay
pr: #5588
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T15:16:19.100Z
---

**What.** PR #5573 showed the money moves against an amended administration line but a city employee's pay does not depend on the line's size. Make the line's amount an input the treasury reads when it sets or holds a department's payroll.

**Rules.** An effect is a read not a record; No dice; One rule all 56 places; Replace never layer

**Done when.** In a drawn place and seed a budget amendment cutting a line changes a named employee's later paycheck or hours, followed by record id.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/treasury.ts

**Notes.** Found by the office-budget-season-payment-chain session (#5573).

Sent back 2026-10-20 from PR #5588 (branch claude/budget-line-reaches-pay): school teachers are counted workers since #5568, so the budget-line-schools-staffing test's named-teacher precondition never holds and it fails in every draw with main merged in; prove the line change on the district's counted payroll; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5588 (branch claude/budget-line-reaches-pay): Merging current origin/main conflicts in src/core2/budget-line-schools-staffing.test.ts and src/core2/law-reach/group-a-staffing.ts. This branch now carries the #5632 fixes, but both branches conflict with the staffing changes that have since landed on main. Resolve these code conflicts against current main and rerun the counted-teacher cut and raise proofs before resubmission.; finish on that branch, merge main into it first.

Oct 21 (claude): PR #5588 carried #5632's staffing fixes, not this item's work, and its head failed the schools staffing test; it is now emptied to main and #5632 holds the staffing fix. Not built: a budget amendment that cuts a line does not yet change a named employee's later paycheck or hours. Start from `src/core2/modules/budgets.ts` and `treasury.ts` (where the treasury sets or holds a department's payroll) and read the amended line there. Claim released.

Oct 21 (claude, second look): part of this is already on main. `law-reach-group-b.test.ts` "budget line schools: a change re-rates school staff pay from base" amends the schools line in a drawn place and asserts school staff `hourlyMinor` rises (`rerateJob`, by job record id) and returns to base on reversal, and the staffing test (#5632) shows a raise hiring named adults and a cut ending named teachers' jobs. What is still missing is the department-level case the item names: an administration or other non-school line cut changing a named employee's pay or hours (budgets.ts / treasury.ts). The item should be re-specified to that line, or closed against the schools proof, by the CTO. Not built.

Oct 21 (claude, claude/budget-line-reaches-pay): the non-school case is already built: `budget-line:administration` is in the staffing rules (`reach-group-a.json`, employers "cityGovernment" = `service:municipal-government`), so a cut re-sizes city hall's funded staff and the next-morning round ends its newest hires' jobs. Missing was the proof: `src/core2/budget-line-administration-staffing.test.ts` has the mayor cut the administration line in a drawn place, then checks the staffing row (base, positions), the laid-off people and each ended job's `endsAt` by job record id. Their later pay stops with the job. Hours are not changed by a line (only headcount).
