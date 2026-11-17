---
id: pins-23c-births-from-the-body-and-the-couple
title: "A couple's age pull toward a child is the body's own curve, with no published center or timing peak"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: lives
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: none
source: The CTO's LIFT THE PINS line on the crew's thread (#9747, comment 6936897718), family 23, pins 12 and 13, Nov 17, 2026
---

**What.** A couple's plan weighed an age term centered on 30, the mean age of the national birth schedule, and a timing term that peaked 2.25 years after the last birth, the national median interpregnancy interval. Both set a level from a published figure.
Seen: dev mode, a couple's birth plan, shows one age term that falls with the mother's age and no timing term.

**Cause.** Found in code: `src/core2/births-plan.ts` (`birthCircumstances`: the age and timing terms), `src/core2/births-unplanned.ts` (the exposure's age curve), `src/core2/births-counted.ts` (`birthStanding` and `countedExposure`), and the parameters `renewalAgeCenter`, `renewalAgeSpread`, `renewalTimingPeakYears`, `renewalTimingWeight`.

**Fix.** One function, `fertilityAt` (births-plan.ts), is the body's decline with age: one half at `renewalFertilityHalfAge`, with `renewalFertilityWidth`. Plans, unplanned exposure and counted women all read it. The timing term is deleted (recovery after a birth is its own term). The partnership-start estimate uses gestation plus recovery days. The four old parameters and their checks in the research scripts are deleted.

**Time box.** 2 hours, Sonnet medium.

**Rules.** No dice. One model, two tiers: the counted tier reads the same curve. Replace, never layer.

**Done when.**

- `src/core2/births-fertility-curve.test.ts` passes and fails on the old code (the old parameters exist).
- The births, renewal and renewal-snapshot tests pass at drawn places.
- A second session sees a couple's plan in dev mode with one age term and no timing term.

**Waits on.** Nothing.

**Files.** `src/core2/births-plan.ts`, `src/core2/births-unplanned.ts`, `src/core2/births-counted.ts`, `src/core2/data/renewal/parameters.json`, `scripts/research/people-parameters-check.ts`, `scripts/research/people-year.ts`, `src/core2/births-fertility-curve.test.ts`.

**Notes.** Nov 17 (Lives): row 11 (counted births at the state's CDC rates) is not in this pull request.
