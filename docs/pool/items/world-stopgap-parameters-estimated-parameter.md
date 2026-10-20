---
id: world-stopgap-parameters-estimated-parameter
title: "Stopgaps in parameters (estimated-parameter): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: CTO: every row this item names is already resolved in stopgaps.json (SG-WORLD-macro-public-budget); drop it
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/macro/parameters.json, kind estimated-parameter"
---

**What.** Replace or clear the 1 open estimated-parameter stopgap row(s) in src/core2/data/macro/parameters.json: SG-WORLD-macro-public-budget. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/macro/parameters.json

**Notes.** First row: State and local budgets add no impulse to national output beyond their real average, and neither does the federal budget in a world without the budgets engine. Where the budgets engine runs, the federal budget's change f

**Checked Oct 17.** Stale: SG-WORLD-macro-public-budget is already `resolved` in src/core2/data/stopgaps.json (owner ruling Oct 16, no fiscal multiplier; the macro engine carries no budget impulse; removed in the macroFiscalMultiplier cleanup). Nothing to build; the CTO can drop this item.
