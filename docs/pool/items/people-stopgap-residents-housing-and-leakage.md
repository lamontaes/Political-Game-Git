---
id: people-stopgap-residents-housing-and-leakage
title: "Stopgaps in residents (housing-and-leakage): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: Rent and non-local spending were never paid, so household cash grew without limit.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/residents.ts, kind housing-and-leakage"
---

**What.** Replace or clear the 1 open housing-and-leakage stopgap row(s) in src/core2/residents.ts: SG-CORE-outside-living-costs. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/residents.ts

**Notes.** First row: Each household's assigned living cost (CEX basket plus HUD Fair Market Rent) not bought from a recorded local seller is paid to one outside account on the 1st: no landlord, mortgage, utility or outside store.
