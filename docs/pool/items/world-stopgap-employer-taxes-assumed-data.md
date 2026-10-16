---
id: world-stopgap-employer-taxes-assumed-data
title: "Stopgaps in employer-taxes (assumed-data): 1 open"
area: world
kind: stopgap
priority: 3
status: done
claimed-by: claude/employer-share-counted
pr: #4825
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/employer-taxes.ts, kind assumed-data"
claimed-at: 2026-10-16T21:15:54.379Z
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/modules/employer-taxes.ts: SG-WORLD-employer-tax-counted-wages. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/employer-taxes.ts

**Notes.** First row: Employers pay no Social Security or Medicare share on wages paid to counted workers through the residents' merged wage flows; only full workers' paychecks carry the employer share.
