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

Oct 21 (claude): PR #5588 carried #5632's staffing fixes, not this item's work, and its head failed the schools staffing test; it is now emptied to main and #5632 holds the staffing fix. Not built: a budget amendment that cuts a line does not yet change a named employee's later paycheck or hours. Start from `src/core2/modules/budgets.ts` and `treasury.ts` (where the treasury sets or holds a department's payroll) and read the amended line there. Claim released.

Oct 21 (claude, second look): part of this is already on main. `law-reach-group-b.test.ts` "budget line schools: a change re-rates school staff pay from base" amends the schools line in a drawn place and asserts school staff `hourlyMinor` rises (`rerateJob`, by job record id) and returns to base on reversal, and the staffing test (#5632) shows a raise hiring named adults and a cut ending named teachers' jobs. What is still missing is the department-level case the item names: an administration or other non-school line cut changing a named employee's pay or hours (budgets.ts / treasury.ts). The item should be re-specified to that line, or closed against the schools proof, by the CTO. Not built.

Sent back 2026-10-23 from PR #5588 (branch claude/budget-line-reaches-pay): the proof asserts ended job records rather than the named later paycheck/hours in acceptance (test:122-128); the raise case only checks funded positions (:130), and the body still says a one-third cut while code uses two thirds (:81-83); finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5588 (branch claude/budget-line-reaches-pay): both later-payroll proof cases fail at test:109 in Washington DC (1150000), seed f73674b020840528c35ee69e493ace9ce2b5ece15f39c2162b48622e3256ae64, because adopted administration stays 190276913260 instead of cut 63425637754 or raise 317128188766; follow the real adoption route and retain this regression before proving later payroll; finish on that branch, merge main into it first.

Fixer handed PR 5588 back Oct 25, 2026: in the merger's draw the city budget is never voted (the council is built as the state-level legislature), so no amendment can be adopted; blocked on gov-city-budget-unvoted-where-council-is-state-body for such draws.

Sent back 2026-10-25 from PR #5588 (branch claude/budget-line-reaches-pay): current-main head e0c51ae576 fails the raise payroll proof at budget-line-administration-staffing.test.ts:192 in Worley, Idaho (1688480), independent root cef553a7f374d5e75a07778b1a15fd77, world seed c178de8f3b3288aac2e9dd092ab200910a1abdec5c2dc6eeb443e826535e5850 (adopted administration 2373322 + 1582214, zero new hires); preserve this failure, prove shared-government payroll and add the routing item's Done-when table row (the body still says proof only); finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5588 (branch claude/budget-line-reaches-pay), checked 542f2acd5c14c56819112d845f12404f7183d801: the fresh root 4d270ecee38ac27ae50d1415c8d9cdcb draws Breda, Iowa (1908290), world seed 9c556e9e0b8b774aea57fc3f814fde92c552f37336befced09bbcb890e492429; a raise from 3922954 by 2615302 fills a counted job (person_4db3017461d05b47, group), but the test at line 221 counts only new full-person jobs and fails. Preserve this input and the named cut/payroll assertion; prove a nonempty legitimate hire and its actual later payment in either tier, not just an applied record. Original shared-government payroll/full-year recheck is still required and was not claimed green. Paired ADMIN_LINE_PLACE_KEY and ADMIN_LINE_WORLD_SEED now replay the original input without changing default draws or assertions. Finish on that branch, merge main into it first.

Merger 0, Oct 26: Sent back again from PR #5588 (branch claude/budget-line-reaches-pay), merged-main head fe5a8a6391: the counted-hire/payday correction fixes the prior single-tier check, but the author explicitly hands back Cornlea (3110600) with no hire in either tier within 75 days and only a truncated replay seed; test:254-257 remains unsatisfied and the body still claims the older all-green head. Preserve the complete input, distinguish absent eligible seekers from broken hiring through pre-treatment records without output redraw or forced hires, and update current evidence; finish on that branch, merge main into it first. No new local green gate claimed.

Sent back 2026-10-26 13:07 UTC from PR #5588, corrective ee124896abf09900b23550eb5f8c280d58206940 (branch claude/budget-line-reaches-pay): merging current main f5e368528a conflicts in src/core2/budget-line-schools-staffing.test.ts, src/core2/law-reach/group-a-staffing.ts and src/core2/modules/legislature.ts. The normal merge was aborted without code resolution or push. Complete Cornlea input is acknowledged but conditional raise acceptance is not yet locally reviewed; preserve original Cornlea, Breda and D.C. inputs, main shared-tier staffing/strengthened tests and current legislature paths. No completed gate claimed. Finish on that branch, merge main into it first.
