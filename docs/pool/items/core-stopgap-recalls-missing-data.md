---
id: core-stopgap-recalls-missing-data
title: "Stopgaps in recalls (missing-data): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/recalls.ts, kind missing-data"
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/modules/recalls.ts: SG-GOV-recall-signature-groups. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/recalls.ts

**Notes.** First row: A recall petition's signatures from the town's unnamed voters are the named residents' signing share times the town's estimated electorate (population times the 2024 voting share), against whatever signature base the sta
