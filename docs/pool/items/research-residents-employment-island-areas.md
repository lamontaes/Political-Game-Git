---
id: research-residents-employment-island-areas
title: "Research: island-area employment by age from the 2020 Decennial tables, with suppression and margin handling (SG-P8-resident-employment-proxy)"
area: people
kind: research
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5764
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Split from research-residents-sourced-parameters, whose county-employment part merged as PR 5690 but left SG-P8-resident-employment-proxy open. Replace the proxy for the island areas (American Samoa, Guam, Northern Marianas, Virgin Islands) with their own employment-by-age observations from the 2020 Decennial Census island-area tables, with suppression and margin-of-error handling, as SOURCED or ESTIMATED rows with a citation and a spread, and a research file under data/research/people/ with a reader.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each island-area row is SOURCED or ESTIMATED in src/core2/data/parameters.json with a citation (publisher, year, URL) and a spread; SG-P8-resident-employment-proxy is resolved in src/core2/data/stopgaps.json with the source named; tests/guards/research-data-has-reader.test.ts, the tripwire and calibration-guard tests pass; a one-year played world (buildBenchWorld) in a drawn island area (seed named in the PR) reports the employment-by-age band and where the town landed.

**Files.** src/core2/data/resident-employment.json,src/core2/data/parameters.json,src/core2/data/stopgaps.json,data/research/people/

**Notes.** TODO

Sent back 2026-10-20 from PR #5764 (branch claude/island-employment): The shared county-table reader avoids duplicating a parameter layer, and narrowing the residual county fallback is appropriate. The research acceptance still needs an evidence mapping for its SOURCED/ESTIMATED rows, citation and spread, plus suppression/margin handling and the research record with a reader. The new county-count pairs and citations do not document those uncertainty/suppression requirements, and the body explicitly leaves the named proxy row open rather than explaining how its required island-area resolution is represented. Supply the required Done when table, explain any inapplicable Census sampling-margin requirement rather than inventing an interval, document suppressed-cell handling and the remaining county fallback, and show the acceptance with the actual data layout. Also the new played-year test asserts only core.date > gameStartDate after advancing; assert the actual 365-day target and report the named employment-band outcome. No local gate pass is claimed here.; finish on that branch, merge main into it first.
