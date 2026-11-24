---
id: world-customers-move-between-sellers
title: "Customers move between sellers month by month, so shrinking firms lay people off"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #5210
blocked-on:
after:
lead: jobs
model: opus
effort: high
root: design-country-tier
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A seller's customers change only when a business opens or closes (`splitMarketDemand` runs at entry only), so layoffs run at 0.04% of jobs a month against 1.4% in JOLTS. The first idea was to re-split each residents' purchase share monthly by sellers' prices and capacity, so a firm that loses customers shrinks and lays people off. Built and measured on Oct 16, it moves almost nothing: in Rush Valley, Utah (seed cs-1, one year) the median price spread among sellers of a kind is 0.06 percent, because every seller's price follows the same wage and price indexes. The Oct 25 ruling under "simulate it, don't ask" is that a household moves its spending between sellers by the shared chooser on price, travel time, capacity and what it has heard, with no dice. Which differences between sellers actually exist in the records to move customers (a seller's own unit labor cost, its location, its hours, a rival's opening) is the open question. Feeds: world-hires-below-jolts and the other job-turnover items that wait on it; drop it if the lead drops them.

**Cause.** Found in code: three parts, below.

1. **Households never change sellers.** Households' purchases in town move between sellers only when a business opens. `enterResidentMarket` (src/core2/modules/residents.ts, line 2519) and `shiftPurchaseShare` (src/core2/residents-economy.ts, line 387) are the only code that moves a purchase flow from one seller to another, and both run at entry.
2. **A seller's price never reads its own sales.** `reviewBusiness` in src/core2/finance-state.ts builds the seller's demand from `projectMarket` (line 1397). That projection is the town's income and the national demand factor against the seller's own opening anchor, never what the seller was actually paid. It passes that demand (line 1418) into `projectBusinessPrice` (line 1448, crowding at line 1457), so every seller of a kind in a town moves its price by the same factor.
3. **Only outside buyers read the one real difference.** What does differ between sellers on today's records is service level: staff against what demand needs (`firmStaffing`, src/core2/modules/jobs.ts, line 1650; the staffing target reads the seller's own receipts at lines 1357 to 1375). Only outside buyers read it, in `divideOutsideSales` (residents-economy.ts, line 537).

Measured on main at 64e08b7fa1, one year in two drawn places: Herald Harbor, Maryland (bench seed cause-customers-1, place key 2438025) and Center, Colorado (bench seed cause-customers-2, place key 0812855).

- **Prices.** In both towns the price spread among incumbent sellers of one kind was 0.000% after 12 months for professional, retail, restaurant, construction, trucking and farm. Every incumbent's price against its opening price was equal to four decimals, for example retail at 1.0315 for all three sellers in Herald Harbor.
- **Household shares.** Every seller's share of the town's household purchases was unchanged to four decimals. For example, the Herald Harbor retail sellers ending `21397ac7`, `21397914` and `21397e2d` held 0.3047, 0.3116 and 0.3836 in month 1 and in month 12. Those purchases are 18% to 89% of a seller's customer flows in these kinds, so they are not a small part.
- **Outside shares.** These did move, by service level alone. Herald Harbor professional seller `044913d1` fell from service level 0.997 to 0.348 and its outside share from 0.2448 to 0.1282.

So the cause is not that the records hold no difference between sellers. Price is held equal by the projection, and only outside buyers read service level, the one difference that exists.

What the country-tier design (docs/design/country-tier.md, step 2) already covers: `core-country-tier-town-joins-its-state-part-3-a-sellers-share-follows-its-books` replaces part 3 above. A seller's share of outside buyers will follow its price and capacity against its sector in the state, not only its town rivals. `core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace` deletes the fixed layoff pace. Neither touches parts 1 and 2. While part 2 stands, every seller in a town moves its price together, so against its sector they rise and fall as one block. Part 1 leaves households tied to the seller they had at the opening.

**Fix.** Two changes, after part 3 of the country tier lands, so households and outside buyers use one share rule.

1. **Price.** In `reviewBusiness` (src/core2/finance-state.ts), give `projectBusinessPrice` the seller's own demand: the projection blended with what it was actually paid. Read `businessTradingMonth`, the same read and blend the staffing target uses in jobs.ts (`projected` and `observedStaff` weighted by `jobsSalesForecastWeight`, lines 1348 to 1375), so a seller paid more than its capacity raises its price and one paid less lowers it. Keep `projectMarket` for the market's size.
2. **Household shares.** Once a month, at the same close that scales outside sales (`scaleOutsideSales`, called from src/core2/modules/macro.ts, line 177), move each residents account's purchase flows of one kind between that kind's sellers in town by the share rule part 3 writes: price against rivals and service level, on sliding scales. Move contract by contract, as `enterResidentMarket` does, so filling a household in still takes back its own part, and keep each account's total unchanged. Full households' living plans (src/core2/cost-of-living.ts) take the same rule.

Travel time and what a buyer has heard are in the Oct 25 ruling, and no record holds them yet. Register each as a stopgap in src/core2/data/stopgaps/core.json and name the pool item `world-dwelling-locations` for travel time. Every elasticity is a parameter row tagged TUNABLE with the spread it was checked against. Do not write a second share function beside part 3's: households call that one.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance. The Nov 8 ruling keeps the JOLTS layoff stopgap until firms have their own demand shocks; the JOLTS rate is checked, never a target.

**Done when.** A second session (not the builder) reads the cause written into this item and checks it in a one-year run of the played world in a drawn place and a seed the builder did not choose (named): layoffs at shrinking firms follow their lost customers, by business and purchase-share record ids, and the layoff rate is reported beside JOLTS. On screen: nothing yet; it would show on Jobs and study, and News, and nothing there reads it.

