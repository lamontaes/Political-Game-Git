---
id: research-residents-district-placement-sourced
title: "Research: place a split town's households into its legislative districts by each district's own Census mix (SG-CORE-district-placement)"
area: people
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/district-placement
pr: #5698
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T19:07:37.330Z
---

**What.** Split from research-residents-sourced-parameters (row 3). SG-CORE-district-placement in src/core2/modules/residents.ts: a town split between state legislative districts places its counted households into the districts by income order, filling each in proportion to its Census population, so each district holds a slice of the town's income ladder. Replace it with each district's own Census tables (ACS by state legislative district: income, tenure, age) and its election results, so households are placed by the district's real mix. Open PR 5698 (claude/district-placement) works on this.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each row is SOURCED or ESTIMATED with a citation and a spread; SG-CORE-district-placement is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard, tripwire and calibration-guard tests pass; a one-year played world in a drawn split town (seed named) reports each district's mix and where the town landed.

**Files.** src/core2/modules/residents.ts,src/core2/data/parameters.json,src/core2/data/stopgaps.json,data/research/people/

**Notes.** TODO
