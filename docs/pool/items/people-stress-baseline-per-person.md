---
id: people-stress-baseline-per-person
title: "Resting stress is computed per person, not one number for all"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: "owner, Oct 16; acting CTO code read of src/core2/emotion.ts"
---

**What.** `stressBaseline` in `src/core2/data/parameters.json` is 0.25, tagged TUNABLE with no source, and every person in the world decays toward that same resting stress. The appraisal and decay machinery in `src/core2/emotion.ts` (trait-weighted impulses, closeness, exponential return to baseline) is sound and stays. Replace the one number with a per-person resting stress computed from the person's own situation: money pressure, job security, health, household load and traits, weighted. Calibrate the population's spread to the PSS-10 national norms (mean about 13 of 40, varying by age, income and employment), so the town is not "the same zombies" (owner, Oct 16). The TUNABLE row and the stopgap SG-P8-param-* rows for it become SOURCED or ESTIMATED with the survey citation; `moodBaseline` 0 as "relative to the person's own usual self" stands.

**Rules.** No dice and sliding scales: a person's resting stress is a weighted read of their money, work, health, household and traits, never one value. Estimate, never UNKNOWN: the survey norms are the estimate's source and the row says so. Nothing in the simulation is a locked number (owner, Oct 16): research calibrates the spread, it sets no coefficient.

**Done when.** A one-year played world in a drawn place (`buildBenchWorld`, every module installed) shows resting stress across the town's full people with a spread matching the PSS-10 norms within the stated band, by person record id, and two named people in different situations (one under money pressure and out of work, one secure) hold different baselines; a test in tests/ names the place and seed and the parameter table row. The owner plays it: people in trouble look strained before anything happens to them, and the comfortable do not.

**Files.** src/core2/emotion.ts, src/core2/person-state.ts, src/core2/data/parameters.json

**Notes.** Ruling in OWNER-DECISIONS.md, Oct 16 evening (acting CTO ruling, owner to overrule). Closes the owner-decision item `owner-stress-mood-scale`.
