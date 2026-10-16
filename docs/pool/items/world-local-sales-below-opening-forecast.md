---
id: world-local-sales-below-opening-forecast
title: "Local-serving businesses sell 35 to 65 percent below the demand their opening staff was sized for, so every played town shrinks about 10 to 15 percent in its first year"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/local-sales
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T10:44:28.617Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Cause found (claude/local-sales-forecast, Oct 16).** The gap is already in the opening, before anyone shops: for Anon Raices, Puerto Rico (seed 1977d40995) I summed every planned inflow to each business at the opening (counted residents' purchase flows, the other resident flows and outside-market flows, and finance contracts) against its book `annualDemandMinor`. Retail has planned buyers for 56 percent of its demand, restaurants 76, professional services 52, construction 58, information 36, recreation 51, realty 75, private schools 15; manufacturing, building services, trucking, care homes, insurance, inns, quarry and farms are 91 to 99 percent, wholesale 106, personal care 101. Those are the realized-sales ratios of the played year (retail 61, professional 53, construction 58, information 36), so the shrinkage is the books' demand and the customers disagreeing, not a spending or payment fault. Where the customers are missing the data says why: `src/core2/data/opening-customers.json` (`remainingUnsupported`, `unsupportedExternalDemandByClassification`) refuses to invent a payer for construction, professional, information, realty, insurance, manufacturing and private-school demand, stopgap `SG-P8-outside-product-demand-crosswalk` (pool item core-stopgap-opening-customers-unresolved-external-product-buyer-demand-crosswalk). Retail's own gap is the household categories the counted flows cover (food, apparel and services) against a Census retail payroll that also sells everything else.
Two ways out, the first being the owner's call: size each book's demand and capacity to the buyers the opening can name (staff then exceed the sales, so those firms open at a loss until they shrink, as now), or give each missing buyer class a researched, sourced customer (households' other retail categories, firms buying legal, accounting, telecom and construction services, county construction awards). Closing this item needs the second; it belongs with the stopgap above.
