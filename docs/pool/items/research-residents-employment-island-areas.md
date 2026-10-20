---
id: research-residents-employment-island-areas
title: "Research: island-area employment by age from the 2020 Decennial tables, with suppression and margin handling (SG-P8-resident-employment-proxy)"
area: people
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Split from research-residents-sourced-parameters, whose county-employment part merged as PR 5690 but left SG-P8-resident-employment-proxy open. Replace the proxy for the island areas (American Samoa, Guam, Northern Marianas, Virgin Islands) with their own employment-by-age observations from the 2020 Decennial Census island-area tables, with suppression and margin-of-error handling, as SOURCED or ESTIMATED rows with a citation and a spread, and a research file under data/research/people/ with a reader.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each island-area row is SOURCED or ESTIMATED in src/core2/data/parameters.json with a citation (publisher, year, URL) and a spread; SG-P8-resident-employment-proxy is resolved in src/core2/data/stopgaps.json with the source named; tests/guards/research-data-has-reader.test.ts, the tripwire and calibration-guard tests pass; a one-year played world (buildBenchWorld) in a drawn island area (seed named in the PR) reports the employment-by-age band and where the town landed.

**Files.** src/core2/data/resident-employment.json,src/core2/data/parameters.json,src/core2/data/stopgaps.json,data/research/people/

**Notes.** TODO
