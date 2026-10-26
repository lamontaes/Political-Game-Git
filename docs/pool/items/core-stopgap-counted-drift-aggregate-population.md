---
id: core-stopgap-counted-drift-aggregate-population
title: "Stopgaps in counted-drift (aggregate-population): 3 open"
area: core
kind: stopgap
priority: 3
status: done
claimed-by: claude/pool-counted-drift-stale
pr: #4889
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/counted-drift.ts, kind aggregate-population"
claimed-at: 2026-10-19T23:16:14.900Z
---

**What.** Replace or clear the 3 open aggregate-population stopgap row(s) in src/core2/modules/counted-drift.ts: SG-CORE-counted-drift, SG-CORE-counted-moves, SG-CORE-counted-drift-named-workers. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/counted-drift.ts

**Notes.** Checked Oct 19: nothing is left to build. All three rows (SG-CORE-counted-drift, SG-CORE-counted-moves, SG-CORE-counted-drift-named-workers) are already `resolved` in src/core2/data/stopgaps.json (counted-drift.ts deleted Oct 17, claude/counted-drift-delete; named workers Oct 14), and no marker for them remains in src. The merger can mark this item done.

**Notes.** First row: The wider population's deaths and births come from rates applied to the counts each month: SSA cohort life tables scaled by the state's 2017 age-adjusted death rate against the nation's (NCHS), and NCHS 2024 national bir

Checked Oct 19 (claude): every stopgap row this item names is already resolved in src/core2/data/stopgaps.json: SG-CORE-counted-drift is resolved in stopgaps.json (Deleted Oct 17 (claude/counted-drift-delete): the counted births and deaths are the renewal engine's counted flows (src/core2/births-counted...); SG-CORE-counted-drift-named-workers is resolved in stopgaps.json (When a named worker leaves, the agreement names another qualified worker at the supplier or ends (the finance engine's public supplier rules...); SG-CORE-counted-moves is resolved in stopgaps.json (Deleted Oct 17 (claude/counted-drift-delete): counted people move between places from causes in the counted-moves engine (src/core2/modules/...). The CTO can drop this item.
