---
id: people-stopgap-births-counted-generated-record
title: "Stopgaps in births-counted (generated-record): 1 open"
area: people
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/births-counted.ts, kind generated-record"
---

**What.** Replace or clear the 1 open generated-record stopgap row(s) in src/core2/births-counted.ts: SG-PW8-counted-arrivals. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/births-counted.ts

**Notes.** First row: Households that move into the counted population are generated in the shape of a household already recorded in the place (ages, sexes, who is family), with new names and temperaments from the world's seed, and arrive wit
