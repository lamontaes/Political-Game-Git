---
id: world-stopgap-macro-model-estimated-series
title: "Stopgaps in macro-model (estimated-series): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (A government monthly mortgage-rate series, or monthly HMDA origination dates if CFPB publishes them....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/macro-model.ts, kind estimated-series"
---

**What.** Replace or clear the 1 open estimated-series stopgap row(s) in src/core2/macro-model.ts: SG-WORLD-macro-mortgage-spread. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/macro-model.ts

**Notes.** First row: Opening 30-year mortgage rates after April 2019 are the 10-year Treasury plus the 1990-2019 mean FHFA spread, not a published monthly rate.
