---
id: core-closures-small-town-24-percent
title: "M0-08: 8 of 33 businesses close in a year in Dickens, Iowa, most within two months of the opening"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-customers-move-between-sellers
source: added with npm run pool -- add
---

**What.** The M0-08 money year on main b09ba675cd in Dickens, Iowa (place key 1921360, seed 54e03066883f228dfe2b9acb51259d9f50dd7d3f92fa9a6d906d613dc601faa8) closes 8 of 33 businesses (24.2%), against the spec's ceiling of 10%. Yates Transport and Paul Construction run out of cash in their second month, Chang's Cafe in its third, and five more by September. Earlier fix core-closures-over-10-percent (done) covered other small towns, so this is either a new path or a town shape it missed. Rerun after world-customers-move-between-sellers lands, then find why these owners close.

**Rules.** No dice: each owner closes from their own cash, sales and costs, never a rate; real closure rates only check the total. One rule, all 56 places: the closure share holds in any drawn place.

**Done when.** CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/closures.mjs passes its 'under 10% close' check in Dickens, Iowa (seed above) and in two more places drawn from all 56, with each closure's cause named by record id in the PR body.

**Files.** scripts/core2-year/closures.mjs, src/core2/modules/business.ts

**Notes.** Found by the M0-M2 lead's baseline run, Oct 24. Blocks roadmap M0-08.
