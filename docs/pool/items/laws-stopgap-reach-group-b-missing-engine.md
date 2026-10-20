---
id: laws-stopgap-reach-group-b-missing-engine
title: "Stopgaps in reach-group-b (missing-engine): 13 open"
area: laws
kind: stopgap
priority: 3
size: L
status: in-pr
claimed-by: claude/split-reach-group-b
pr: #5296
blocked-on: laws-reach-b-price-proofs
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/laws/reach-group-b.json, kind missing-engine"
claimed-at: 2026-10-19T23:46:04.008Z
---

**What.** Replace or clear the 13 open missing-engine stopgap row(s) in src/core2/data/laws/reach-group-b.json: SG-GOV-REACH-B-transit-fare-price, SG-GOV-REACH-B-mileage-fee-price, SG-GOV-REACH-B-broadband-bill, SG-GOV-REACH-B-medicaid-coverage, SG-GOV-REACH-B-assistance-benefits, SG-GOV-REACH-B-preschool-enrollment, SG-GOV-REACH-B-voucher-payment, SG-GOV-REACH-B-building-cost, SG-GOV-REACH-B-energy-price, SG-GOV-REACH-B-land-use, SG-GOV-REACH-B-road-condition, SG-GOV-REACH-B-tuition, SG-GOV-REACH-B-park-use. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/laws/reach-group-b.json

**Notes.** Split Oct 19 into laws-reach-b-price-proofs, -medicaid-coverage, -snap-benefit, -schools-preschool-tuition, -housing-codes-land and -roads-parks (13 rows across six engines). Closed when all six are done.

**Original notes.** First row: The price engine now reads fare-free transit and refunds each full and counted household's estimated fare expenditure.
