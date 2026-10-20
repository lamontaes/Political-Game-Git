---
id: core-counted-weight-wage-overpays
title: "A counted payroll pays about 1.2 percent more than its households' weights allow (Western Springs, Illinois, seed 7948de2094a32969f465293c52050d63bce0e46645b5a0729d7fd22ccbc0190c)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** counted-weight-money.test fails in Western Springs, Illinois, seed 7948de2094a32969f465293c52050d63bce0e46645b5a0729d7fd22ccbc0190c: the payroll flow residents:wages:opening-payroll-calendar for one organization paid 37,454,550 on 2025-02-20 against a ceiling of 36,991,745 (the single-household payment times the pay-weighted mean household weight, plus 4). An employer short of cash may pay less but never more. Find whether the wage scale is computed from the wrong jobs or the payment carries an unpaid balance into its first payment, and fix the engine or the test's expectation.

**Rules.** One model, two tiers: a counted group pays as many times as it stands for and no more. No dice. One rule, all 56 places: the check draws its place and names it with the seed.

**Done when.** In the played world (buildBenchWorld), src/core2/counted-weight-money.test.ts passes for seed 7948de2094a32969f465293c52050d63bce0e46645b5a0729d7fd22ccbc0190c and for three fresh random draws, and every dollar still balances.

**Files.** src/core2/counted-money.ts, src/core2/counted-weight-money.test.ts, src/core2/modules/residents.ts

**Notes.** Found Oct 20 while fixing core-counted-weight-money-small-town-red.
