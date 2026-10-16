---
id: people-health-cases-for-residents
title: "Town residents get no serious-illness cases in a year, so no relative is ever frail enough to need care"
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

**What.** In a played year in Koblerville, Northern Mariana Islands (seed probe-1, drawn by drawPlace) the health engine kept 1,512 cases, and the only ones whose illness began in the year belong to officials such as a U.S. senator; none belongs to any of the 1,606 full people in the town. So no household relative is ever seriously ill, and the care a person gives a sick relative (`care-for-relative`, `src/core2/modules/people.ts`, the people-care-frail-relatives item) can never be drawn from a health record. Find why residents get no onset: their cases are not admitted, the horizon is too short, or the hazard multipliers give them none. Fix it at the root so a town's old and conditioned residents fall ill from their own records at a real rate.

**Rules.** No dice: onset comes from the health model's conditions and age, never a roll; real rates (illness and mortality tables) check totals only. One model, two tiers: a counted person's health is the group's columns times its count and a full person is a consistent member of the group.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (name it and the seed in the PR body), at least one town resident's serious-illness onset is recorded by event id, and the share of residents falling ill in the year is within the real range, with the numbers named. A test in `src/core2/` names the resident and the onset event.

**Files.** src/core2/modules/health.ts, src/core2/data/health/

**Notes.** Found while taking people-care-frail-relatives, which stays open until residents can be ill.
