---
id: world-stopgap-place-prices-faked-mechanic
title: "Stopgaps in place-prices (faked-mechanic): 2 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/place-prices.ts, kind faked-mechanic"
---

**What.** Replace or clear the 2 open faked-mechanic stopgap row(s) in src/core2/modules/place-prices.ts: SG-GOV-REACH-B-retail-price, SG-WORLD-prices-household-shares. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/place-prices.ts

**Notes.** First row: The price engine charges container deposits to full and counted households under the live law. Container use and redemption still use household estimates rather than each person's purchases and return decision.
