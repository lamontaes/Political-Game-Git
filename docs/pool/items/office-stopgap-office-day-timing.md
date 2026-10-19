---
id: office-stopgap-office-day-timing
title: "Stopgaps in office-day (timing): 1 open"
area: office
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/office-day.ts, kind timing"
---

**What.** Replace or clear the 1 open timing stopgap row(s) in src/core2/modules/office-day.ts: SG-OFFICE-member-filings-at-midnight. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/office-day.ts

**Notes.** First row: Ordinances other members file at a regular meeting are voted at the start of the meeting's day, before the player's stop at the meeting's hour, so the player's character votes them on its own even when the player is at t
