---
id: research-core-recall-petition-windows
title: "Twelve more places' recall timing bars read from statute, and published bands for five life-engine parts"
area: core
kind: research
priority: 2
size: S
status: in-pr
claimed-by: claude/dreamy-tesla-bgi3ui-core
pr: #5853
blocked-on:
source: "split Oct 24, 2026 from research-core-sourced-parameters (PR #5853)"
claimed-at: 2026-10-24T01:40:00.000Z
---

**What.** Reads the local recall timing bars of twelve more places (Alaska, D.C., Florida, Georgia, Louisiana, Montana, Nebraska, Nevada, North Dakota, South Dakota, Washington and Wyoming) from their statutes into src/core2/data/campaigns/recall-bars.json, 10 SOURCED and 2 ESTIMATED (North Dakota and Washington, whose bars count from an election), each with its statute quote and URL, read by recallBarsFor in src/core2/modules/recalls.ts. That gives 21 of the 22 places with a petitioned local recall their own dates. It adds six research files under data/research/core/ (recall-timing-statutes-2026.json, naco-2022-county-authority.json, atus-2025-socializing.json, tie-decay-panels-2015.json, affect-trajectories-2018.json and opening-pregnancy-2024.json), read by scripts/research/check-core-research.ts and scripts/research/core-year.ts, which give closeness, stress after a loss, free hours, opening pregnancies and county powers each a published band. The replacements of `SG-P15-closeness-model`, `SG-P8-emotion-model`, `SG-P15-free-block-plan`, `SG-GOV-policy-power-conditions`, `SG-GOV-recall-bars-national` and `SG-M1-opening-pregnancies` in src/core2/data/stopgaps.json now name their research file and the builder item that will read it, and all six stay open. A played year in Brookridge, Florida (seed b33cd563d91f) reports each band and where the town landed. Split from research-core-sourced-parameters, which stays open for `unmodeledLeisureValuePerHour` (still TUNABLE, no source converts to its score units; its citation in src/core2/data/parameters.json now names the ATUS 2025 band, 28.2% to 32.5% of people socialize on a day) and for the six stopgaps' mechanics.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome. Estimate, never UNKNOWN: a row with no exact source is ESTIMATED with its source and spread, never invented, so the North Dakota and Washington bars that count from an election are ESTIMATED. One rule, all 56 places: recall bars and county authority are per-place rows in data, never a state named in logic, and the played year draws its place from all 56.

**Done when.** (a) Each of these rows is SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation), or, for a fact of law or record, quotes the fetched text with its URL: the twelve local recall timing rows in src/core2/data/campaigns/recall-bars.json (10 SOURCED, 2 ESTIMATED). (b) Each of the six new files under data/research/core/ has a reader in scripts/research/check-core-research.ts or scripts/research/core-year.ts, and the failure list of tests/guards/research-data-has-reader.test.ts names none of them. (c) Each of the six stopgaps named in What keeps its row in src/core2/data/stopgaps.json with a `replacement` naming the source read, the research file and the builder item that finishes it. (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, src/core2/tooling/calibration-guard.test.ts). (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports each band (visits, family and non-kin closeness, stress after a death, opening pregnancies, recall bars and county authority) and where the town landed, with record ids where the year produced a record.

**Files.** src/core2/data/campaigns/recall-bars.json, src/core2/data/stopgaps.json, src/core2/data/parameters.json, data/research/core/recall-timing-statutes-2026.json, data/research/core/naco-2022-county-authority.json, data/research/core/atus-2025-socializing.json, data/research/core/tie-decay-panels-2015.json, data/research/core/affect-trajectories-2018.json, data/research/core/opening-pregnancy-2024.json, scripts/research/check-core-research.ts, scripts/research/core-year.ts

**Notes.** Split Oct 24, 2026 from research-core-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5853 on branch claude/dreamy-tesla-bgi3ui-core.
