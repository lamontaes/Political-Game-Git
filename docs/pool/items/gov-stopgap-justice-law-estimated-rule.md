---
id: gov-stopgap-justice-law-estimated-rule
title: "Stopgaps in justice-law (estimated-rule): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The common rule in state constitutions and codes; each state's rule and its timing (conviction, sentencing or final appeal) are not read.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/justice-law.ts, kind estimated-rule"
---

**What.** Replace or clear the 1 open estimated-rule stopgap row(s) in src/core2/justice-law.ts: SG-GOV-justice-forfeiture-by-place. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/justice-law.ts

**Notes.** First row: Every place vacates an office on a felony conviction, on the day of the conviction.
