---
id: people-stopgap-births-plan-estimated-record
title: "Stopgaps in births-plan (estimated-record): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The opening writes partnerships without a start date for many couples, so a long marriage looked brand new on the opening day.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/births-plan.ts, kind estimated-record"
---

**What.** Replace or clear the 1 open estimated-record stopgap row(s) in src/core2/births-plan.ts: SG-PW8-partnership-start. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/births-plan.ts

**Notes.** First row: When a couple has no dated partner fact (or it is dated the opening day), the partnership start is estimated: one birth-spacing interval before their first child, else the mother reaching the usual age of a first union.
