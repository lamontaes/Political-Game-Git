---
id: world-stopgap-credit-faked-mechanic
title: "Stopgaps in credit (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/credit.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/modules/credit.ts: SG-WORLD-credit-business-applies. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/credit.ts

**Notes.** First row: A business with no recorded owner (a public employer, an ownerless landlord) applies for a line whenever its cash is below a few months of payroll; owned businesses' owners decide.
