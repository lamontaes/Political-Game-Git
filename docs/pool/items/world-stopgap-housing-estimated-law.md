---
id: world-stopgap-housing-estimated-law
title: "Stopgaps in housing (estimated-law): 1 open"
area: world
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-housing-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/housing.ts, kind estimated-law"
---

**What.** Replace or clear the 1 open estimated-law stopgap row(s) in src/core2/modules/housing.ts: SG-WORLD-housing-eviction-steps. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/housing.ts

**Notes.** First row: Eviction steps not yet read from official text: of 56 places, 30 have the notice period read, 23 whether a tenant can cure, 36 the hearing period and 34 the stay; the other values are recalled from secondary summaries, a

Folded into research-housing-sourced-parameters (CTO, Oct 19, 2026).
