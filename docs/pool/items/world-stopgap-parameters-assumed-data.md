---
id: world-stopgap-parameters-assumed-data
title: "Stopgaps in parameters (assumed-data): 1 open"
area: world
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-world-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/business/parameters.json, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/data/business/parameters.json: SG-WORLD-business-compliance-cost. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/business/parameters.json

**Notes.** First row: A compliance duty costs every bound business twice the manufacturing average pollution-abatement share of its operating costs.

Folded into research-world-sourced-parameters (CTO, Oct 19, 2026).
