---
id: core-stopgap-parameters-retired-stock-generation-control
title: "Stopgaps in parameters (retired-stock-generation-control): 2 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind retired-stock-generation-control"
---

**What.** Replace or clear the 2 open retired-stock-generation-control stopgap row(s) in src/core2/data/parameters.json: SG-P8-param-openingRetirementPayerReserveMonths, SG-P8-param-openingRetirementFundingLiquidShare. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Compatibility key only. New retirement views and outside-flow owners start at zero; no prepaid stock, annual-flow-to-cash conversion or survival buffer remains in this candidate.
