---
id: gov-stopgap-press-desk-missing-record
title: "Stopgaps in press-desk (missing-record): 1 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/press-desk.ts, kind missing-record"
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/press-desk.ts: SG-PEOPLE-press-bring-it-up-row. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/press-desk.ts

**Notes.** First row: Readers of a printed story learn which outlet printed what (the perceived fact printed:<outlet>:story), which bring-it-up's matcher reads, but bring-it-up's data has no change row for a printed story yet, so no one says
