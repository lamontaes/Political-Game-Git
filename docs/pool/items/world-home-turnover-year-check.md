---
id: world-home-turnover-year-check
title: "A played year's home sales and purchases land inside the NAR and Census rate"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: world-renters-can-choose-to-buy, world-counted-renters-buy, world-estate-sells-the-home, world-buyer-pays-the-selling-household, world-home-sales-set-the-town-price
source: split of world-home-turnover (Oct 18)
---

**What.** Once the pieces of world-home-turnover are built, measure a played year: the sales and purchases per thousand owner households in a drawn place against about 5 percent of owner-occupied homes changing hands (NAR existing-home sales against the Census owner-occupied stock). The check compares totals only; it never picks any household's outcome. Report the rate, the first-time-buyer share and the place and seed, and file a pool item for any gap that remains.

**Rules.** No dice: the real rate checks totals, it never decides one household's outcome. Estimate, never UNKNOWN: the targets carry their source and spread. One run, one number: a single run per place, no repeat medians.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) home sales and purchases appear by record id at a rate per thousand owner households inside the NAR and Census spread, a named sale is traced from the seller's reason to the buyer's mortgage and the town's price record, and a test in src/core2 names the place and seed.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/parameters.json

**Notes.** Found Oct 18. This is the check half of world-home-turnover, which is blocked on this item.
