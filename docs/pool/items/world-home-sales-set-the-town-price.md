---
id: world-home-sales-set-the-town-price
title: "A town's recent home sales set what its homes are worth for assessment and the next sale"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-buyer-pays-the-selling-household
source: split of world-home-turnover (Oct 18)
---

**What.** The housing engine carries the stopgap SG-WORLD-housing-price-index: a home's value follows the state's price ratio and the household's income, and nothing a town's sales write is read back. Nothing in the town's own market moves what its homes are worth. Make the town's recent sale prices (the `sales` and `purchases` rows) the price a home is assessed at for property tax and the price the next sale starts from, so a run of high sales raises assessments and a quiet town's values follow the state's index as before.

**Rules.** An effect is a read: the sales table is finished only when property tax assessment and the next sale read it, named by record id. Estimate, never UNKNOWN: a town with no sales yet starts from the state's price ratio, marked as an estimate with its source. Every number is a tagged parameter.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) the property tax bill of a named owner household changes because of a named sale row, shown by record id, `SG-WORLD-housing-price-index` is cleared or kept with a reason, and a test in src/core2 names the place and seed.

**Files.** src/core2/modules/housing.ts, src/core2/modules/place-prices.ts, src/core2/data/stopgaps.json

**Notes.** Found Oct 18 splitting world-home-turnover. Property tax reads `ownedHomes`; see world-property-tax-zero-home-values (done).
