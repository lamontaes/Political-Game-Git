---
id: gov-stopgap-press-staff-missing-record
title: "Stopgaps in press-staff (missing-record): 1 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/press-staff.ts, kind missing-record"
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/press-staff.ts: SG-PEOPLE-press-staff-households. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/press-staff.ts

**Notes.** First row: An outlet's generated people each live alone in their own household with no rent, living costs or family, as the core's identity fill-in makes them, so their pay piles up as cash.
