---
id: world-stopgap-regional-model-estimated-series
title: "Stopgaps in regional-model (estimated-series): 1 open"
area: world
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-macro-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/regional-model.ts, kind estimated-series"
---

**What.** Replace or clear the 1 open estimated-series stopgap row(s) in src/core2/regional-model.ts: SG-WORLD-regional-territory-estimate. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/regional-model.ts

**Notes.** First row: Guam, American Samoa, the Northern Marianas and the Virgin Islands start from their own latest published unemployment rate held flat (src/core2/data/regional/territories.json; American Samoa from the 2020 Census, the Mar

Folded into research-macro-sourced-parameters (CTO, Oct 19, 2026).
