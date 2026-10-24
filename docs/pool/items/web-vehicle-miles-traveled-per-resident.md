---
id: web-vehicle-miles-traveled-per-resident
title: "Keep vehicle miles traveled per resident as an outcome-web measure so the mileage fee has an outcome to move"
area: laws
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The mileage fee that replaces the fuel tax has no outcome-web link because the web keeps no measure of vehicle miles traveled or fuel use; it is the one law in the prices family whose web link is only a stopgap row in src/core2/data/laws/outcome-research-gaps.json under SG-LAW-outcome-link-unresearched. Searches found no source that sizes a revenue-neutral per-mile fee on fuel use or emissions (CBO 2011 and the Oregon and Washington pilot reports cover funding and design, not driving), so the link cannot be attached to env.emissions. Add the place outcome traffic.vehicle-miles (vehicle miles traveled per resident a year) to data/research/outcome-web/place-outcome-bases-2024.json for all 56 places, from FHWA Highway Statistics Table VM-2 over the Census population estimate, with the five territories at the median of the sourced places tagged ESTIMATED. Then add the researched link from the mileage-fee law to it, sized by a fuel-price elasticity of vehicle miles applied to the change in the average vehicle's cost per mile, with its spread, and read the web's factor in the place-prices engine where the vehicle-miles rule charges the fee.

**Rules.** No dice: research calibrates the link's size, lag and spread and decides nobody's trip. One rule, all 56 places: a per-place table, no state named in logic. Estimate, never UNKNOWN: territories get the labeled median. An effect is a read: the place-prices engine reads the factor when it settles the fee.

**Done when.** The mileage-fee row leaves outcome-research-gaps.json; links.json holds the sized link (status built) with source, anchor quote and range; coverage.json is regenerated; src/core2/outcome-web.test.ts and src/core2/law-wiring-prices.test.ts pass; and scripts/law-wiring/check.ts with matrix.ts grade its web link wired in the two audit towns of a played world (buildBenchWorld, seeds a91c03e7d2b84f10 and 5e27b0c4196fd3a8), with the month-row record id as evidence.

**Files.** data/research/outcome-web/place-outcome-bases-2024.json, data/research/outcome-web/links.json, src/core2/data/laws/outcome-research-gaps.json, src/core2/data/outcome-web/coverage.json, src/core2/modules/place-prices.ts

**Notes.** Found by the prices family helper (branch claude/laws-nine-links-prices), filed by the laws lead.
