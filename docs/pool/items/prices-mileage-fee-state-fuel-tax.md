---
id: prices-mileage-fee-state-fuel-tax
title: "The mileage fee refunds and weighs each place's own fuel tax, not the national average"
area: world
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Where a mileage fee replaces the fuel tax, the price engine refunds the fuel tax at the national average, 51.7 cents a gallon over 22.6 miles a gallon, and the outcome-web link `mileage-fee-to-vehicle-miles` sizes its change in the cost of a mile from the same averages (registered stopgap `SG-GOV-REACH-B-mileage-fee-price`). State fuel taxes run from 27.4 to 89.3 cents a gallon with the federal 18.4 (EIA, January 2026), so the same fee lowers the cost of a mile much more in a high-tax state and can raise it in a low-tax one. Give each place its own state's fuel tax from a sourced per-state table for all 56 places, with the territories marked as estimates.

**Rules.** One rule, all 56 places: a per-place table, no state named in logic. Estimate, never UNKNOWN. Research calibrates the size of the response; it never decides one household's trips.

**Done when.** A per-state fuel tax table with its source sits in `data/research/`, the price engine refunds each household its own state's tax per mile, the link's size reads the place's own cost change, the stopgap is resolved, and a played year of `buildBenchWorld` in two drawn places (seeds named) shows different refunds per mile by record id.

**Files.** src/core2/modules/place-prices.ts, data/research/outcome-web/links.json, src/core2/data/stopgaps.json

**Notes.** Found by the laws lead's helper on `claude/web-vehicle-miles-traveled-per-resident`, Oct 25.
