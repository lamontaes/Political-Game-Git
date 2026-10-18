---
id: world-utility-staff-never-paid
title: "A town's electric and water utility staff are never paid: the utility holds no cash and takes in nothing from households"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The electric and water utility in a county (classification enterprise:utility, named like "Rural Electric Cooperative" or "Electric and Water") opens with no cash and no business books, so its staff are never paid. Yazoo City, Mississippi (seed d4): 23 counted jobs, 30,161 asked per payday, nothing paid after four months. The business-books table gives utilities no kind ("branch-or-institution-budget-required"), and no household bill reaches the utility. The households' living costs are paid to the outside account except the public charges the budgets module splits off.

**Rules.** Wire to the world: the utility's money must come from household bills on the journal, read by the business engine, not from a top-up. One model, two tiers: the same bill rate for a full household and a counted one, times its weight. Estimate, never UNKNOWN: the bill share starts from the real average with a spread and its source.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a drawn place and seed (named in the PR body), the utility's wage flows are paid at their last payday, and one household's monthly bill is followed to the utility's books and to a worker's paycheck by record id. `node --import tsx scripts/core2-year/wages-unpaid-check.ts <seed>` lists no utility.

**Files.** src/core2/living-cost-split.ts, src/core2/data/business-books.json, src/core2/data/parameters.json

**Notes.** Found 2026-10-18 with the wages-unpaid check (PR #5011) in 11 drawn towns. A utility share of household spending needs a sourced figure (the Consumer Expenditure Survey publishes electricity, gas and water by year); the repository holds none yet. The split seam in living-cost-split.ts already routes a share of living costs to governments and could take a second payee kind.
