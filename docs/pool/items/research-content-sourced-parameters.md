---
id: research-content-sourced-parameters
title: "Research: sourced parameters for the content engine's life utility and civic progress"
area: core
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-content-estimated-behavior, core-stopgap-content-uncalibrated-tunable"
---

**What.** Source the numbers behind the content engine's life utility and civic progress. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 2 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/core/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P8-life-utility` in src/core2/data/content.json: Prototype need, goal, affect and trait utility mappings; authored player-circle daily, local-town weekly, state monthly and inactive husk cadence; one scored discretionary act per tier activation instead of a complete activity plan; empirical individual-choice calibration remains incomplete. Replacement: Validated data coefficients and activity totals across documented P9 lives and real cohort spreads. (parameter rows: src/core2/data/parameters.json:careNeedHalfExcessHazard)
- `SG-P8-civic-progress` in src/core2/data/content.json: Prototype civic availability and organization/approach consequences, rather than complete procedures. Replacement: An identified empirical range checked by an instrument-matched or activity-plan-matched calibration test; no parameter bound inferred from an unrelated outcome. (parameter rows: src/core2/data/parameters.json:lookupHours)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/content.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-content-estimated-behavior, core-stopgap-content-uncalibrated-tunable. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