**Waits on.** core-country-tier-town-joins-its-state-part-3-a-sellers-share-follows-its-books (the share rule households reuse). The price change (Fix 1) does not wait and may be built first.

**Files.** src/core2/finance-state.ts (`reviewBusiness`, lines 1397 to 1460), src/core2/business-books.ts (`projectBusinessPrice`, line 345; `projectMarket`, line 289; `splitMarketDemand`, line 396), src/core2/residents-economy.ts (`shiftPurchaseShare`, line 387; `scaleOutsideSales`, line 476; `divideOutsideSales`, line 537), src/core2/modules/residents.ts (`enterResidentMarket`, line 2519), src/core2/modules/jobs.ts (`firmStaffing`; the staffing target, lines 1348 to 1375), src/core2/modules/macro.ts, src/core2/cost-of-living.ts, src/core2/data/stopgaps/core.json

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Tried Oct 16 (built, measured, not shipped): a monthly move of each household's spending toward the target split of its place's sellers of one kind (capacity weighted by price against rivals', both against each seller's opening price), for counted purchase flows (contract by contract, so fill-in still takes back its own) and for full households' living plans, at 5 percent of the gap a month. It works and keeps every household's total unchanged, but it moves almost nothing. In Rush Valley, Utah (seed cs-1, one year, 7 of 17 kinds have two or more sellers) the median price spread among sellers of a kind is 0.06 percent and the largest is 2.4 percent, because every seller's price follows the same wage and price indexes; about $2,400 a year changed hands against a town selling millions, and layoffs stayed at 0.04 percent of jobs a month (8 in the year) with or without it. So price cannot be the cause that moves customers. The JOLTS gap needs causes that actually differ between sellers (a seller's own wages against rivals', its location against the buyer's home, a seller that closes its door at the hours its buyers are free, a new rival's opening taking share, the owner's choice to cut or raise price). Pick the cause first, then reuse `splitMarketDemand` and the contract-by-contract move in `moveCountedCustomers` (residents.ts, the pattern of `shiftToOpenSellers`) and the plan move in cost-of-living.ts. The move itself is about 150 lines and is easy to rebuild from this note.

Looked at Oct 19 (claude/political-game-pool-3xfqef-2) and handed back unbuilt: the Oct 16 note shows price cannot be the cause, and the replacement cause (a rival's wages, location, hours, an owner's price choice) is a design choice the item does not make. A builder takes it only with a named cause; consider splitting one item per cause.

## Notes

Sent back 2026-10-20 from PR #5210 (branch claude/pool-world-customers-move-between-sellers): No code built and owner decisions must not be waited on; finish on that branch, merge main into it first.

Oct 20 (claude, claude/civic-producers-government-landed), read again and left unbuilt. Reading the code, the sellers' shares are set by `splitMarketDemand` (`business-books.ts`: capacity times relative price to the elasticity) and applied only at entry by `enterResidentMarket` (`residents.ts`). Two of the candidate causes the Oct 16 note lists cannot move customers on the data that exists: a seller's price follows the same wage and price indexes as its rivals' (spread 0.06 percent), and a seller's capacity follows its own demand, so re-splitting by capacity returns the same shares. What does differ between sellers is location, which needs the dwelling and business locations in `world-dwelling-locations` (open, L), and a rival's opening or closing, which the entry path already handles. The one cause buildable from today's records is a seller's own unit labor cost passing through to its price (`projectBusinessPrice` already mixes the seller's pay share with the wage index), so a pay-heavy seller prices above its rivals; it needs a per-seller wage factor that today's indexes do not provide. Proposed split for the owner: (1) per-seller price pass-through of its own payroll per sale; (2) the monthly re-split by price and capacity (the Oct 16 move, rebuilt after 1); (3) location-based share once `world-dwelling-locations` lands. Nothing here waits on the owner: item 1 can be built next and its owner-decision stopgap registered.

Sent back 2026-10-20 from PR #5445 (branch claude/fs11vb-customers-question): The code-conflict review is addressed, but the new Notes explicitly say Blocked on the owner answer and the body ships no implementation or registered owner-decision stopgap. AGENTS.md requires building the simplest compliant path and flagging the question without waiting. This item Done when also requires a drawn one-year run following lost customers to layoffs by business/purchase-share ids and a JOLTS check. Supply that proof, or track the completed question-only paperwork separately while leaving the implementation item open; this PR cannot complete it.; finish on that branch, merge main into it first.

Oct 25 audit: ruled under "simulate it, don't ask": a household moves its spending between sellers by the shared chooser on price, travel time, capacity and what it has heard, no dice; build that.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: no owner-decision stopgap; build from research.

**Notes (cause finder, Nov 10).** Ran on main at 64e08b7fa1. A scratchpad script built `buildBenchWorld(seed, gameStartDate(), { twoLevel: true })` for seeds cause-customers-1 and cause-customers-2. It stepped 12 months of 30 days and, for every kind with two or more open sellers in town, printed each seller's price against its opening price, its service level (`firmStaffing`), and its share of the town's household purchase flows and of outside-sales flows. Manufacturing entrants opened mid-year at their own prices, so that kind showed a 25% spread. Entry is the only time a price differs. Still unknown: whether a seller's falling service level feeds on itself. Lower receipts lower its staffing target, and a lower service level then lowers its outside share again: Herald Harbor's `044913d1` fell to 0.348. Part 3's builder should watch for it. Whether the per-seller price change alone moves layoffs toward the JOLTS rate is also not measured.
