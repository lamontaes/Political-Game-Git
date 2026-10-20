---
id: world-census-weight-economy
title: "Employers, jobs and housing are sized to the Census population"
area: world
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/political-game-pool-yucp92-q
pr: #5373
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

Checked Oct 20 (claude, claude/political-game-pool-76ksvw): the four children's own played-world checks all pass together on current main (`counted-weight-headcount`, `-hiring`, `-housing`, `-macro` tests, 6 tests, each in a place drawn from all 56 and opened at a count scale above one). What none of them does is open one named town above 10,000 and compare employment by industry and the housing stock to its Census-scaled counts in a single run; that is the umbrella's own proof and still needs `countScale` set from reference over sample on a large place. The CTO can close this on its children or schedule that run.
