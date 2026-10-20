---
id: world-home-turnover
title: "Homes are almost never bought or sold in a played year: 0 or 1 sale among hundreds of owners, against about 5 percent a year"
area: world
kind: feature
priority: 2
size: L
status: in-pr
claimed-by: claude/home-turnover-split
pr: #5034
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:28:04.005Z
---

**What.** In a played year (`buildBenchWorld`, every module installed, Oct 17) West Hammond, New Mexico wrote 0 home sales and 0 purchases among 860 full households with homes (427 mortgages), and Epping, New Hampshire wrote 1 sale and 0 purchases among 1,226 (506 mortgages). The housing module's `sales` table is declared and never written, and the same year held 1 to 2 eviction cases and 5 foreclosures. In a real town about 5 percent of owner-occupied homes change hands each year (NAR existing-home sales against the Census's owner-occupied stock, about 4 million sales a year of about 85 million owner households), and a share of renters becomes owners each year. A town's owners never selling and its renters never buying also keeps `housing.purchase` news, home prices, mortgage originations and the moving economy frozen for everyone but the player.

**Rules.** No dice: a household sells or buys from its reasons (a move, a death or estate, a job, a new household, income against price, rates and the law in force), never a fixed percentage; the real rate checks totals only. One model, two tiers: counted owners and renters buy and sell by the same rule as full households, times their count. Wire to the world: a sale moves the price, the mortgage payoff, the agent and transfer costs and the proceeds by journal record, and the buyer's mortgage and the town's price index read it. Estimate, never UNKNOWN.

**Done when.** In a one-year run of the played world (a drawn place from all 56, seed named in the PR body), home sales and purchases appear by record id at a rate per thousand owner households inside the spread of the NAR and Census figures, a named sale is traced from the seller's reason to the buyer's mortgage and the price index, and a test in src/core2 names the place and seed.

**Files.** src/core2/modules/housing.ts, src/core2/housing-mortgages.ts, src/core2/modules/place-prices.ts

**Notes.** Found Oct 17 auditing a played year's totals against real rates (see people-partnerships-form-and-end, which also drives household formation and so most purchases). Read the decision register first.
