---
id: world-stopgap-housing-property-tax-assumed-data
title: "Stopgaps in housing-property-tax (assumed-data): 1 open"
area: world
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-property-tax.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/housing-property-tax.ts: SG-WORLD-property-tax-rate. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/housing-property-tax.ts

**Notes.** Built on claude/political-game-pool-yucp92-g. The budgets engine already registered the rate, cap and payee from the law in force; four drawn towns billed the state-average fallback zero times in a played quarter. The fallback and its stopgap row are deleted. The state average still sizes the opening's outside living cost (housing.ts).
