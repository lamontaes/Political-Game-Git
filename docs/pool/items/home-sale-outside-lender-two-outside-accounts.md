---
id: home-sale-outside-lender-two-outside-accounts
title: "home-sale-outside-lender red on main: selling a home whose mortgage the outside market holds throws 'Money cannot move between two outside accounts'"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/home-sale-outside-lender.test.ts ('sells a home whose mortgage the outside market holds: the loan ends and no cash moves to itself') fails on clean main (31ad11a8c6, Oct 28 23:20 UTC) on two random HOME_SALE_SEED draws, throwing 'Money cannot move between two outside accounts.' from src/core2/accounts.ts:357. The sale pays off a loan the outside market holds, and the payoff tries a transfer from one outside account to another instead of ending the loan with no cash moving. Found by the laws session while gating the disasters family.

**Rules.** Every dollar balances: a loan the outside market holds ends on the sale with the buyer's money going to the seller's payoff through one posting, never a transfer between two outside accounts. One rule, all 56 places: the test keeps drawing its place and names the place and seed.

**Done when.** home-sale-outside-lender.test.ts passes on three random seeds, each named in the PR body with the sale, the mortgage id that ended and the journal's debits and credits; the PR body names the call that made the outside-to-outside transfer and what replaced it.

**Files.** src/core2/housing-sale.ts; src/core2/accounts.ts; src/core2/home-sale-outside-lender.test.ts

**Notes.** TODO
