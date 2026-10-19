---
id: world-counted-renters-buy
title: "A counted renter household buys a new house through its group's accounts: rent part ends, mortgage part starts"
area: world
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/counted-renters-buy-g08lgv
pr: #5252
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:13:50.152Z
---

**What.** New houses sell only to full renter households, so in a played year a town's finished new houses pile up unsold and no counted renter ever buys one. A counted renter household should weigh buying by the same rule as a full one (its income, savings and the price), and when it buys, its group's rent part ends, a mortgage part starts and the builder is paid the down payment from the group's fund. The player would notice new houses selling to families in town and the town's homeownership moving with its prices.

**Rules.** One model, two tiers: a counted group buys under the same affordability rule as a full person, times its count, through keyed group accounts. Sliding scales and causes: buying follows income, savings and price, with no threshold that flips. Every dollar balances: the down payment and loan are journal records that net to the home's price. No dice: which groups buy comes from their own money and costs.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body), a counted renter group buys a finished new house, shown by the house, the group's fund and the closing record ids, the town's unsold new houses stop rising, and the stopgap SG-WORLD-housing-new-home-buyers is resolved; the test is in src/core2/housing-construction.test.ts.

**Files.** src/core2/housing-construction.ts, src/core2/modules/housing.ts, src/core2/counted-money.ts, src/core2/residents-economy.ts

**Notes.** Split from world-stopgap-housing-construction-faked-mechanic (Oct 19), which holds the measurement: Manchester Center, Vermont had 3 new houses unsold and no purchase after a year.
