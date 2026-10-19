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

Measured Oct 19 (claude, with the default Census scale of PR #5295): Washington, District of Columbia, seed scale-probe-1, `buildBenchWorld` two-level, the 33 firms' books over 60 days from 2025-01-20, default scale (about 69) against `countScale` 1. Sales received: $26.4M against $30.9M (the same, not 69 times). Wages paid: $26.8M against $4.5M (six times). Operating costs paid: $1.1M against $6.9M. The firms' own plans do not change: annual payroll $34.8M, annual demand $221M against $208M, capacity $221M against $208M, 33 firms either way. So at Census scale the firms are still the sample's (plans, sales, capacity), counted workers' wages are weighted (hiring part) but counted buyers' purchases are not, and the firms pay several times their payroll plan while selling the same. The four parts marked done (headcount, hiring, housing, macro-regional) did not size the firms' books or the purchase flows to the weighted town. Reopened: it needs the firms' annual demand, capacity and payroll scaled to the town (or the counted households' purchases weighted to match), and the same dollars per resident across scales, checked by a test beside `counted-weight-money.test.ts`.
