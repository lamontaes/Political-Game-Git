---
id: research-health-sourced-parameters
title: "Research: sourced parameters for health severity and resilience"
area: people
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-8defjq
pr: #5080
blocked-on:
source: "collapsed Oct 19, 2026 from people-stopgap-health-estimated-behavior, people-stopgap-health-estimated-calibration"
claimed-at: 2026-10-20T18:26:33.360Z
---

**What.** Source the numbers behind health severity and resilience. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 2 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/people/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P10-event-severity` in src/core2/data/health.json: Event impulses scale Holmes-Rahe life change units into core2 stress and mood impulses with tunable conversions. Replacement: A calibrated appraisal model checked against bereavement and illness affect trajectories.
- `SG-P10-resilience-scale` in src/core2/data/health.json: One base-rate scale (0.106) for every place, solved from two generated towns so expected yearly deaths match the SSA 2023 life table; the chronic-condition weights were calibrated for the old shared threshold and are not refit. Replacement: A cohort calibration of base scale and condition weights together, checked across many places and ages against the life table. (parameter rows: src/core2/data/parameters.json:resilienceBaseRateScale)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/health.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/people/

**Notes.** Folded from: people-stopgap-health-estimated-behavior, people-stopgap-health-estimated-calibration. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Looked at Oct 20 (claude, claude/political-game-pool-yucp92-w), nothing sourced. Both rows are calibrations to run, not figures to look up: SG-P10-resilience-scale asks for the base death-rate scale and the chronic-condition weights fitted together and checked against the SSA life table across many places and ages (the 0.106 came from two generated towns), and SG-P10-event-severity asks for the Holmes-Rahe stress and mood impulses checked against published bereavement and illness affect trajectories, which needs an instrument-matched source and a model of what the engine's mood and stress units stand for. The first needs a batch of played years in drawn places comparing yearly deaths to the life table's expected count; the second needs the instrument chosen first. A builder who can run six or more towns for a year each can take the first.

Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): merging main still conflicts in scripts/health/mortality-band.ts and src/core2/player-money-year.test.ts; finish on that branch, merge main into it first.
