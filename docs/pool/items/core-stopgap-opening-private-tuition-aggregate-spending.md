---
id: core-stopgap-opening-private-tuition-aggregate-spending
title: "Stopgaps in opening-private-tuition (aggregate-spending): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5294
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-private-tuition.ts, kind aggregate-spending"
claimed-at:
---

**What.** Replace or clear the 1 open aggregate-spending stopgap row(s) in src/core2/opening-private-tuition.ts: SG-CORE-private-tuition-average. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-private-tuition.ts

**Notes.** First row: Each household with school-age children pays its children's share of the town's private tuition (the national private share times the average tuition) to the town's private school; no family chooses a school, and no chil
