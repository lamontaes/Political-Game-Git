---
id: world-stopgap-housing-property-tax-faked-mechanic
title: "Stopgaps in housing-property-tax (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-property-tax.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/housing-property-tax.ts: SG-WORLD-property-tax-monthly. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/housing-property-tax.ts

**Notes.** First row: Property tax is paid a twelfth each month, as through a mortgage escrow, for every owner.
