---
id: world-counted-renters-buy
title: "A counted renter household buys a new house through its group's accounts: rent part ends, mortgage part starts"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** New houses sell only to full renter households. In `takeNewHome` (`src/core2/housing-construction.ts`) the stopgap `SG-WORLD-housing-new-home-buyers` marks it: a counted renter household, or one arriving from outside, never buys one, so finished houses pile up in `newHomesForSale`. Give a counted renter household the same choice a full one makes in `buyHomes` (`src/core2/modules/housing.ts`): afford the down payment from its group's cash and deposits, weigh the payment against its rent and income, and, when it buys, pay the builder from the group's account, end its per-household rent flow, start its mortgage flow, and move it to the owner group. Arriving households buy the same way.

**Rules.** One model, two tiers: a counted renter household decides by the same affordability and choice rule as a full one, times its count. Sliding scales and causes: buying follows income, savings, rent and price. Replace, never layer: the stopgap row is resolved in the same change. Numbers are in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body), a new house is bought by a counted renter household or an arriving household, shown by the closing record, the house's project record and the household's record ids, every dollar of the down payment and loan balancing on the journal, and the group's rent flow ending as the mortgage flow starts. A test in `src/core2/housing-construction.test.ts` and the stopgap tripwire show `SG-WORLD-housing-new-home-buyers` resolved.

**Files.** src/core2/housing-construction.ts, src/core2/modules/housing.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps.json

**Notes.** Read the code Oct 19 (claude/counted-renters-buy), not built. What `buyHomes` does today for a full household: a lease with no arrears, the head's choice through `chooseAct` (`housingBuyBaseline`, cost, down-payment terms), a seller (`takeNewHome`'s builder, else the outside account), the down payment from the members' cash, savings drawn first, a bank loan capped by the lender's loan-to-value rule (`lendMortgage`), the lease ended (`api.endStandingContract`), and `purchases`, `dwellings` and `housing.purchase` records. A counted household has none of the pieces it reads: no head person for `chooseAct` (the decision has to come from the group's traits the way `moves` decides for a counted mover), no lease contract (rent is a per-household flow in `residents.ts`, which `counted-money.ts` pays from the group account), no `lendMortgage` borrower (the opening's counted mortgages are flows built at `housing.ts` line 432 onward), and `regroupHousehold` is the call that moves it between groups. So this is a counted-tier purchase path of its own, in four steps: decide, pay the builder from the group fund, swap the rent flow for a mortgage flow with a bank contract, regroup to owners. File it as sub-items first if the claiming session wants it in pieces.
