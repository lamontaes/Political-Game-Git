---
id: elections-census-weight-electorate
title: "Voter groups and election tallies use the Census count"
area: elections
kind: feature
priority: 1
size: M
status: done
claimed-by: elections/census-weight-electorate
pr: #4457
blocked-on: core-census-weight-model
milestone:
source: "split of core-town-size-census (L): owner ruling core-od-town-size, OWNER-DECISIONS.md"
claimed-at: 2026-10-15T21:16:34.414Z
---

**What.** Counted voter groups and district populations carry the weight, so turnout, vote totals and district sizes in a town above 10,000 are the real numbers, and a campaign's reach is counted over the whole electorate.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn place above 10,000 with an election, the tally's registered voters equal the Census-scaled electorate, the winner's margin is computed from weighted groups, and a town at or below 10,000 gives identical results to base.

**Files.** src/core2/modules/ (elections, views), src/core2/counted-reach.ts

**Notes.** Found by the session that claimed core-town-size-census: the cap is `Math.min(target, real)` in `buildPopulation` (`src/core2/population.ts`, about line 507) with `targetPopulation` = 10,000 in `src/core2/data/parameters.json`. A town is generated one household and one person record at a time (about 12 s and 1.4 GB for 10,000), and counted groups keep one index per household (`src/core2/counted-groups.ts`), so a city of millions cannot open by raising the target. The design the ruling points at: each counted household record carries a weight (how many real households it stands for) and every reader multiplies by it.
