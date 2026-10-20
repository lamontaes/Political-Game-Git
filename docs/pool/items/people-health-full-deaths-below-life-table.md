---
id: people-health-full-deaths-below-life-table
title: "Full people die at about a seventh of the SSA life table's rate in a game year (17 deaths against 120.8 expected over six drawn places)"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Over one year from the opening in six drawn places, the full people (about 1,700 to 1,850 each) had 17 deaths where the SSA 2023 period life table expects 120.8, a ratio of 0.141 (scripts/health/mortality-band.ts, seed mb1: Fagatogo 1 of 18.5, St. Francis 7 of 20.2, Kenneth City 2 of 20.4, Lewisburg 1 of 20.7, Calera 5 of 20.3, Pomona 1 of 20.8). The resilience base scale (0.106) was solved on two 10,000-resident towns where everyone was a full person, and a death comes only after a serious-illness onset, when each person's strain crosses their own resilience line, with strain counted from the opening day. Find whether the shortfall is the opening-day start of strain (people at old ages have no accumulated strain), the lag from onset to death, or a scale that no longer fits the smaller full-person set, and make a game year's deaths follow the table.

**Rules.** No dice: a death follows strain against the person's own line, never a roll. Totals only: the life table checks the year's deaths, it never picks who dies. One rule, all 56 places. Every dollar balances.

**Done when.** In six or more drawn places (names and seeds in the PR body) scripts/health/mortality-band.ts reports the pooled ratio of full people's deaths to the table's expected within 0.8 to 1.2 over one year and over three, and the health and mortality tests pass.

**Files.** src/core2/modules/health.ts,src/core2/data/parameters.json,scripts/health/mortality-band.ts

**Notes.** TODO
