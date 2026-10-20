---
id: research-macro-sourced-parameters
title: "Research: sourced parameters for the macro and regional models"
area: world
kind: research
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-v
pr:
blocked-on: CTO: confirm the Freddie Mac PMMS exclusion (#3959) was reversed, then resolve SG-WORLD-macro-mortgage-spread; territory statistics still to source
source: "collapsed Oct 19, 2026 from world-stopgap-macro-model-estimated-series, world-stopgap-regional-model-estimated-series"
claimed-at: 2026-10-20T02:17:41.176Z
---

**What.** Source the numbers behind the macro and regional models. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 2 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/world/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-WORLD-macro-mortgage-spread` in src/core2/macro-model.ts: Opening 30-year mortgage rates after April 2019 are the 10-year Treasury plus the 1990-2019 mean FHFA spread, not a published monthly rate. Replacement: A government monthly mortgage-rate series, or monthly HMDA origination dates if CFPB publishes them.
- `SG-WORLD-regional-territory-estimate` in src/core2/regional-model.ts: Guam, American Samoa, the Northern Marianas and the Virgin Islands start from their own latest published unemployment rate held flat (src/core2/data/regional/territories.json; American Samoa from the 2020 Census, the Marianas from a 2017 survey), with the nation's pay and price level and no industry mix. Replacement: Each territory's own published labor and price statistics (Guam BLS-funded surveys, USVI Bureau of Economic Research, CNMI and American Samoa statistical offices), or the nearest comparable economy, labeled with its source.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/macro-model.ts, src/core2/regional-model.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/world/

**Notes.** Folded from: world-stopgap-macro-model-estimated-series, world-stopgap-regional-model-estimated-series. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
