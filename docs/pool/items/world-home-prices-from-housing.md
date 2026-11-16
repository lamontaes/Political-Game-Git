---
id: world-home-prices-from-housing
title: "Home prices come from this world's housing market: the housing engine moves each town's price level by its own buyers, sellers, incomes and mortgage rates, calibrated to the state index, in play and before day one"
area: world
kind: feature
priority: 1
size: L
status: claimed
standard: 2
claimed-by: Account lead T49 (claude/project-thread-n4dxps)
pr:
after: history-housing-before-start
blocked-on:
lead: money
model: opus
effort: medium
root: design-one-model-two-tiers
checked: Account lead 2026-11-14
source: owner in chat Nov 13 2026 23:51Z ("it's simulated... things need to be simulated in order to make your modern day make sense") and Nov 14 01:14Z (should it be its own engine or work into one that exists; the Account lead's answer, the housing engine); Account lead T45's finding on #9084
---

**What.** Every home value in the game, before day one and in play, is the published FHFA state index looked up by quarter, with one growth tilt per world. No home is worth more because the town's buyers outnumber its sellers, its incomes rose or rates fell. A sold home goes for the value it was given at the opening, never its value today. Seen: Metrics' typical home value (and its last year on day one), what a household pays when it buys, what a home sells for when its owners move, die or lose it, the mortgage it takes and the property tax it is billed.

**Cause.** Design: owner's ruling in chat, Nov 13, 2026 23:51Z, and docs/coordination/OWNER-DECISIONS.md (Oct 27, the engines run the years before the start). Found in code, the price paths today:

- `homePriceRatio` (src/core2/housing-prices.ts:94) is the only price rule. It reads `indexAt` (src/core2/housing-prices.ts:69: FHFA by state and quarter, consumer prices past the last quarter) raised to `1 + housingWorldOffset`. It is called at the opening's values (src/core2/modules/housing.ts:722), each purchase (src/core2/modules/housing.ts:1538), every owned home's value today (src/core2/modules/housing.ts:2901, `ownedHomes`, read by property tax and Metrics), the mortgage's price then (src/core2/housing-mortgages.ts:190, `mortgageFrom`) and the housing history (src/core2/housing-past.ts:362).
- What sets a buyer's price: `buyHomes` (src/core2/modules/housing.ts, about line 1495) prices the home a renting household weighs as the county's median value (`rentValueOf`) times `homePriceRatio`, times the household's rent over the county's median rent, times the outcome web's factor. The household then decides by its reasons (`homeBuyReasons`, `chooseAct`), and buys from a finished project in town (`takeNewHome`) or else from the town's outside market. There is no ask: the price is set by formula and the seller takes it.
- What a seller gets: `sellHome` (src/core2/housing-sale.ts:84, called on a move out, src/core2/modules/moves.ts:927; a counted household's sale, src/core2/modules/residents.ts:3249; and probate, src/core2/estates.ts:639) prices the home at the dwelling's stored `valueMinor` times the web factor's change (src/core2/housing-sale.ts:127). For an opening home that is the opening's value, not `ownedHomes`' value today, so a seller loses every year of price change.
- Buyer and seller never meet: the town's outside market buys every sold home and sells every bought one.

**Fix.** Work it into the housing engine, which already owns homes, sales, purchases, mortgages, vacancy and rents. Do not add an engine.

1. Each place's housing `stock` row keeps a price level (1 at the opening). The engine's monthly `review` steps it. It rises with the month's buyers (renting households whose `buyHomes` decision said buy and who could pay) against homes offered (sales through `sellHome` plus finished projects in `takeNewHome`), with the change in the town's median household earnings (the world-metrics month row) and with the change in the mortgage rate (`buyHomes` already reads the macro month's `mortgage30Pct`). Each response is a parameter row in src/core2/data/housing/parameters.json, ESTIMATED or SOURCED, calibrated so that over drawn places and years the state's yearly price change tracks FHFA's within a stated spread. The index is never the figure.
2. One value rule: a home's value is the value it was bought (or opened) at, times the place's level since then, times the web factor's change. `ownedHomes`, `sellHome`, `buyHomes`, `mortgageFrom` and the history pass all read it. That fixes the seller's lost price change.
3. Before day one, the history pass (src/core2/housing-past.ts) steps the same level at the coarse step from its own counts of purchases (the `housing.home-bought` dates) and the economy's months. The level starts where the opening's sourced median sits on day one, set once, as the rent level is.
4. Delete `homePriceRatio`, `indexAt` and the CPI fallback with every caller; keep `publishedHomePriceRatio` only as the calibration check in the test; clear SG-WORLD-housing-price-index.
5. Both tiers by one rule: a counted household's purchase or sale counts by its weight.

Can the existing sales path carry it? Yes, with three changes this item makes. The buy decision and the sales already happen monthly with their causes kept, so buyers against homes offered is a count the engine already has. But the outside market stands for every other party, so the price comes from the town's flow of buyers and homes offered, not from single matched bargains. `sellHome` must price at today's value, not the stored one. `buyHomes` must price from the town's level instead of the county median times the index.

**Time box.** 8 hours for one Opus session at medium effort. Start by reading src/core2/housing-prices.ts, `buyHomes`, `review` and `ownedHomes` in src/core2/modules/housing.ts, src/core2/housing-sale.ts, `mortgageFrom` in src/core2/housing-mortgages.ts and src/core2/housing-past.ts.

**Rules.** History and the present are simulated (owner, Oct 27, Oct 28, Nov 13): real data calibrates and is never a target. One engine per mechanic (owner, Oct 27): prices live in the housing engine, with one value rule for play, sales, mortgages and the history. No dice: the level moves from causes (buyers, homes offered, incomes, rates), never a monthly draw. One rule, all 56 places: places without an FHFA series (Puerto Rico, the island areas) run the same rule, calibrated to their consumer prices and incomes. Speed: one step per place per month, nothing per home per day, and a played year no slower than its base (`npm run speed:year`, three drawn places).

**Done when.** A second session plays two years in a drawn place on the train, naming place and seed. Metrics' typical home value moves with the town, and its last year on day one comes from the history pass's run of the same level. A home sold in play goes for its value that month. In dev mode's Trace, a sale's price names the place's stock row and the month's buyers, homes offered, earnings and rate it read. Over three drawn places, the state's yearly price change falls within the stated spread of FHFA's for the same years, shown in a table in the pull request body.

**Waits on.** history-housing-before-start (#9084), for the history pass that steps the level; history-economy-past-is-this-worlds, so the rates and pay before the start are this world's.

**Files.** src/core2/modules/housing.ts, src/core2/housing-prices.ts, src/core2/housing-sale.ts, src/core2/housing-mortgages.ts, src/core2/housing-past.ts, src/core2/data/housing/parameters.json

**Notes.** Filed by Account lead T45 from #9084 at the Account lead's request, to be built after #9084 is on the train, and written for a fresh builder. The owner asked whether this should be its own engine; the Account lead answered the housing engine (Nov 14).
