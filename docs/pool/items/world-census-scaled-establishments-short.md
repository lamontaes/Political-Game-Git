---
id: world-census-scaled-establishments-short
title: "A town opened at its Census size has fewer businesses than the sample's own expected count: 41 where 85 are expected at 15,207 people and 56 at 10,000"
area: world
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A town opened above 10,000 people with its Census count scale holds all its people, but not its businesses. In one drawn town of 15,207 people, after a played year, 41 establishments stood in the town against 85 expected from the county rates at its Census size, and 56 at the 10,000-person sample. Find why the town's businesses are fewer than even the sample's expected count, and make the establishments and the jobs they hold follow the Census size, the way the people already do.

**Rules.** One model, two tiers: a counted worker's job is read by the business rule with the worker's weight. Wire to the world: every business is a record that pays and employs, proven in a generated world. One rule, all 56 places, with the place drawn and named in the PR body.

**Done when.** Run scripts/core2-year/census-scaled-economy.mjs on a drawn place above 10,000 for a played year: the establishments in the town and the jobs they hold, full and counted and weighted, land near the county-rate expectation at Census size, named by business record ids, and the year runs no more than 20 percent slower than before. A test beside the business tests shows it.

**Files.** src/simulation/local-business-counts.ts, src/core2/modules/business.ts, src/bench/world.ts, scripts/core2-year/census-scaled-economy.mjs

**Notes.** TODO

Built Oct 20 (claude/peaceful-ritchie-03780x, #5076), partly: the cause was `TOWN_WORKPLACES[].outlets` in src/simulation/living-world/town-employment.ts (an authored count that ignored town size; the caps in local-economy.ts are not on the bench world's path). Six workplaces (retail, restaurant, repair, professional, construction, personal-care) now take their outlets from the county rates at the Census size (`workplaceOutlets`; test src/simulation/living-world/town-outlets.test.ts). Center Point, Alabama, seed e1, 120 days with `scripts/core2-year/census-scaled-economy.mjs`: employers 42 to 54, 84.6 s to 84.75 s. Left: the other workplaces keep authored counts, and jobs per business are not yet sized to the county's employees per establishment (so counted workers' jobs still sit in fewer, bigger employers).
