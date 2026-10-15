---
id: laws-stopgap-reach-group-b-missing-data
title: "Stopgaps in reach-group-b (missing-data): 1 open"
area: laws
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/laws/reach-group-b.json, kind missing-data"
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/data/laws/reach-group-b.json: SG-GOV-REACH-B-nonattainment-data. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/laws/reach-group-b.json

**Notes.** First row: A clean air plan binds the town's industrial employers (compliance record) wherever it's law, whether or not the county is in nonattainment.
