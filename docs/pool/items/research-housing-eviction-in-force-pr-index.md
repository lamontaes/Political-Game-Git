---
id: research-housing-eviction-in-force-pr-index
title: "Eviction steps in 21 places read from statute text in force on opening day; Puerto Rico prices follow FHFA"
area: world
kind: research
priority: 2
size: S
status: done
claimed-by:
pr: #5873
blocked-on:
source: "split Oct 24, 2026 from research-housing-sourced-parameters (PR #5873)"
claimed-at:
---

**What.** Reads 46 eviction steps in 21 states and territories from the statute text in force on January 20, 2025, the day the game opens, into data/research/world/eviction-statute-reads-2026.json, and corrects src/core2/data/housing/housing.json to match, so 10 places now evict on different days or with a different right to pay and stay; Hawaii's, Texas's and the District's later laws are recorded there as dated changes for a builder. Puerto Rico's home prices now follow FHFA's own index (fhfa-hpi-pr-2026q2.json, 125 quarters), Minnesota's foreclosure sale notice is corrected to 42 days and Texas's foreclosure steps are read (foreclosure-reads-2026.json), and HUD's 2025 shelter beds by city (hud-hic-2025-beds-by-city.json) and the ACS 2020-2024 owner mortgage and move-in shares by state and county (acs-2024-owner-mortgage-moved-in-by-county.json) are recorded for the builders who will read them. scripts/research/housing-check.ts reads all five files and exits 1 if a table an engine reads disagrees with them or an eviction read lacks its in-force date, and scripts/research/housing-year.ts reports the played year. It updates the `replacement` of the six stopgaps SG-WORLD-housing-eviction-steps, SG-WORLD-housing-foreclosure-steps, SG-WORLD-housing-price-index, SG-WORLD-housing-shelter-beds-state-rate, SG-WORLD-housing-shelter-territory and SG-WORLD-housing-mortgage-history. Split from research-housing-sourced-parameters, which stays open for the 25 places whose eviction steps were not read, the unread foreclosure statutes, the four island areas' prices and the two mechanics.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome; an eviction step is the place's law, read from its statute. Estimate, never UNKNOWN: a step whose statute the cloud could not reach keeps its recalled or median value with its confidence marked, never invented. One rule, all 56 places: eviction, foreclosure, price-index, shelter and mortgage rows are per-place tables in data, with no state named in logic. Replace, never layer: values are corrected in place in housing.json and foreclosure.json, with nothing added beside them.

**Done when.** (a) Each eviction and foreclosure row read here quotes the fetched statute text with its URL and records how it was confirmed in force on January 20, 2025 (46 eviction field reads in 21 places, Minnesota's 42-day sale notice and Texas's foreclosure steps), except three reads whose pages show no history (Massachusetts, the Northern Marianas and Wyoming), which say so; the foreclosure national figure carries its spread, 563 to 645 days; and Puerto Rico's price index is SOURCED from FHFA (125 quarters, 1995 Q2 to 2026 Q2). (b) Each of the five new files under data/research/world/ is read by scripts/research/housing-check.ts and scripts/research/housing-year.ts, and tests/guards/research-data-has-reader.test.ts lists none of them. (c) The six stopgaps named in What stay open in src/core2/data/stopgaps.json, each `replacement` naming what was read (or, for SG-WORLD-housing-shelter-territory, that no count was found) and the item that finishes it. (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, calibration-guard.test.ts), and so do the housing, housing-homeless, housing-mortgages, housing-island-areas, housing-readers and foreclosure-outside-lender engine tests. (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports each band and where the town landed, with record ids.

**Files.** data/research/world/eviction-statute-reads-2026.json, data/research/world/fhfa-hpi-pr-2026q2.json, data/research/world/foreclosure-reads-2026.json, data/research/world/hud-hic-2025-beds-by-city.json, data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json, scripts/research/housing-check.ts, scripts/research/housing-year.ts, src/core2/data/housing/housing.json, src/core2/data/housing/foreclosure.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 24, 2026 from research-housing-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5873 on branch claude/dreamy-tesla-bgi3ui-housing.

Sent back 2026-10-23 from PR #5873 (branch claude/dreamy-tesla-bgi3ui-housing): quoted business-day/holiday exclusions are treated as calendar days, without the remaining approximation registered or disclosed in the timing claim; finish on that branch, merge main into it first.
