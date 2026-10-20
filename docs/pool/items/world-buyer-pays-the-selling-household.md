---
id: world-buyer-pays-the-selling-household
title: "A home bought in town is paid to the household selling it, and the sale and purchase name each other"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-estate-sells-the-home
source: split of world-home-turnover (Oct 18)
---

**What.** A home bought in the played world is paid for from the builder of a new house or from the town's outside market, never from a household in town, so no sale ever frees a home for a buyer. The `sales` table is written only for owners who leave. When a home is on the market because of a sale (an estate or a departure), a renter household that chooses to buy takes that home: the down payment and the loan go to the selling household or its estate, the lender is paid off first, and the purchase row and the sale row carry each other's ids.

**Rules.** Wire to the world: the price, the payoff, the surplus and the buyer's mortgage move by journal record, and both rows read each other. An effect is a read: the sale row is read by the purchase and the purchase by the town's price record. No dice: which listed home a buyer takes follows from price against the buyer's means.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) at least one purchase names the `home-sale:` row it bought, a dollar is followed from the buyer's down payment to the seller's heirs and the lender, and a test in src/core2 names the place and seed.

**Files.** src/core2/modules/housing.ts, src/core2/housing-sale.ts, src/core2/housing-mortgages.ts

**Notes.** Found Oct 18 splitting world-home-turnover. Today `buyHomes` takes `takeNewHome(...) ?? outside.id` as the seller.
