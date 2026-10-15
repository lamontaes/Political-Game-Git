---
id: world-stopgap-counted-money-faked-mechanic
title: "Stopgaps in counted-money (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/counted-money.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/counted-money.ts: SG-CORE-counted-unkeyed-money. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/counted-money.ts

**Notes.** First row: Money an engine pays to or takes from a place's counted residents as a whole (an owner's draw to owners who are counted, a pooled property tax bill, a price change on counted households, money left in the place's residen
