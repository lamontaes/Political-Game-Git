---
id: world-census-weight-economy
title: "Employers, jobs and housing are sized to the Census population"
area: world
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/political-game-pool-yucp92-q
pr: #5454
blocked-on: world-census-weight-macro-regional
milestone:
source: "split of core-town-size-census (L): owner ruling core-od-town-size, OWNER-DECISIONS.md"
claimed-at: 2026-10-20T01:05:39.185Z
---

**What.** Split on Oct 15 into world-census-weight-headcount, world-census-weight-hiring, world-census-weight-housing and world-census-weight-macro-regional (this item became blocked on the last); done when all four are. Original text: businesses, job counts, housing units and local business counts for a town above 10,000 follow its Census size (the local business counts already read the reference population) instead of the 10,000 sample, and counted workers' weights fill those jobs.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn place above 10,000, employment by industry and the housing stock match the Census-scaled counts, with named business and unit record ids, and the macro and regional engines read the scaled counts.

**Files.** src/simulation/local-business-counts.ts, src/core2/modules/ (jobs, housing, business)

**Notes.** Found by the session that claimed core-town-size-census: the cap is `Math.min(target, real)` in `buildPopulation` (`src/core2/population.ts`, about line 507) with `targetPopulation` = 10,000 in `src/core2/data/parameters.json`. A town is generated one household and one person record at a time (about 12 s and 1.4 GB for 10,000), and counted groups keep one index per household (`src/core2/counted-groups.ts`), so a city of millions cannot open by raising the target. The design the ruling points at: each counted household record carries a weight (how many real households it stands for) and every reader multiplies by it.

Looked at Oct 20 (claude, claude/census-weight-economy-check), released unbuilt. All four children are done (headcount #4603, hiring #4784, housing #4605, macro-regional #4844), so nothing is left to build here; what remains is the umbrella's own proof, which needs a town above 10,000 opened with `countScale` (the Oct 17 Washington, D.C. run in `core-census-uncap-opening` already holds the people, workers and year-time figures). A drawn place is almost always under 10,000 (`scripts/core2-year/census-match.mjs`, 4 seeds, ran with a town of 162 people), so the check needs a named large place or a search for one above 10,000, run once with `countScale` set to reference over sample. The CTO can close this item as done on its children, or leave it for the uncap item's measurement.

Measured Oct 19 (claude, with the default Census scale of PR #5295): Washington, District of Columbia, seed scale-probe-1, `buildBenchWorld` two-level, the 33 firms' books over 60 days from 2025-01-20, default scale (about 69) against `countScale` 1. Sales received: $26.4M against $30.9M (the same, not 69 times). Wages paid: $26.8M against $4.5M (six times). Operating costs paid: $1.1M against $6.9M. The firms' own plans do not change: annual payroll $34.8M, annual demand $221M against $208M, capacity $221M against $208M, 33 firms either way. So at Census scale the firms are still the sample's (plans, sales, capacity), counted workers' wages are weighted (hiring part) but counted buyers' purchases are not, and the firms pay several times their payroll plan while selling the same. The four parts marked done (headcount, hiring, housing, macro-regional) did not size the firms' books or the purchase flows to the weighted town. Reopened: it needs the firms' annual demand, capacity and payroll scaled to the town (or the counted households' purchases weighted to match), and the same dollars per resident across scales, checked by a test beside `counted-weight-money.test.ts`.

Cause found Oct 19 (same world, counted flows by kind straight after the opening, default scale against `countScale` 1; D.C., seed scale-probe-1): only the unplaced residents' wages follow the weight ($28.7M a month at scale 1, $435.2M at the default scale, about 15 times). Every other counted flow is identical at both scales: food purchases $3.42M a month, apparel and services $0.67M, outside living costs $5.81M, rent $4.34M (3,123 flows), the mortgage $1.61M, retirement $3.04M, placed wages (`work.count-payroll`) $3.27M, and the outside sales to firms. So a town opened at Census scale has 15 times the residents' pay, the same spending, the same rents and the same 33 firms, which is why the draws and profits collapse. What is needed is one rule: every counted household's flow (purchases, rent, mortgage, retirement, placed wages) times its weight in `collapseToTwoLevels` (`src/core2/residents.ts`, where a record's cash already is), and the firms' annual demand, capacity, payroll and other costs times the same scale for the place, so a firm's plan matches the customers and workers it now has. Check: per resident, each line within 25 percent of the scale-1 town's over 30 days, and the 33 firms' wages paid near their payroll plan.

Built Oct 19 (claude, PR #5295): the firms are sized to the Census town in `src/core2/census-firms.ts` before the outside market is derived, and the default Census scale counts the residents from the sample (not the kin the opening adds). Washington, D.C., seed scale-probe-1, 60 days, per resident against the sample town: sales +14 percent, wages +13, costs +12, owners' draws -6 (a counted owner's draw is stored in one household's units, so it is read times the weight). `src/core2/census-firms.test.ts` states it in a drawn place above 20,000 people. This item closes when #5295 merges; the draws sit in a wider band (Fishers, Indiana came out at 0.39).
