---
id: laws-stopgap-reach-group-b-faked-mechanic
title: "Stopgaps in reach-group-b (faked-mechanic): 2 open"
area: laws
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/laws/reach-group-b.json, kind faked-mechanic"
---

**What.** Replace or clear the 2 open faked-mechanic stopgap row(s) in src/core2/data/laws/reach-group-b.json: SG-GOV-REACH-B-property-tax-bills, SG-GOV-REACH-B-business-cost. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/laws/reach-group-b.json

**Notes.** First row: The existing assessment and tax bill now read the cap law and settle full and counted owners through their own accounts. A yes/no catalog law still uses a generic estimated assessment cap rather than statutory levy-versu
