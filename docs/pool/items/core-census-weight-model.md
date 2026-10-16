---
id: core-census-weight-model
title: "Counted households carry a weight so a town opens at its Census count"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/core-census-weight-model
pr: #4436
blocked-on:
milestone:
source: "split of core-town-size-census (L): owner ruling core-od-town-size, OWNER-DECISIONS.md"
claimed-at: 2026-10-15T20:47:40.520Z
---

**What.** Generate at most the target number of people as household records, then give each counted household a weight (real households it stands for, from the place's Census reference population over the generated count; 1 for a town at or below the target). Counted groups, `reachOf` and the residents module read the weight wherever they read a household or member count.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a played-world year of a drawn place above 10,000 people (name the place and seed), the summed counted members plus full people equal the place's Census reference population, `reachOf` over all groups returns counts scaled to it, and a town at or below 10,000 is unchanged (weight 1, same numbers as base). A test in a random place proves both. The owner plays it: a big city shows its real population on the screens.

**Files.** src/core2/population.ts, src/core2/counted-groups.ts, src/core2/counted-reach.ts, src/core2/modules/residents.ts

**Notes.** Found by the session that claimed core-town-size-census: the cap is `Math.min(target, real)` in `buildPopulation` (`src/core2/population.ts`, about line 507) with `targetPopulation` = 10,000 in `src/core2/data/parameters.json`. A town is generated one household and one person record at a time (about 12 s and 1.4 GB for 10,000), and counted groups keep one index per household (`src/core2/counted-groups.ts`), so a city of millions cannot open by raising the target. The design the ruling points at: each counted household record carries a weight (how many real households it stands for) and every reader multiplies by it.
