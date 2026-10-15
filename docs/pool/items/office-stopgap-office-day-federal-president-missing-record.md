---
id: office-stopgap-office-day-federal-president-missing-record
title: "Stopgaps in office-day-federal-president (missing-record): 2 open"
area: office
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-federal-president.ts, kind missing-record"
---

**What.** Replace or clear the 2 open missing-record stopgap row(s) in src/core2/office-day-federal-president.ts: SG-OFFICE-FED-trip-residents, SG-OFFICE-FED-situation-room. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-federal-president.ts

**Notes.** First row: The people a traveler meets in a town other than the player's are recorded identities of that place (drawn from the world's seed and the town), with no household, job or other records there beyond the meeting.
