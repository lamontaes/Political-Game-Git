---
id: tests-health-traits-odds-ratio-in-tiny-cells
title: "health.traits.test.ts fails on clean main: the conscientiousness odds ratio for substance use is 2.5, not above 4, since conditions are drawn per world"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: fixer/red-main-health-traits
pr: #6694
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T20:21:46.103Z
---

**What.** The test puts behavior-driven conditions on the less conscientious and expects an odds ratio above 4 between the low and high groups, from a slope of -0.716 per level over a 2.4-level gap. On clean main at the test's pinned place 5462140 and seed traits-health-test it reads 2.52 (holders 342 of 342 expected), so the file is red for every PR that touches it. It started with 9cf11a2d6 (Oct 28 07:01), which draws the chronic-condition table per world (factor 1.059 at this seed), so each cell's whole count of holders fell differently. startingConditionAssignments spreads a cell's holders by personality only inside that cell (place, whole-year age, category), and a town's full people make single-year age cells of a few people, so a cell with one holder gives personality one choice among two or three and the ratio cannot reach the slope's size. Find whether the odds ratio holds in cells large enough to show it, or whether the spread should run across the cells of one place.

**Rules.** No dice: personality decides who holds a condition, never a seeded roll, and the count stays the prevalence's. One rule, all 56 places: the test draws its place from all 56 with bounded retries and names the place and seed; a pinned place stays only as a named regression. Never widen the ratio to pass.

**Done when.** src/core2/modules/health.traits.test.ts passes on main at the pinned place 5462140 with seed traits-health-test and on three fresh draws named in the PR body, with the odds ratio printed for each; the PR body names by file and line why the ratio fell below the slope's size and what changed.

**Files.** src/core2/modules/health.ts,src/core2/condition-pack.ts,src/core2/modules/health.traits.test.ts

**Notes.** lead: traits. Filed by the standing red-main owner Oct 28 15:15 UTC from a local run on clean main (health.traits.test.ts alone with a 6 GB heap; run with three other files it runs out of memory). Read: OWNER-DECISIONS (through Oct 28 05:30 UTC), DECISION-REGISTER; searched docs/pool/items for health.traits: none.
