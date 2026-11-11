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
claimed-at:
after:
standard: 2
model: opus
effort: high
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** Over one year from the opening in six drawn places, the full people (about 1,700 to 1,850 each) had 17 deaths where the SSA 2023 period life table expects 120.8, a ratio of 0.141. The resilience base scale was solved on two 10,000-resident towns where everyone was a full person, and a death comes only after a serious-illness onset when strain crosses the person's own line, with strain counted from the opening day. Find whether the shortfall is the opening-day start of strain, the lag from onset to death, or a scale that no longer fits the smaller full-person set, and make a game year's deaths follow the table. Seen: the town's deaths in the paper and in households, at about a seventh of the real rate today.

**Cause.** Needs cause. Looked at: scripts/health/mortality-band.ts, seed mb1, six drawn places (Fagatogo, St. Francis, Kenneth City, Lewisburg, Calera, Pomona): 17 deaths against 120.8 from the SSA table, ratio 0.141; St. Francis, Kansas over four years 26 of 90.9.

**Fix.** None until the cause is found.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a death follows strain against the person's own line, never a roll. Totals only: the life table checks the year's deaths, it never picks who dies. One rule, all 56 places. Every dollar balances.

**Done when.** A second session runs scripts/health/mortality-band.ts over one year and over three in six or more drawn places (names and seeds in the PR body) and sees full people die across ages, older people more than younger, with the pooled ratio of deaths to the table's expected reported and nearer one than the 0.141 on main; the cause is named by line, and the health and mortality tests pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/core2/data/parameters.json, scripts/health/mortality-band.ts

**Notes.** TODO

Checked Oct 20 (claude/political-game-pool-8defjq), not fixed. Not a first-year transient: St. Francis, Kansas (seed mb1:1) over four years from the opening, deaths among the people alive at each year's start against the table for their ages: year 1, 7 of 20.2 expected; year 2, 9 of 21.7; year 3, 6 of 23.5; year 4, 4 of 25.5. That is 26 of 90.9 (0.29), and the expected count rises as the cohort ages while the deaths do not. Not demotion either: no full person had been returned to the counts by year 2 (checked with `isDemoted`). The full people skew old (30 percent are 65 or older, mean age 54.6), so the table expects more deaths here than in a general town. The strain mechanism (src/core2/modules/health.ts: a person's own resilience line, strain from the plan's start, onset when it crosses, death after a serious illness) is where to look first; the base scale 0.106 was solved on 10,000-resident towns where every resident was a full person.

Oct 29 (CTO, second account): PR #5518 closed as stale under the owner's standing approval; back to open. Branch `claude/health-full-deaths` is kept; claiming this item takes it over.

**Notes (Fable's check, Nov 10).** How to find the cause: with scripts/health/mortality-band.ts in the six places named, split a year's deaths by month from the opening and by age band, and compare each against the table. A shortfall only in the first months points at strain starting from zero on the opening day; one at every month points at the onset-to-death lag or at a scale fitted on towns of 10,000 full people. The fix then makes a year's deaths follow the table, in src/core2/modules/health.ts, with no roll.
