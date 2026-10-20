---
id: gov-stopgap-legislature-assumed-data
title: "Stopgaps in legislature (assumed-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Each place's ordinance numbering and enacting clause read from its code of ordinances into the municipal rule pack, the way its recall rules are....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/legislature.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/modules/legislature.ts: SG-GOV-local-bill-numbering. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/legislature.ts

**Notes.** First row: Every town's and county's body numbers its ordinances the same way, by the year and order of introduction ("2026-12"), and opens them with the same 'Be it ordained by' clause, not each place's own style.
