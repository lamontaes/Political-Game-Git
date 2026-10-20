---
id: research-health-sourced-parameters
title: "Research: sourced parameters for health severity and resilience"
area: people
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-yucp92-w
pr: #5080
blocked-on:
source: "collapsed Oct 19, 2026 from people-stopgap-health-estimated-behavior, people-stopgap-health-estimated-calibration"
claimed-at: 2026-10-20T02:19:36.088Z
---

**What.** Source the numbers behind health severity and resilience. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 2 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/people/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P10-event-severity` in src/core2/data/health.json: Event impulses scale Holmes-Rahe life change units into core2 stress and mood impulses with tunable conversions. Replacement: A calibrated appraisal model checked against bereavement and illness affect trajectories.
- `SG-P10-resilience-scale` in src/core2/data/health.json: One base-rate scale (0.106) for every place, solved from two generated towns so expected yearly deaths match the SSA 2023 life table; the chronic-condition weights were calibrated for the old shared threshold and are not refit. Replacement: A cohort calibration of base scale and condition weights together, checked across many places and ages against the life table. (parameter rows: src/core2/data/parameters.json:resilienceBaseRateScale)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/health.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/people/

**Notes.** Folded from: people-stopgap-health-estimated-behavior, people-stopgap-health-estimated-calibration. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Worked Oct 20 (claude/political-game-pool-8defjq), partly done. SG-P10-event-severity: the sourced band is now in data/research/health/bereavement-trajectories-bonanno-2002.json (Bonanno et al., JPSP 83(5), 2002, n 205 widowed older adults: resilient 45.9 percent, common grief 10.7, chronic grief 15.6, depressed-improved 10.2, chronic depression 7.8; the other three patterns under 5 percent each). scripts/health/bereavement-band.ts reads it and reports where a drawn town landed. The row stays open: its replacement is a model, not a number, and the town cannot be checked against the band yet because a death's mood effect reaches only full people and nearly all kin are counted (Biggersville, Mississippi, seed hb1, 700 days: 13 deaths, 0 bereaved full people). Filed as people-bereaved-counted-affect for the people builder. SG-P10-resilience-scale: not worked; it needs a cohort refit of the base scale and condition weights against the SSA life table across many places, which is a calibration run, not a lookup.

Measured Oct 20 (claude/political-game-pool-8defjq), SG-P10-resilience-scale: scripts/health/mortality-band.ts (seed mb1, six drawn places, one year from the opening) counts deaths among the full people against the SSA 2023 table for their ages: 17 deaths against 120.8 expected, a ratio of 0.141 (Fagatogo, American Samoa 1 of 18.5; St. Francis, Kansas 7 of 20.2; Kenneth City, Florida 2 of 20.4; Lewisburg, Louisiana 1 of 20.7; Calera, Alabama 5 of 20.3; Pomona, New York 1 of 20.8). The scale 0.106 was solved on 10,000-resident towns where every resident is a full person, so it does not hold for the smaller full-person set, or the opening-day start of strain and the onset-to-death lag hold first-year deaths down. This is a defect in play, not a sourcing gap, so the row stays open and the cause is filed as people-health-full-deaths-below-life-table for the people builder. Counted people's deaths do follow the table (counted-deaths-spread.test.ts).

