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

**What.** A counted renter household (the wider population) that can afford a house should buy one through its group's accounts: its rent ends and a mortgage starts, with the down payment, the lender and the property tax on the journal. Today counted renters never buy. So the town's ownership share cannot move from the counted side.

**Rules.** One model, two tiers: the counted group is read by the same buying choice and mortgage rule as a full household, times its count. No dice: who buys follows income, savings, credit and the market. Wire to the world: the purchase moves money between the group, the lender and the seller.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named in the PR body), at least one counted renter group buys: the housing record id shows the rent line shrinking and a mortgage starting, journal transfers for the down payment and the loan, and a test in src/core2/housing.test.ts covers it.

**Files.** src/core2/modules/housing.ts, src/core2/modules/credit.ts

**Notes.** Spec written by the docs cleanup pool-todo-shells-need-spec-oct19b. Related stopgap SG-WORLD-housing-counted-rent.
