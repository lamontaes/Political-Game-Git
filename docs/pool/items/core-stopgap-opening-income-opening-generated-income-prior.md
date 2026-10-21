---
id: core-stopgap-opening-income-opening-generated-income-prior
title: "Stopgaps in opening-income (opening-generated-income-prior): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-opening-income-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-income.json, kind opening-generated-income-prior"
---

**What.** Replace or clear the 1 open opening-generated-income-prior stopgap row(s) in src/core2/data/opening-income.json: SG-P8-opening-retirement-income. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-income.json

**Notes.** First row: Fictional summarized covered career, retirement claim/award and local retirement disbursement view. The official January 2021 estimated retired-worker average supplies an amount prior; person career-length scaling and va

Folded into research-opening-income-sourced-parameters (CTO, Oct 19, 2026).
