---
id: world-stopgap-housing-mortgages-assumed-data
title: "Stopgaps in housing-mortgages (assumed-data): 1 open"
area: world
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-housing-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-mortgages.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/housing-mortgages.ts: SG-WORLD-housing-mortgage-history. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/housing-mortgages.ts

**Notes.** First row: Each owner's purchase year comes from the national move-in distribution by age rank, the purchase price is today's value moved back by the state's FHFA house price index, the loan is a 30-year fixed with the NAR median d

Folded into research-housing-sourced-parameters (CTO, Oct 19, 2026).
