---
id: people-stopgap-views-partial-model
title: "Stopgaps in views (partial-model): 1 open"
area: people
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-people-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/views.ts, kind partial-model"
---

**What.** Replace or clear the 1 open partial-model stopgap row(s) in src/core2/modules/views.ts: SG-P15-views-first-version. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/views.ts

**Notes.** First row: Opening views read the person's state and age band (the CES cell), their education and faith profile (opening-profile.ts, itself a stopgap) and a household heritage; the 14 values and issue stances at the opening are not

Folded into research-people-sourced-parameters (CTO, Oct 19, 2026).
