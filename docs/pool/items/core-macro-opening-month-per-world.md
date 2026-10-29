---
id: core-macro-opening-month-per-world
title: "The economy's opening month differs by world around the published figures"
area: core
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/realistic-macro-opening
pr: #6446
blocked-on:
lead: m0-m2
source: CTO opening root-cause report, Oct 27
claimed-at: 2026-10-27T23:14:20.002Z
---

**What.** Every game starts on January 20, 2025, and the macro engine opens from the published December 2024 row with no per-world spread (historyMonths, src/core2/macro-model.ts:106-136). So every world's address says unemployment 4.1, inflation 2.9, growth 2.6, wages 4.1 and mortgages 6.6 percent. The owner named the 4.1 percent on Oct 27 as content he should not already know. The record exists (macro-month:2024-12) but is the same in every world. Evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Rules.** Estimate, never UNKNOWN: each opening figure starts from the published value with a per-world spread taken from the series' sourced error or revision band, tagged ESTIMATED with its source in the parameter table. No dice: the draw is generation of the world's starting state, seeded once, never an actor's outcome. One rule, all 56 places.

**Done when.** In three played worlds (buildBenchWorld) on drawn places and seeds the builder did not choose, the macro-month record id for the opening month differs in unemployment and inflation across the worlds, each value sits inside the sourced band, and the address cites that record id; a test beside src/core2/macro-model.ts asserts both.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/macro-model.ts, src/core2/modules/macro.ts, src/core2/data/parameters.json

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: m0-m2.
