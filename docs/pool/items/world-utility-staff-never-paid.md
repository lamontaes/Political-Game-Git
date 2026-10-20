---
id: world-utility-staff-never-paid
title: "A town's electric and water utility staff are never paid: the utility holds no cash and takes in nothing from households"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/utility-household-bills
pr: #5033
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:20:13.489Z
---

**What.** The electric and water utility in a county (classification enterprise:utility) opened with no cash, no business books and no customers, so its staff were never paid: Yazoo City, Mississippi (seed d4) had 23 counted jobs and 30,161 asked per payday with nothing paid after four months. The utility is now a business kind with its sourced IRS corporation-return margin, pay share and cost share, so it opens with a cash buffer and books. Its customers are the households: a residential electricity service in the opening-customer data takes each household's Consumer Expenditure Survey electricity spending (by region and household size) as a monthly bill to the utility.

**Rules.** Wire to the world: the utility's money is household bills on the journal, read by payroll. One model, two tiers: counted households pay the same bill times their weight. Estimate, never UNKNOWN: the bill starts from the real survey average with its source.

**Done when.** `src/core2/utility-staff-paid.test.ts` passes in a drawn place and seed (named in its failure message): the utility has books, household bills reach it, and its wage flows paid at their last payday after 120 days; `node --import tsx scripts/core2-year/wages-unpaid-check.ts <seed>` lists no utility.

**Files.** src/core2/data/opening-customers.json, src/core2/data/business-books.json, src/core2/data/parameters.json, src/core2/utility-staff-paid.test.ts

**Notes.** Electricity only: gas and fuel oil are not modeled, and water, sewer and trash are a government's service charges. The utility pays no outside costs for the power it sells (it holds the difference as cash: $4.3 million after a year in Yazoo City), so a utility's margin is not yet real; a purchased-power outflow is the next step. Utilities with no recorded customers in town stay unpaid.
