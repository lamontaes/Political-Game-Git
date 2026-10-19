---
id: laws-stopgap-reach-group-b-missing-data
title: "Stopgaps in reach-group-b (missing-data): 1 open"
area: laws
kind: stopgap
priority: 3
status: dropped
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

Checked 2026-10-16 against main and dropped as already done: its only stopgap SG-GOV-REACH-B-nonattainment-data is resolved in stopgaps.json: the EPA Green Book county list is loaded (`data/business/nonattainment.json`) and the business engine charges only emitters in listed counties (pool laws-family-clean-air, Oct 15). Nothing is left to build; no PR of this item's own did the work.
