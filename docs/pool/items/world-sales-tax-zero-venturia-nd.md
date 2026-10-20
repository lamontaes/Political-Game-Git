---
id: world-sales-tax-zero-venturia-nd
title: "The sales tax in force collects nothing on the town's purchases in Venturia, North Dakota (budgets.test.ts fails on main with seed 3c95bb85)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/sales-tax-venturia
pr: #5546
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:36:59.327Z
---

**What.** budgets.test.ts 'the sales tax in force is collected on the town's purchases, each level's share to its treasury' fails on main for the draw Venturia, North Dakota (US-ND), seed 3c95bb8562a14177f929263165b4517d25ed5263bf83f68c84dead5d0aae3069:1, with 'expected 0 to be greater than 0': no sales tax reached a treasury in that run. Reproduce with GOLDEN_PATH_SEED set to that seed. Find why the town's purchases yield no tax there (a state with no local rate and a tiny town, a missing treasury, or purchases that never reach the collector) and make the test hold for it by fixing the cause.

**Rules.** No dice: the tax follows the law in force and the purchases made; Every dollar balances: the collected tax is exactly the treasuries' receipts; One rule, all 56 places: the check runs in the drawn place with the seed named, nothing is named in code.

**Done when.** With GOLDEN_PATH_SEED set to 3c95bb8562a14177f929263165b4517d25ed5263bf83f68c84dead5d0aae3069 the test in src/core2/budgets.test.ts passes in Venturia, North Dakota, because the cause is fixed in the engine rather than the place skipped, and the budgets tests pass in a fresh random draw.

**Files.** src/core2/budgets.test.ts, src/core2/modules/budgets.ts, src/core2/purchase-tax.ts

**Notes.** TODO
