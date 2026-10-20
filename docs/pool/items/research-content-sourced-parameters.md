---
id: research-content-sourced-parameters
title: "Research: sourced parameters for the content engine's life utility and civic progress"
area: core
kind: research
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-content-estimated-behavior, core-stopgap-content-uncalibrated-tunable"
---

**What.** Apply the sourced rows in docs/research/pool-feeder-oct20/research-content-sourced-parameters.md to the parameter table(s) and data files for sourced parameters for the content engine's life utility and civic progress. Each row already carries a value, a low and high spread, a tag (SOURCED or ESTIMATED) and a citation, so the builder enters them, adds a reader for each research file, and resolves these stopgap rows in src/core2/data/stopgaps.json: SG-P8-life-utility, SG-P8-civic-progress. Rows tagged mechanic name a change the area's builder makes to read the sourced inputs; build the simplest version and register what remains.

Rows:

- `SG-P8-life-utility` in src/core2/data/content.json: Prototype need, goal, affect and trait utility mappings; authored player-circle daily, local-town weekly, state monthly and inactive husk cadence; one scored discretionary act per tier activation instead of a complete activity plan; empirical individual-choice calibration remains incomplete. Replacement: Validated data coefficients and activity totals across docu...
- `SG-P8-civic-progress` in src/core2/data/content.json: Prototype civic availability and organization/approach consequences, rather than complete procedures. Replacement: An identified empirical range checked by an instrument-matched or activity-plan-matched calibration test; no parameter bound inferred from an unrelated outcome. (parameter rows: src/core2/data/parameters.json:lookupHours)

**Rules.** Research before building: the sourced figures calibrate the totals the proof reports and never decide what one person does. Estimate, never UNKNOWN: any value without a measure keeps its ESTIMATED tag, source and spread. One rule, all 56 places: place values live in data keyed by place code, never named in logic, and the proof draws a random place. No dice: no seeded roll or fixed percentage picks an actor's outcome; causes and records do.

**Done when.** Each row is SOURCED or ESTIMATED in its parameter table with a citation and a spread, the stopgap rows above are resolved in src/core2/data/stopgaps.json (or kept with a reason), the research-data reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports each band and where the town landed against it.

**Files.** src/core2/data/content.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-content-estimated-behavior, core-stopgap-content-uncalibrated-tunable. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-content-sourced-parameters.md (2 rows: 0 sourced, 2 estimated, 0 mechanic).
