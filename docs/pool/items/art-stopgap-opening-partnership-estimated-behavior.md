---
id: art-stopgap-opening-partnership-estimated-behavior
title: "Stopgaps in opening-partnership (estimated-behavior): 1 open"
area: art
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-partnership.ts, kind estimated-behavior"
---

**What.** Replace or clear the 1 open estimated-behavior stopgap row(s) in src/core2/opening-partnership.ts: SG-P15-partnership-model. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-partnership.ts

**Notes.** First row: Opening household members are aged from the place's records by household type: the chance of having a partner now comes from a yearly chain of first marriage (ACS 2024 never-married shares by age), divorce (NSFG women's
