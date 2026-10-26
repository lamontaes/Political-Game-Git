---
id: gov-stopgap-officials-assumed-data
title: "Stopgaps in officials (assumed-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-gov-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/officials.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/modules/officials.ts: SG-OFFICIALS-unrecorded-party. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/officials.ts

**Notes.** First row: A holder whose party the roster doesn't record (a statewide executive such as an attorney general or treasurer, or a legislative seat with no roster row) sits in the party that carried the state in 2024; a lieutenant gov

Folded into research-gov-sourced-parameters (CTO, Oct 19, 2026).
