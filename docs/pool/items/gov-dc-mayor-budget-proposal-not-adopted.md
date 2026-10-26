---
id: gov-dc-mayor-budget-proposal-not-adopted
title: "In Washington, D.C. the mayor's proposed budget change is not in the adopted city budget"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/budget-line-schools-staffing.test.ts fails on main a368aa787a with SCHOOLS_LINE_SEED=7fb19dc163f97df0, whose first draw is Washington, District of Columbia (1150000), place seed 2970de8899a3...024e. The mayor proposes cutting the city's schools line by a third on 2025-08-03, the day proposals open for the fiscal year starting 2025-10-01. The adopted budget budget:place:1150000:2025 (adopted 2025-10-01) keeps the schools line at 422086565454, the same as budget:place:1150000:2024, so the test fails with 'expected 422086565454 to be 281391043636'. D.C. has three governments in the run: US (federal), US-DC (state) and place:1150000 (city), all on an October 1 fiscal year. Where the mayor's proposal goes and why the city's adopted budget does not carry it is not traced; the same test passes in Fairport, New York.

**Rules.** One rule, all 56 places: D.C.'s budget follows its own records (a mayor proposes, its council adopts) through the same budget engine as every city, never a D.C.-named branch. Wire to the world: the adopted line is what the staffing reach and treasury read.

**Done when.** budget-line-schools-staffing.test.ts passes with SCHOOLS_LINE_SEED=7fb19dc163f97df0 in Washington, D.C. (both cut and raise), with the mayor's proposal, the council's adoption and the adopted line named by record id in the PR body, and passes on a fresh seed.

**Files.** src/core2/modules/budgets.ts,src/core2/office-day-acts.ts,src/core2/budget-line-schools-staffing.test.ts

**Notes.** Found Oct 26 while fixing tests-schools-line-base-staff-fairport; reproduced on clean main a368aa787a.
