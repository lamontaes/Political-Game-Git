---
id: laws-outcome-links-tax-migration
title: "The income tax rate, the estate tax and the inheritance tax get researched outcome links to out-migration"
area: laws
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Three taxes laws (`income-tax`, `estate-tax`, `inheritance-tax`) are rows in `src/core2/data/laws/outcome-research-gaps.json`: no researched outcome-web link starts from them, so their web link grades stopgap in the law matrix. The research is on file or quick to fetch: the adopt and graduated income tax questions already link to `population.out-migration` as about-zero (Young, Varner, Lurie and Prisinzano 2016), and the moves engines read that measure. This is the bounded part of `laws-outcome-links-rest` for these three laws.

**Rules.** Research before building: fetch and quote every source; research calibrates and never decides an outcome. Estimate, never UNKNOWN: a range tagged with its source.

**Done when.** `data/research/outcome-web/links.json` holds a researched link from each of the three laws to `population.out-migration` (sized, or about-zero with the quote that makes it so), the three rows leave `outcome-research-gaps.json`, `coverage.json` is regenerated, and the outcome web and ranges tests pass.

**Files.** data/research/outcome-web/links.json, src/core2/data/laws/outcome-research-gaps.json, src/core2/data/outcome-web/coverage.json, src/core2/data/stopgaps.json

**Notes.** Filed by the laws lead, Oct 25, splitting `laws-outcome-links-rest` so a PR for three laws does not close the item for all of them. The natural resources line and the social media age check stay in `laws-outcome-links-rest`, with the searches recorded in their gap rows.
