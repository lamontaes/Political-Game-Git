---
id: core-stopgap-parameters-estimated-behavior
title: "Stopgaps in parameters (estimated-behavior): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-core-parameters-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind estimated-behavior"
---

**What.** Replace or clear the 1 open estimated-behavior stopgap row(s) in src/core2/data/parameters.json: SG-P15-distance-by-place. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: How far a relative lives changes how often they are visited only by whether they are in the household's county (full pull) or elsewhere in the state (0.39 of it, from Pew 2005 daily contact by same or different town).

Folded into research-core-parameters-sourced-parameters (CTO, Oct 19, 2026).
