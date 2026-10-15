---
id: core-stopgap-parameters-estimated-industry-priors
title: "Stopgaps in parameters (estimated-industry-priors): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind estimated-industry-priors"
---

**What.** Replace or clear the 1 open estimated-industry-priors stopgap row(s) in src/core2/data/parameters.json: SG-P8-business-books-priors. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Firm demand/cost priors from later-vintage corporate aggregate ratios and conditional credit-line source rows, not observed individual-firm books or credit approval.
