---
id: gov-stopgap-justice-law-assumed-data
title: "Stopgaps in justice-law (assumed-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Each place's bribery-of-a-public-official grade and range read into data/research/justice/sentencing-ranges-2026.json, read by offense key....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/justice-law.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/justice-law.ts: SG-GOV-justice-bribery-grade. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/justice-law.ts

**Notes.** First row: Bribery is sentenced on the place's lowest felony-assault range from the sentencing research, not on the place's own bribery statute.
