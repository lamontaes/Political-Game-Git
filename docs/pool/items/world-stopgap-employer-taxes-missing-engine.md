---
id: world-stopgap-employer-taxes-missing-engine
title: "Stopgaps in employer-taxes (missing-engine): 2 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: A business's books record no premises or their value, so there is nothing for the property-tax rate in force to read.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/employer-taxes.ts, kind missing-engine"
---

**What.** Replace or clear the 2 open missing-engine stopgap row(s) in src/core2/modules/employer-taxes.ts: SG-WORLD-business-profit-pass-through, SG-WORLD-business-premises-property-tax. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/employer-taxes.ts

**Notes.** First row: An owner-run business pays no tax on its profit: under the law its profit is its owner's income (a pass-through), and owners' draws and profit aren't taxed as income yet. Only businesses owned by another organization pay
