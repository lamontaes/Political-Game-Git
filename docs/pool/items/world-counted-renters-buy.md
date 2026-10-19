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
---

**What.** A counted renter household weighs buying a home each month by the same rule a full renter household uses in `buyHomes` (`src/core2/modules/housing.ts`): what owning would cost against its rent, and the down payment against what its group holds. When it buys, its group's fund pays the down payment to the seller (a finished new house's builder first, else the outside seller), the bank lends the rest, the household's `rent:<id>` resident flow ends, and a `mortgage:<id>` part starts on the place's counted mortgage flow for the lender. One counted household stands for as many real households as its weight says, so the down payment, loan and rent change are the household's amounts times its weight, and it takes new houses from the stock up to that count.

**Rules.** One model, two tiers: a counted renter decides with the same offers and weights as a full one, through the shared chooser (`countedPersonOf`), times its count. Sliding scales and causes: buying follows income, savings, price and the bank's yes, never a roll. Wire to the world: every dollar moves between recorded accounts (group fund, seller, bank) in balanced entries, and the dollar balance guard stays green. Replace, never layer: the stopgap SG-WORLD-housing-new-home-buyers is cleared in the same change.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed and place named) at least one counted renter household buys: its `rent:<id>` flow is ended, a `mortgage:<id>` part exists on the counted mortgage flow, the group fund and the seller balance to the cent, and the purchase is on `housing/purchases` with the household and dwelling record ids. The new-house stock sells to counted and arriving households (the `housing-construction.test.ts` pile-up case reads zero unsold after a year) and SG-WORLD-housing-new-home-buyers is removed from `src/core2/data/stopgaps.json`. The speed guard stays within 20 percent. The owner plays it: watch new houses sell to families who live in town and rent.

**Files.** src/core2/modules/housing.ts, src/core2/housing-construction.ts, src/core2/residents-economy.ts, src/core2/counted-money.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps.json, src/core2/housing-construction.test.ts

**Notes.** Scoped Oct 19 (claude, session 01DKpV) by reading the code, not built. The primitives exist: `addResidentFlow`, `endResidentFlow`, `endFlowPart`, `setResidentFlowAmount` (`residents-economy.ts`), `fundOf`/`fundBalance` (`counted-money.ts`), `countedMortgageFlowId` and `partHousehold` (a `mortgage:<household>` key already maps to its household, and the flow weighs each part by household weight). The open problems: (1) `lendMortgage` (`credit.ts`) records a loan against a person `borrowerId` and the full path services it from that person's account; a counted household has no person account, so decide whether the counted mortgage is serviced through the resident flow part and the housing `mortgages` terms row (as the opening's counted mortgages are, `housing-mortgages.ts`) and how the bank's loan balance is booked for it; (2) the decision wants an income: sum the counted household's live wages (`counselPlan` in `housing.ts` reads them) and its means from the group fund divided by the group's households; (3) `takeNewHome` takes one house per call, so a weighted household takes up to its weight. `world-stopgap-housing-construction-faked-mechanic` waits on this item.
