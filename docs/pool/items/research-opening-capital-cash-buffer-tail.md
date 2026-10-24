---
id: research-opening-capital-cash-buffer-tail
title: "Opening cash-buffer tail span sourced at 2.7 (was 1) from the Chase Institute curve; medians reopened"
area: core
kind: research
priority: 2
size: S
status: in-pr
claimed-by: claude/dreamy-tesla-bgi3ui-opening-capital
pr: #5860
blocked-on:
source: "split Oct 24, 2026 from research-opening-capital-sourced-parameters (PR #5860)"
claimed-at: 2026-10-24T01:40:00.000Z
---

**What.** The opening's private-employer cash curve now has a sourced tail. openingEmployerCashBufferTailSpan in src/core2/data/parameters.json moves from 1 (TUNABLE, an authored coefficient with no spread) to 2.7 (ESTIMATED, spread 2.6 to 2.85) from JPMorgan Chase Institute, Cash Is King, 2016, Figure 5, whose outline puts 14.9 percent of firms above 100 days; the curve built by `openingEmployerCashBufferAtQuantile` in src/core2/opening-capital.ts now ends at about 156 days where the old span ended it at 97. The thirteen openingEmployerCashBufferDays median rows were reopened against Figures 6 and 7 and stay ESTIMATED, unchanged, and the engine now requires an ESTIMATED tail row with its spread. The new data/research/core/jpmci-cash-buffer-days-2016.json and data/research/core/census-sbps-cash-on-hand-2022.json (a cross-check, not a value) are read by scripts/research/opening-capital-tail-span.ts, the `replacement` of SG-P8-opening-private-cash-buffer and SG-P8-opening-private-cash-buffer-spread is rewritten in src/core2/data/stopgaps.json, and scripts/research/opening-capital-year.ts reports the played year. Split from research-opening-capital-sourced-parameters, which stays open for all three opening-capital stopgaps.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome. Estimate, never UNKNOWN: a row with no exact source is ESTIMATED with its source and spread, never invented; the tail span is read from the published outline, not authored. Sliding scales and causes: the tail span sets a curve shape, not a cutoff, so it is sourced here and not filed as a bug. Replace, never layer: the old tail row's checkRange, its calibration binding and the spread target only it used are deleted in the same change.

**Done when.** (a) Each of these rows is SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation): openingEmployerCashBufferTailSpan (ESTIMATED, 2.7, spread 2.6 to 2.85, JPMorgan Chase Institute, Cash Is King, 2016, Figure 5, with the PDF hash) and the thirteen openingEmployerCashBufferDays median rows (ESTIMATED with the same citation and quartile spreads, reopened unchanged) in src/core2/data/parameters.json. (b) Each new file under data/research/core/ has a reader in src/ or scripts/ (not tests or scripts/audit), and tests/guards/research-data-has-reader.test.ts lists none of them. (c) SG-P8-opening-private-cash-buffer and SG-P8-opening-private-cash-buffer-spread each keep their row in src/core2/data/stopgaps.json with a `replacement` that starts with what was found on Oct 23 and says what would make the rows SOURCED. (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, calibration-guard.test.ts). (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports each median row's band and where the town landed, the tail span's band against the share of employers beyond 100 days, and another engine reading the cash, with record ids. (f) src/core2/opening-capital.test.ts and src/core2/press-opening-cash.test.ts pass, and the renamed tail-labeling test fails on main's TUNABLE row. (g) The old tail row's checkRange, its binding, its blocked-binding row and the spread target only it used (322 lines of src/core2/tooling/calibration-targets.json) and the data field spreadTargetRef are deleted. (h) scripts/research/opening-capital-tail-span.ts exits 0 against the new row and exited 1 against the old one.

**Files.** src/core2/data/parameters.json, src/core2/data/opening-capital.json, src/core2/opening-capital.ts, src/core2/opening-capital.test.ts, src/core2/tooling/calibration-targets.json, src/core2/data/stopgaps.json, data/research/core/jpmci-cash-buffer-days-2016.json, data/research/core/census-sbps-cash-on-hand-2022.json, scripts/research/opening-capital-tail-span.ts, scripts/research/opening-capital-year.ts

**Notes.** Split Oct 24, 2026 from research-opening-capital-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5860 on branch claude/dreamy-tesla-bgi3ui-opening-capital.
