---
id: core-stopgap-opening-customers-unresolved-external-product-buyer-demand-crosswalk
title: "Stopgaps in opening-customers (unresolved-external-product-buyer-demand-crosswalk): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-opening-customers-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-customers.json, kind unresolved-external-product-buyer-demand-crosswalk"
---

**What.** Replace or clear the 1 open unresolved-external-product-buyer-demand-crosswalk stopgap row(s) in src/core2/data/opening-customers.json: SG-P8-outside-product-demand-crosswalk. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-customers.json

**Notes.** First row: The current twelve zero-receipt booked firms have no product-qualified customer classification route. A proposed extension still needs actual product/service, buyer need/order and dated amount/price records; no uniform o

Folded into research-opening-customers-sourced-parameters (CTO, Oct 19, 2026).
