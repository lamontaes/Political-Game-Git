---
id: core-stopgap-succession-missing-record
title: "Stopgaps in succession (missing-record): 1 open"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/succession.ts, kind missing-record"
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/modules/succession.ts: SG-GOV-succession-qualifications. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/succession.ts

**Notes.** First row: Everyone in the line of succession to the presidency is taken to be a natural-born citizen and 14 years a resident; only the age of 35 is checked.
