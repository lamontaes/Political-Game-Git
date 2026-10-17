---
id: world-census-weight-economy
title: "Employers, jobs and housing are sized to the Census population"
area: world
kind: feature
priority: 1
size: M
status: blocked
claimed-by: claude/world-census-weight-economy
pr:
blocked-on: world-census-weight-macro-regional
milestone:
source: "split of core-town-size-census (L): owner ruling core-od-town-size, OWNER-DECISIONS.md"
claimed-at: 2026-10-15T22:01:44.414Z
---

**What.** Split on Oct 15 into world-census-weight-headcount, world-census-weight-hiring, world-census-weight-housing and world-census-weight-macro-regional (this item became blocked on the last); done when all four are. Original text: businesses, job counts, housing units and local business counts for a town above 10,000 follow its Census size (the local business counts already read the reference population) instead of the 10,000 sample, and counted workers' weights fill those jobs.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn place above 10,000, employment by industry and the housing stock match the Census-scaled counts, with named business and unit record ids, and the macro and regional engines read the scaled counts.

**Files.** src/simulation/local-business-counts.ts, src/core2/modules/ (jobs, housing, business)

**Notes.** Found by the session that claimed core-town-size-census: the cap is `Math.min(target, real)` in `buildPopulation` (`src/core2/population.ts`, about line 507) with `targetPopulation` = 10,000 in `src/core2/data/parameters.json`. A town is generated one household and one person record at a time (about 12 s and 1.4 GB for 10,000), and counted groups keep one index per household (`src/core2/counted-groups.ts`), so a city of millions cannot open by raising the target. The design the ruling points at: each counted household record carries a weight (how many real households it stands for) and every reader multiplies by it.

Measured Oct 17 (claude): the same place and seed opened as a sample and at `countScale` 3, 200 days played, world-metrics row for the town, per 1,000 weighted residents. Place 4123800 (seed `sca2`): employed 212 at the sample and 53 at scale 3; unemployment rate 9.0 and 30.2 percent; median rent $1,133 and $1,493 a month; eviction orders in the month 0 and 25; businesses open per 1,000, 6.2 and 2.2. Place 5529950 (seed `sca`): employed 1,494 and 556 per 1,000, unemployment 4.8 and 11.1 percent, businesses open 172 and 49 per 1,000. Median household earnings, home values and prices were within a few percent. So the people triple while employers and jobs stay the sample's, and the town's jobless rate, rents and evictions move for that reason alone. Births and deaths were weighted in PR 4894; this is the part that still keeps a town from opening at its Census count.
