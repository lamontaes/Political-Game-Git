---
id: laws-property-tax-cap-statutes-rest
title: "Property-tax cap statutes for the states beyond the first eight, with levy limits, exemptions and CPI-lesser caps"
area: laws
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: laws-property-tax-cap-statutes
source: added with npm run pool -- add
claimed-at: 
---

**What.** laws-property-tax-cap-statutes reads the first eight states' property-tax cap statutes into the property-tax law rows: the size of the cap, what it covers, its exemptions and whether the assessment resets on sale. Do the same for the remaining states and territories that cap property tax growth or the levy, including levy limits, exemptions, and the CPI-lesser caps (a cap at the lesser of a fixed percent and inflation). Research each statute and add its terms to the cap terms of us-policy-positions:fiscal.cap-property-tax-growth in src/core2/data/laws/reach-group-b.json (the propertyTaxGrowthCapShare reach, read by src/core2/law-reach/group-b-money.ts) in the format the first part set, citing the statute and retrieval date, so the assessment in src/core2/housing-property-tax.ts and the bill read each place's own cap.

**Rules.** Research before building: every cap cites its statute and is SOURCED, or ESTIMATED with the spread where only a summary was found. One rule, all 56 places: the terms are law-row data with a row for every place that has a cap, and a place without one is recorded as having none. Estimate, never UNKNOWN: an unread state keeps the estimate with its source. An effect is a read, not a record: the cap changes the property tax a named homeowner is billed and what the treasury receives. Sliding scales and causes: a CPI-lesser cap moves with the price level, not a fixed number.

**Done when.** Every state and territory has a property-tax cap row (or a recorded none) with a statute citation; in a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a cap and a seed the builder did not choose, a home's bill grows no faster than the cap, shown by the bill record id and the law row id; src/core2/law-reach-group-b.test.ts covers it and SG-GOV-REACH-B-property-tax-bills is resolved for these states in src/core2/data/stopgaps.json.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-money.ts, src/core2/housing-property-tax.ts, src/core2/law-reach-group-b.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): spec written to follow laws-property-tax-cap-statutes (in a PR); the builder copies the term names that PR sets. If the first part reads the caps for all states, this item covers only the exemptions and CPI-lesser terms it left out and the lead can drop the rest.
