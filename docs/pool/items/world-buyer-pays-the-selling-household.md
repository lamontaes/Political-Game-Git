---
id: world-buyer-pays-the-selling-household
title: "A home bought in town is paid to the household selling it, and the sale and purchase name each other"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-estate-sells-the-home
lead: laws-effects
model: opus
effort: medium
root: none
source: split of world-home-turnover (Oct 18)
checked: fable 2026-11-10
---

**What.** A home bought in the played world is paid for from the builder of a new house or from the town's outside market, never from a household in town, so no sale ever frees a home for a buyer. The `sales` table is written only for owners who leave. When a home is on the market because of a sale (an estate or a departure), a renter household that chooses to buy takes that home: the down payment and the loan go to the selling household or its estate, the lender is paid off first, and the purchase row and the sale row carry each other's ids. Feeds: world-home-sales-set-the-town-price and the other home-turnover items that wait on it; drop it if the lead drops them.

**Cause.** Found in code: buyHomes in src/core2/modules/housing.ts (line 1487) takes `takeNewHome(...) ?? outside.id` as the seller (the call is near line 1577), so no sale frees a home for a buyer.

**Fix.** When a home is on the market from an estate or departure sale (src/core2/housing-sale.ts), let a renter who chooses to buy take it; pay the down payment and the loan to the seller or the estate, the lender first, with the purchase row and the sale row carrying each other's ids. Build it as a part of world-home-turnover.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the price, the payoff, the surplus and the buyer's mortgage move by journal record, and both rows read each other. An effect is a read, not a record: the sale row is read by the purchase and the purchase by the town's price record. No dice: which listed home a buyer takes follows from price against the buyer's means.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) and sees at least one purchase name the `home-sale:` row it bought, follows a dollar from the buyer's down payment to the seller's heirs and the lender, and finds a test in src/core2 that names the place and seed. On screen: nothing yet; it would show on Jobs and study, and News, and nothing there reads it.

**Waits on.** Nothing. world-estate-sells-the-home is done. Shares world-home-turnover; build as its part.

**Files.** src/core2/modules/housing.ts, src/core2/housing-sale.ts, src/core2/housing-mortgages.ts

**Notes.** Found Oct 18 splitting world-home-turnover. Today `buyHomes` takes `takeNewHome(...) ?? outside.id` as the seller.
