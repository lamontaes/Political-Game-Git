---
id: world-stopgap-housing-property-tax-assumed-data
title: "Stopgaps in housing-property-tax (assumed-data): 1 open"
area: world
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/political-game-pool-yucp92-g
pr: #5270
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-property-tax.ts, kind assumed-data"
claimed-at: 2026-10-20T03:22:01.071Z
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/housing-property-tax.ts: SG-WORLD-property-tax-rate. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/housing-property-tax.ts

**Notes.** First row: Every owner pays the state's average effective property tax rate, to the outside account, with no assessment cap. PR #5270 sent back: Merge conflict with main in code files src/core2/housing-property-tax.ts and src/core2/housing-property-tax.test.ts.
