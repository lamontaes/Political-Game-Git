---
id: research-content-atus-lookup-hours
title: "Look-up hours sourced from the time-use survey, with the content engine's acts checked in a played year"
area: core
kind: research
priority: 2
size: S
status: done
claimed-by: claude/dreamy-tesla-bgi3ui
pr: #5848
blocked-on:
source: "split Oct 24, 2026 from research-content-sourced-parameters (PR #5848)"
claimed-at: 2026-10-24T01:40:00.000Z
---

**What.** Sources `lookupHours` in src/core2/data/parameters.json: it moves from 0.25 hours (TUNABLE, no source) to 0.91 hours, ESTIMATED, with a spread of 0.72 to 1.06 hours, from the BLS American Time Use Survey 2025, Table A-1, Government services (hours a day for the people who did it). The look-up act in src/core2/choice.ts reads it. The research file data/research/core/bls-atus-table-a1-2025.json holds six ATUS rows, each with the table line it was read from and the hash of each PDF, and scripts/research/content-year.ts reads it and exits 1 when `lookupHours` or its spread differs from the file. The calibration binding for `lookupHours` is removed from src/core2/tooling/calibration-targets.json, since bindings are kept only for TUNABLE rows. The replacements of `SG-P8-civic-progress` and `SG-P8-life-utility` in src/core2/data/stopgaps.json now name the source, the research file and the builder items `core-stopgap-content-uncalibrated-tunable` and `core-stopgap-content-estimated-behavior`, and both stopgaps stay open. A played year in Burton, Illinois (seed f636289e1e36) reports the care, look-up and civic acts against the ATUS bands. Split from research-content-sourced-parameters, which stays open for `careNeedHalfExcessHazard` (still TUNABLE, no source converts to its units) and for both stopgaps.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome. Estimate, never UNKNOWN: a row with no exact source is ESTIMATED with its source and spread, never invented, so `lookupHours` is ESTIMATED because ATUS has no activity for looking up an office.

**Done when.** (a) Each of these rows is SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation): `lookupHours` in src/core2/data/parameters.json. (b) The new file data/research/core/bls-atus-table-a1-2025.json has a reader in scripts/research/content-year.ts, and the failure list of tests/guards/research-data-has-reader.test.ts does not name it. (c) `SG-P8-civic-progress` and `SG-P8-life-utility` each keep their row in src/core2/data/stopgaps.json with a `replacement` naming the source read, the research file and the builder item that finishes it. (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, src/core2/tooling/calibration-guard.test.ts). (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports each ATUS band for the care, look-up and civic acts and where the town landed, with record ids.

**Files.** src/core2/data/parameters.json, src/core2/data/stopgaps.json, src/core2/tooling/calibration-targets.json, data/research/core/bls-atus-table-a1-2025.json, scripts/research/content-year.ts

**Notes.** Split Oct 24, 2026 from research-content-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5848 on branch claude/dreamy-tesla-bgi3ui.
