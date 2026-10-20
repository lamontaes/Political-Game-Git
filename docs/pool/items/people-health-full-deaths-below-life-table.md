---
id: people-health-full-deaths-below-life-table
title: "Full people die at about a seventh of the SSA life table's rate in a game year (17 deaths against 120.8 expected over six drawn places)"
area: people
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/health-full-deaths
pr: #5481
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:08:38.742Z
---

**What.** Over one year from the opening in six drawn places, the full people (about 1,700 to 1,850 each) had 17 deaths where the SSA 2023 period life table expects 120.8, a ratio of 0.141 (scripts/health/mortality-band.ts, seed mb1: Fagatogo 1 of 18.5, St. Francis 7 of 20.2, Kenneth City 2 of 20.4, Lewisburg 1 of 20.7, Calera 5 of 20.3, Pomona 1 of 20.8). The resilience base scale (0.106) was solved on two 10,000-resident towns where everyone was a full person, and a death comes only after a serious-illness onset, when each person's strain crosses their own resilience line, with strain counted from the opening day. Find whether the shortfall is the opening-day start of strain (people at old ages have no accumulated strain), the lag from onset to death, or a scale that no longer fits the smaller full-person set, and make a game year's deaths follow the table.

**Rules.** No dice: a death follows strain against the person's own line, never a roll. Totals only: the life table checks the year's deaths, it never picks who dies. One rule, all 56 places. Every dollar balances.

**Done when.** In six or more drawn places (names and seeds in the PR body) scripts/health/mortality-band.ts reports the pooled ratio of full people's deaths to the table's expected within 0.8 to 1.2 over one year and over three, and the health and mortality tests pass.

**Files.** src/core2/modules/health.ts,src/core2/data/parameters.json,scripts/health/mortality-band.ts

**Notes.** TODO

Checked Oct 20 (claude/political-game-pool-8defjq), not fixed. Not a first-year transient: St. Francis, Kansas (seed mb1:1) over four years from the opening, deaths among the people alive at each year's start against the table for their ages: year 1, 7 of 20.2 expected; year 2, 9 of 21.7; year 3, 6 of 23.5; year 4, 4 of 25.5. That is 26 of 90.9 (0.29), and the expected count rises as the cohort ages while the deaths do not. Not demotion either: no full person had been returned to the counts by year 2 (checked with `isDemoted`). The full people skew old (30 percent are 65 or older, mean age 54.6), so the table expects more deaths here than in a general town. The strain mechanism (src/core2/modules/health.ts: a person's own resilience line, strain from the plan's start, onset when it crosses, death after a serious illness) is where to look first; the base scale 0.106 was solved on 10,000-resident towns where every resident was a full person.

Oct 20 (claude, claude/health-full-deaths): cause found for most of it, not all. `startingConditionAssignments` (condition-pack.ts) rounded each place-age-sex cell alone, so in a town of about 1,700 full people (about 20 per single-age cell) every condition whose expected count in a cell was under a half was dropped, and the place held a fraction of the conditions its prevalence gives; the 0.106 resilience scale was solved on 10,000-resident towns whose cells are large. The fix carries what each cell's rounding leaves into the place's next cell, in age order, so a place's total follows its prevalence (no roll). Measured with `scripts/health/mortality-band.ts` (new), seed mb1, six places: one year 17 deaths of 115.6 expected (0.147) before, 88 of 115.6 (0.76) after; by age band 40–64 1.09, 65–79 0.73, 80+ 0.28 (213 people). Over three years the 25 complete place-years (Fagatogo, St. Francis, Kenneth City, Lewisburg and two years of Calera) give 223 of 295 (0.76), falling in year 3 (12 of 22 in three of the places), as expected when the people with the heaviest condition load die first and the survivors' mean multiplier drops, while the 0.106 scale assumes the opening mix; that is a model question (should the strain a cohort carries be re-derived each year?) and not a rounding one. Still open: the pooled ratio is under the 0.8 to 1.2 band, in year 1 and over three years.
