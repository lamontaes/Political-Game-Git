---
id: prices-mileage-fee-state-fuel-tax
title: "The mileage fee refunds and weighs each place's own fuel tax, not the national average"
area: world
kind: research
priority: 3
size: S
status: dropped
claimed-by:
pr:
after:
blocked-on:
standard: 2
lead: laws
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Where a mileage fee replaces the fuel tax, the price engine refunds the fuel tax at the national average, 51.7 cents a gallon over 22.6 miles a gallon, and the outcome-web link `mileage-fee-to-vehicle-miles` sizes its change in the cost of a mile from the same averages (registered stopgap SG-GOV-REACH-B-mileage-fee-price). State fuel taxes run from 27.4 to 89.3 cents a gallon with the federal 18.4 (EIA, January 2026), so the same fee lowers the cost of a mile much more in a high-tax state and can raise it in a low-tax one. Give each place its own state's fuel tax from a sourced per-state table for all 56 places, with the territories marked as estimates.

**Cause.** Found in code: src/core2/modules/place-prices.ts refunds the fuel tax at the national average (`fuelTaxCentsPerGallon`, about line 433) under the open stopgap SG-GOV-REACH-B-mileage-fee-price (src/core2/data/stopgaps/gov.json, line 578); the link is in data/research/outcome-web/links.json.

**Fix.** Add a sourced per-state fuel tax table under data/research (territories ESTIMATED, with source and spread), refund each household its own state's tax per mile, size the outcome-web link from the place's own cost change, and resolve the stopgap.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: a per-place table, no state named in logic. Estimate, never UNKNOWN: a territory with no source starts from an average marked as an estimate. Research before building: fetch and quote the source; research calibrates the size of the response and never decides one household's trips.

**Done when.** A second session (not the builder) plays a year of `buildBenchWorld` in two drawn places in states with different fuel taxes (places and seeds named) with a mileage fee enacted, and finds different refunds per mile for named households in the two places, by journal record id, each equal to that state's table value. The per-state table with its source sits in data/research/, the link's size reads the place's own cost change, and the stopgap is resolved in src/core2/data/stopgaps/gov.json.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, data/research/outcome-web/links.json, src/core2/data/stopgaps/gov.json

**Notes.** Found by the laws lead's helper on `claude/web-vehicle-miles-traveled-per-resident`, Oct 25.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given each place its own fuel tax for the mileage-fee refund; only a mileage-fee law reads it and the national average stays a labeled estimate.
