---
id: office-stopgap-office-day-federal-president-missing-mechanic
title: "Stopgaps in office-day-federal-president (missing-mechanic): 2 open"
area: office
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The executive engine's orders read only a state's powers (one orderable series, a governor's).
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-federal-president.ts, kind missing-mechanic"
---

**What.** Replace or clear the 2 open missing-mechanic stopgap row(s) in src/core2/office-day-federal-president.ts: SG-OFFICE-FED-presidential-orders, SG-OFFICE-FED-pardons. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-federal-president.ts

**Notes.** First row: The president has no executive order an engine carries: the list is empty.
