---
id: office-stopgap-offices-estimated-calendar
title: "Stopgaps in offices (estimated-calendar): 1 open"
area: office
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-offices-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/offices.ts, kind estimated-calendar"
---

**What.** Replace or clear the 1 open estimated-calendar stopgap row(s) in src/core2/modules/offices.ts: SG-GOV-term-end-estimate. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/offices.ts

**Notes.** First row: The end of each term in progress at the opening for state and local offices: the seats of a body take turns over the years in one term that the office's calendar (the county schedule or the state's municipal election law

Folded into research-offices-sourced-parameters (CTO, Oct 19, 2026).
