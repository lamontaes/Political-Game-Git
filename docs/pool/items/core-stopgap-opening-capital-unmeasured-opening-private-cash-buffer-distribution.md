---
id: core-stopgap-opening-capital-unmeasured-opening-private-cash-buffer-distribution
title: "Stopgaps in opening-capital (unmeasured-opening-private-cash-buffer-distribution): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-opening-capital-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-capital.json, kind unmeasured-opening-private-cash-buffer-distribution"
---

**What.** Replace or clear the 1 open unmeasured-opening-private-cash-buffer-distribution stopgap row(s) in src/core2/data/opening-capital.json: SG-P8-opening-private-cash-buffer-spread. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-capital.json

**Notes.** First row: A WHO-only stable per-firm startup cash-buffer rank and continuous quantile curve with one authored tail-span coefficient. Published q25/median/q75 are real observations; the full CDF and endpoints are estimates.

Folded into research-opening-capital-sourced-parameters (CTO, Oct 19, 2026).
