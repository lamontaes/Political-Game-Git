---
id: core-stopgap-parameters-estimated-industry-priors
title: "Stopgaps in parameters (estimated-industry-priors): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs recorded, empirical or sourced data (Recorded firm budgets/books or cohort-matched individual data, with source availability and measured distributions; actual receipts remain conserving ...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind estimated-industry-priors"
claimed-at:
---

**What.** Replace or clear the 1 open estimated-industry-priors stopgap row(s) in src/core2/data/parameters.json: SG-P8-business-books-priors. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Firm demand/cost priors from later-vintage corporate aggregate ratios and conditional credit-line source rows, not observed individual-firm books or credit approval.

Looked at Oct 20 (claude/political-game-pool-3xfqef-6), released unbuilt: SG-P8-business-books-priors names its replacement as recorded firm budgets or cohort-matched individual firm data with measured distributions. That is a data-sourcing task (an established source such as the Census Annual Business Survey or BLS/SOI size-class tables, matched by industry and size), not an engine change; a builder with web access starts there, and the priors in `parameters.json` keep their ESTIMATED tag until then.
