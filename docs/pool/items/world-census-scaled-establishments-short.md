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

**Notes.** Found Oct 20 while looking at world-census-weight-economy. Storrs, Connecticut (place 0973980, reference population 15,207, countScale 1.5207, seed census-proof-1), after a played year: people 14,783 against 15,207; establishments in town 41 against 85 expected at Census size; full jobs at those businesses 457 against 981 expected (counted workers' jobs are not yet counted by the script, so that figure is a lower bound). Day zero held 28 establishments. A run of the same seed on main took 32 establishments. The script's job and housing counts are first cuts.
