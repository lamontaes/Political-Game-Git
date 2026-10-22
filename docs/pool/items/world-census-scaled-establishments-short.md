---
id: world-census-scaled-establishments-short
title: "A town opened at its Census size has fewer businesses than the sample's own expected count: 41 where 85 are expected at 15,207 people and 56 at 10,000"
area: world
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:01:09.993Z
---

**What.** A town opened above 10,000 people with its Census count scale holds all its people, but not its businesses. In one drawn town of 15,207 people, after a played year, 41 establishments stood in the town against 85 expected from the county rates at its Census size, and 56 at the 10,000-person sample. Find why the town's businesses are fewer than even the sample's expected count, and make the establishments and the jobs they hold follow the Census size, the way the people already do.

**Rules.** One model, two tiers: a counted worker's job is read by the business rule with the worker's weight. Wire to the world: every business is a record that pays and employs, proven in a generated world. One rule, all 56 places, with the place drawn and named in the PR body.

**Done when.** Run scripts/core2-year/census-scaled-economy.mjs on a drawn place above 10,000 for a played year: the establishments in the town and the jobs they hold, full and counted and weighted, land near the county-rate expectation at Census size, named by business record ids, and the year runs no more than 20 percent slower than before. A test beside the business tests shows it.

**Files.** src/simulation/local-business-counts.ts, src/core2/modules/business.ts, src/bench/world.ts, scripts/core2-year/census-scaled-economy.mjs

**Notes.** TODO

Checked Oct 21 (claude): PR #5076, which this item points at, is an omnibus (commuter jobs, groundwater, redistricting data and code; 218 files, 118 commits) and its body does not mention establishments at all, so the town's businesses are not yet sized to the Census scale there. world-census-weight-owner-draws and world-census-scale-foundings-above-sample are gated on this item; they will not unblock until the establishment count is actually built. The gate is satisfied only when this item's own done-when test passes, not when #5076 merges.

Design finding Oct 21 (claude): the code does not scale establishments at all, by design so far. `countScale` in `src/bench/world.ts` becomes only a household weight (`collapseToTwoLevels(…, { weights })`), and `scaleOutsideSales` multiplies outside demand by it ("a town opened at its Census size sells to the outside as much more as its firms are bigger"). So a town at Census scale keeps the sample's firms and expects them to grow instead of more firms existing. Making businesses follow the Census size therefore needs a decision between two shapes: (a) businesses carry a weight like counted households (one record stands for several firms, read by every business reader times its weight), or (b) the opening generates more firm records for the Census count while households stay weighted. (a) matches the owner's two-tier rule and the existing weight pattern, but every business, payroll and tax reader must multiply by it. Neither is started; the establishments gap and the short owner-draw line (world-census-weight-owner-draws) both come from this one choice.
