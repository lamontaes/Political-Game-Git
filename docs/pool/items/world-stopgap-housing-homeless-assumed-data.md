---
id: world-stopgap-housing-homeless-assumed-data
title: "Stopgaps in housing-homeless (assumed-data): 2 open"
area: world
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-housing-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-homeless.ts, kind assumed-data"
---

**What.** Replace or clear the 2 open assumed-data stopgap row(s) in src/core2/housing-homeless.ts: SG-WORLD-housing-shelter-beds-state-rate, SG-WORLD-housing-shelter-territory. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/housing-homeless.ts

**Notes.** First row: A place's shelter beds are its state's year-round beds per 10,000 people (HUD 2025 Housing Inventory Count) times its own people, not the beds its Continuum of Care actually lists in or near it.

Folded into research-housing-sourced-parameters (CTO, Oct 19, 2026).
