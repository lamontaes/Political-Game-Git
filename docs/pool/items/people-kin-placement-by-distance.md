---
id: people-kin-placement-by-distance
title: "Relatives live as near as real families do, place by place"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Opening kin in src/core2/opening-kin.ts place every relative outside the household in the household's county or elsewhere in the state, from each adult's own ACS move line scaled by the tunable kinMoveAwayShare; nobody lives out of state and no relative is matched to another resident. Pew measured how near families live: 65% of adults with a living parent live within an hour's drive of that parent (2005 survey), and 55% live within an hour of at least some extended family (2021 survey), 62% in the Northeast and Midwest, 53% in the South and 46% in the West, and more in rural places. The research files data/research/people/pew-parent-proximity-2005.json and data/research/people/pew-extended-family-proximity-2021.json hold these, with a table for all 56 places. The kin engine should place relatives so the town's shares land in those bands, add out-of-state residence, and match relatives to residents who live in the town.

**Rules.** One rule, all 56 places: the proximity band is read from the per-place table keyed by postal code, never a state named in logic. Research before building: the Pew shares check the town's totals and never decide where one relative lives; each person's own move record does.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named), scripts/research/people-year.ts reports the share of residents whose living parent lives in their county inside the Pew band for that place, out-of-state relatives exist with a recorded state, and src/core2/opening-kin.test.ts covers a relative matched to another resident of the town.

**Files.** src/core2/opening-kin.ts, src/core2/data/opening-kin.json, data/research/people/pew-extended-family-proximity-2021.json, data/research/people/pew-parent-proximity-2005.json

**Notes.** TODO
