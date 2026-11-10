---
id: world-home-turnover
title: "Homes are almost never bought or sold in a played year: 0 or 1 sale among hundreds of owners, against about 5 percent a year"
area: world
kind: feature
priority: 2
size: L
status: blocked
standard: 2
claimed-by: claude/home-turnover-split
pr: #5034
blocked-on: world-home-turnover-part-1-measure-sales-now, world-home-turnover-part-2-year-report-vs-nar-census, world-buyer-pays-the-selling-household, world-counted-renters-buy, world-home-sales-set-the-town-price
after:
lead: laws-effects
model: opus
effort: high
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:28:04.005Z
---

**What.** In a played year (`buildBenchWorld`, every module installed, Oct 17) West Hammond, New Mexico wrote 0 home sales and 0 purchases among 860 full households with homes (427 mortgages), and Epping, New Hampshire wrote 1 sale and 0 purchases among 1,226 (506 mortgages). The housing module's `sales` table was declared and never written, and the same year held 1 to 2 eviction cases and 5 foreclosures. In a real town about 5 percent of owner-occupied homes change hands each year (NAR existing-home sales against the Census's owner-occupied stock), and a share of renters becomes owners each year. A town's owners never selling and its renters never buying also keeps `housing.purchase` news, home prices, mortgage originations and the moving economy frozen for everyone but the player. Since Oct 17, sales for owners who leave town or die are written (src/core2/housing-sale.ts); buyers taking those homes and the town price reading them are the other pieces.

**Cause.** Measured: buildBenchWorld one-year runs on Oct 17 (the item recorded no seed): West Hammond, New Mexico 0 sales and 0 purchases among 860 owner households; Epping, New Hampshire 1 sale among 1,226 (item). Code: src/core2/modules/housing.ts keeps the sales table; src/core2/housing-sale.ts (sellHome) now sells homes for owners who leave or die, but buyers are still the new-home builder or the outside market (buyHomes, line 1487).

**Fix.** Finish the chain in order: world-home-turnover-part-1-measure-sales-now (re-measure and fill any missing sale rows), then world-buyer-pays-the-selling-household and world-counted-renters-buy (buyers take listed homes), world-home-sales-set-the-town-price (the price reads sales), then world-home-turnover-part-2-year-report-vs-nar-census (the year report beside NAR and Census).

**Time box.** 24 hours in all, across the two parts and the three items it waits on; each carries its own time box.

**Rules.** No dice: a household sells or buys from its reasons (a move, a death or estate, a job, a new household, income against price, rates and the law in force), never a fixed percentage; the real rate is reported beside the result and never a target (owner, Nov 8). One model, two tiers: counted owners and renters buy and sell by the same rule as full households, times their count. Wire to the world: a sale moves the price, the mortgage payoff, the agent and transfer costs and the proceeds by journal record, and the buyer's mortgage and the town's price index read it. Estimate, never UNKNOWN.

**Done when.** A second session (not the builder) plays a one-year world (a drawn place from all 56, seed named in the PR body) and sees home sales and purchases by record id with their rate per thousand owner households reported beside the NAR and Census figures, a named sale traced from the seller's reason to the buyer's mortgage and the price index, and a test in src/core2 naming the place and seed. On screen: nothing yet; filed play-home-sales-on-screen, which puts it on News. This item is done when its parts and the three items it waits on are.

**Waits on.** world-home-turnover-part-1-measure-sales-now, world-home-turnover-part-2-year-report-vs-nar-census, world-buyer-pays-the-selling-household, world-counted-renters-buy, world-home-sales-set-the-town-price. The proposed merge of world-home-turnover-year-check is taken by world-home-turnover-part-2-year-report-vs-nar-census.

**Files.** src/core2/modules/housing.ts, src/core2/housing-sale.ts, src/core2/housing-mortgages.ts, src/core2/modules/place-prices.ts

**Notes.** Found Oct 17 auditing a played year's totals against real rates (see people-partnerships-form-and-end, which also drives household formation and so most purchases). Read the decision register first.
