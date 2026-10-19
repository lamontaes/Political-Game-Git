---
id: world-local-sales-below-opening-forecast
title: "Local-serving businesses sell 35 to 65 percent below the demand their opening staff was sized for, so every played town shrinks about 10 to 15 percent in its first year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Local sales run below the opening forecast. The gap is already in the opening, before anyone shops: the planned buyers the opening can name cover only part of each business's book demand, so those firms open short of customers. The cause found on the branch is that retail has planned buyers for about 56 percent of its demand and several other kinds far less. Give each missing buyer class a researched, sourced customer, or size each book to the buyers the opening can name.

**Rules.** Research before building: every customer class added cites its source and spread, and real rates check totals and never pick one firm's outcome. One model, two tiers: counted buyers and full buyers are read with the same rule, times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, each business kind's planned buyers cover its book demand within the sourced spread, shown by business and purchase-flow record ids, and the stopgap row for the gap is resolved.

**Files.** src/core2/modules/business.ts, src/core2/residents-economy.ts, src/core2/data/stopgaps.json

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).

**Cause found (claude/local-sales-forecast, Oct 16).** The gap is already in the opening, before anyone shops: for Anon Raices, Puerto Rico (seed 1977d40995) I summed every planned inflow to each business at the opening (counted residents' purchase flows, the other resident flows and outside-market flows, and finance contracts) against its book `annualDemandMinor`. Retail has planned buyers for 56 percent of its demand, restaurants 76, professional services 52, construction 58, information 36, recreation 51, realty 75, private schools 15; manufacturing, building services, trucking, care homes, insurance, inns, quarry and farms are 91 to 99 percent, wholesale 106, personal care 101. Those are the realized-sales ratios of the played year (retail 61, professional 53, construction 58, information 36), so the shrinkage is the books' demand and the customers disagreeing, not a spending or payment fault. Where the customers are missing the data says why: `src/core2/data/opening-customers.json` (`remainingUnsupported`, `unsupportedExternalDemandByClassification`) refuses to invent a payer for construction, professional, information, realty, insurance, manufacturing and private-school demand, stopgap `SG-P8-outside-product-demand-crosswalk` (pool item core-stopgap-opening-customers-unresolved-external-product-buyer-demand-crosswalk). Retail's own gap is the household categories the counted flows cover (food, apparel and services) against a Census retail payroll that also sells everything else.
Two ways out, the first being the owner's call: size each book's demand and capacity to the buyers the opening can name (staff then exceed the sales, so those firms open at a loss until they shrink, as now), or give each missing buyer class a researched, sourced customer (households' other retail categories, firms buying legal, accounting, telecom and construction services, county construction awards). Closing this item needs the second; it belongs with the stopgap above.
