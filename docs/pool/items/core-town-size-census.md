---
id: core-town-size-census
title: "A town opens at its real Census size (population.ts still caps above 10,000)"
area: core
kind: bug
priority: 1
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: world-census-weight-owner-draws,world-census-weight-economy
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at:
---

**What.** A town must open at its real Census size, and `buildPopulation` in src/core2/population.ts still caps it with `Math.min(target, real)` against `targetPopulation` (10,000). The weight model is built (core-census-weight-model, -money, -readers and the headcount, hiring, housing and macro parts): a counted household stands for as many households as the town's weight says, and every reader multiplies by it. What is left is the default: the cap is deleted and the weight is chosen from the place, so `countScale` in `buildBenchWorld` (src/bench/world.ts) defaults to the town's reference population over its sampled people when above one, and the same default holds wherever an opening is built. Measure a year in the largest town and a random one.

**Rules.** One model, two tiers: the counted groups are read by every engine with the same rule as a full person times their count. One rule, all 56 places: the weight comes from the place's reference population in data, with no place named. No dice: the weight is the Census count over the sample, never a roll. Speed: a year in the largest town runs under two minutes and no town runs more than 20 percent slower than base, one process at a time on the same machine. Replace, never layer: the cap, the `targetPopulation` ceiling path and its stopgap row are deleted, and the PR body counts them. Estimate, never UNKNOWN: a place with no reference count falls back to its real sample size, marked as an estimate.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a town above 10,000 drawn from all 56 and a seed the builder did not choose (both named in the PR body) the town opens at its Census count with a balanced journal, `Math.min(target, real)` is gone from src/core2/population.ts, the year runs inside the speed rule, and a test in src/core2/counted-weight.test.ts states the opened count against the place's reference population by record id.

**Files.** src/core2/population.ts, src/bench/world.ts, src/core2/data/parameters.json, src/core2/counted-weight.test.ts

**Notes.** Ruling: "a town opens at its real Census size; nothing pads it to 10,000." (core-od-town-size). The register audit (Oct 15) could not find the cap in current code; verify in a played world of a town above 10,000 before changing anything; close as done if it already opens at Census size.

Split (Oct 15, L): the cap is real. `buildPopulation` still takes `Math.min(target, real)` (`src/core2/population.ts`), and a town cannot open at millions of household records. Parts: core-census-weight-model, core-census-weight-money, world-census-weight-economy, elections-census-weight-electorate, core-census-uncap-opening. This item closes when the last one merges.

Oct 20 (pool feeder): spec written; the old blocker (owner draws) is only one of two readers still short at scale: businesses and job counts are sized by world-census-weight-economy and world-census-scaled-establishments-short; core-census-uncap-opening was dropped (PR #5295), so this item now carries the uncap itself.
