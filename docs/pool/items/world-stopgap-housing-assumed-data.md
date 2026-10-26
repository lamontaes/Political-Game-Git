---
id: world-stopgap-housing-assumed-data
title: "Stopgaps in housing (assumed-data): 2 open"
area: world
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-housing-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/housing.ts, kind assumed-data"
---

**What.** Replace or clear the 2 open assumed-data stopgap row(s) in src/core2/modules/housing.ts: SG-WORLD-housing-price-index, SG-WORLD-housing-island-areas. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/housing.ts

**Notes.** First row: Home prices follow FHFA's state house price index through its latest quarter (2026 Q2); after it, and where FHFA has no rows (Puerto Rico and the island areas), they follow consumer prices (CPI-U, which in the data ends

Folded into research-housing-sourced-parameters (CTO, Oct 19, 2026).
