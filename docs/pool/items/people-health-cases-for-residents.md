---
id: people-health-cases-for-residents
title: "Town residents get no serious-illness cases in a year, so no relative is ever frail enough to need care"
area: people
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4654
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In a played year in Koblerville, Northern Mariana Islands (seed probe-1, drawn by drawPlace) the health engine kept 1,512 cases, and the only ones whose illness began in the year belong to officials such as a U.S. senator; none belongs to any of the 1,606 full people in the town. So no household relative is ever seriously ill, and the care a person gives a sick relative (`care-for-relative`, `src/core2/modules/people.ts`, the people-care-frail-relatives item) can never be drawn from a health record. Find why residents get no onset: their cases are not admitted, the horizon is too short, or the hazard multipliers give them none. Fix it at the root so a town's old and conditioned residents fall ill from their own records at a real rate.

**Rules.** No dice: onset comes from the health model's conditions and age, never a roll; real rates (illness and mortality tables) check totals only. One model, two tiers: a counted person's health is the group's columns times its count and a full person is a consistent member of the group.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (name it and the seed in the PR body), at least one town resident's serious-illness onset is recorded by event id, and the share of residents falling ill in the year is within the real range, with the numbers named. A test in `src/core2/` names the resident and the onset event.

**Files.** src/core2/modules/health.ts, src/core2/data/health/

**Notes.** Found while taking people-care-frail-relatives, which stays open until residents can be ill.

Looked at 2026-10-16 (claude session): not a health-engine bug. In Koblerville's probe (place `0210150`, seed `probe-1`) the world holds 1,568 full people but only 25 live in the town (the rest are relatives and officials spread over other states); the town's other residents are counted, and counted people carry no health record until someone fills them in (the health engine then books their onset forward from that day; counted deaths come from the age-rate drift in `counted-drift.ts`, with no illness before them). 25 residents at about one onset per 100 people a year gives a quarter of an expected onset, so none in a year is what the model says. Among all 1,568 full people the engine booked 3 onsets and 1 death in the 8 months before the year crashed on the known layoff defect ("Only a current recorded job can end", PR #4541), about the right count. What is missing is the counted side of "one model, two tiers": an illness before a counted death. Re-scoped: see `people-counted-illness-before-death`. The care item should draw from relatives anywhere (kin who are ill), not only town residents.

Sent back 2026-10-16 from PR #4654 (branch claude/health-cases-residents): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
