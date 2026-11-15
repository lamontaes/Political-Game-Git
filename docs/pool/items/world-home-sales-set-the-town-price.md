---
id: world-home-sales-set-the-town-price
title: "A town's recent home sales set what its homes are worth for assessment and the next sale"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-buyer-pays-the-selling-household
lead: laws-effects
model: sonnet
effort: medium
root: none
source: split of world-home-turnover (Oct 18)
checked: fable 2026-11-10
---

**What.** The housing engine carries the stopgap SG-WORLD-housing-price-index: a home's value follows the state's price ratio and the household's income, and nothing a town's sales write is read back. Nothing in the town's own market moves what its homes are worth. Make the town's recent sale prices (the `sales` and `purchases` rows) the price a home is assessed at for property tax and the price the next sale starts from, so a run of high sales raises assessments and a quiet town's values follow the state's index as before.

**Cause.** Found in code: `homePriceRatio` in src/core2/housing-prices.ts and src/core2/modules/housing.ts carry SG-WORLD-housing-price-index (row in src/core2/data/stopgaps/world.json, file src/core2/housing-prices.ts): values follow the state ratio, not the town's sales.

**Fix.** Make the town's recent sale prices the assessment and the next sale's starting price, falling back to the state ratio (ESTIMATED, with its source) when the town has no sales yet.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-home-turnover (a held item that waits on it; a town's sales set what its homes sell for and the next sale starts from).

**Rules.** An effect is a read: the sales table is finished only when property tax assessment and the next sale read it, named by record id. Estimate, never UNKNOWN: a town with no sales yet starts from the state's price ratio, marked as an estimate with its source. Every number is a tagged parameter.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) and sees the property tax bill of a named owner household change because of a named sale row, by record id; SG-WORLD-housing-price-index is cleared or kept with a reason; a test in src/core2 names the place and seed. On screen: nothing yet; it would show on Politics, Budgets, and nothing there reads it.

**Waits on.** world-buyer-pays-the-selling-household (home sales have to exist first), and world-home-turnover as the umbrella.

**Files.** src/core2/modules/housing.ts, src/core2/housing-prices.ts, src/core2/modules/place-prices.ts, src/core2/data/stopgaps/world.json

**Notes.** Found Oct 18 splitting world-home-turnover. Property tax reads `ownedHomes`; see world-property-tax-zero-home-values (done).

Nov 14, 2026 (Account lead T49): world-home-prices-from-housing replaces SG-WORLD-housing-price-index with each place's own price level, moved monthly by the town's buyers against homes offered (sales through sellHome, foreclosures, new homes), pay and the mortgage rate; property tax and every sale read it. What is left of this item is pricing a sale from the town's recent sale prices themselves, which that level now stands for; check whether anything remains before building.
