---
id: elections-stopgap-voting-missing-data
title: "Stopgaps in voting (missing-data): 2 open"
area: elections
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-elections-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/voting.ts, kind missing-data"
---

**What.** Replace or clear the 2 open missing-data stopgap row(s) in src/core2/modules/voting.ts: SG-GOV-polling-place-kind, SG-GOV-ballot-order-estimates. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/voting.ts

**Notes.** First row: Where the town's records hold no government building, its polling places have no building and a kind of "unread"; where they hold one, every precinct votes in it.

Folded into research-elections-sourced-parameters (CTO, Oct 19, 2026).
