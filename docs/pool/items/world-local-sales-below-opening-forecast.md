---
id: world-local-sales-below-opening-forecast
title: "Local-serving businesses sell 35 to 65 percent below the demand their opening staff was sized for, so every played town shrinks about 10 to 15 percent in its first year"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: world-local-sales-below-opening-forecast-part-1-household-categories, world-local-sales-below-opening-forecast-part-2-firms-buy-services, world-local-sales-below-opening-forecast-part-3-remaining-classes
lead: money
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** Local sales run below the opening forecast. The gap is already in the opening, before anyone shops: the planned buyers the opening can name cover only part of each business's book demand, so those firms open short of customers and the town shrinks about 10 to 15 percent in its first year. Retail has planned buyers for about 56 percent of its demand and several other kinds far less. Give each missing buyer class a researched, sourced customer, or size each book to the buyers the opening can name. The work is split into three parts.

**Cause.** Measured: Anon Raices, Puerto Rico (seed 1977d40995): summing every planned inflow to each business at the opening against its book `annualDemandMinor`, planned buyers cover retail 56 percent, restaurants 76, professional services 52, construction 58, information 36, recreation 51, realty 75 and private schools 15; the realized sales of the played year match (retail 61, professional 53, construction 58, information 36). src/core2/data/opening-customers.json (`remainingUnsupported`) and SG-P8-outside-product-demand-crosswalk (src/core2/data/stopgaps/p8.json) say why: the data refuses to invent a payer for those classes.

**Fix.** Give each missing buyer class a sourced customer (household Consumer Expenditure categories for retail, firms buying legal, accounting, telecom and construction services, county construction awards), or size each book to the buyers the opening can name. Built in three parts: household categories for retail, firms as buyers of services, and the remaining classes with the stopgap closed.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop. Seen: a played town's population and jobs on the Metrics tab, which shrink 10 to 15 percent in the first year.

**Rules.** Research before building: every customer class added cites its source and spread, and real rates check totals and never pick one firm's outcome. One model, two tiers: counted buyers and full buyers are read with the same rule, times their count. Wire to the world: each added buyer is a purchase flow another engine reads, by record id.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose (and in Anon Raices, Puerto Rico, seed 1977d40995), plays a year in dev mode and finds that each business kind's planned buyers are listed beside its book demand by business and purchase-flow record ids, with every remaining gap carrying a named reason. SG-P8-outside-product-demand-crosswalk is resolved. The three parts are all merged.

**Waits on.** The three parts: world-local-sales-below-opening-forecast-part-1-household-categories, world-local-sales-below-opening-forecast-part-2-firms-buy-services, world-local-sales-below-opening-forecast-part-3-remaining-classes.

**Files.** src/core2/modules/business.ts, src/core2/residents-economy.ts, src/core2/data/opening-customers.json, src/core2/opening-customers.ts, src/core2/data/stopgaps/p8.json

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16). Claim released Oct 23: branch idle since Oct 20.

**Cause found (claude/local-sales-forecast, Oct 16).** The gap is already in the opening, before anyone shops: for Anon Raices, Puerto Rico (seed 1977d40995) I summed every planned inflow to each business at the opening (counted residents' purchase flows, the other resident flows and outside-market flows, and finance contracts) against its book `annualDemandMinor`. Retail has planned buyers for 56 percent of its demand, restaurants 76, professional services 52, construction 58, information 36, recreation 51, realty 75, private schools 15; manufacturing, building services, trucking, care homes, insurance, inns, quarry and farms are 91 to 99 percent, wholesale 106, personal care 101. Those are the realized-sales ratios of the played year (retail 61, professional 53, construction 58, information 36), so the shrinkage is the books' demand and the customers disagreeing, not a spending or payment fault. Where the customers are missing the data says why: `src/core2/data/opening-customers.json` (`remainingUnsupported`, `unsupportedExternalDemandByClassification`) refuses to invent a payer for construction, professional, information, realty, insurance, manufacturing and private-school demand, stopgap `SG-P8-outside-product-demand-crosswalk` (pool item core-stopgap-opening-customers-unresolved-external-product-buyer-demand-crosswalk). Retail's own gap is the household categories the counted flows cover (food, apparel and services) against a Census retail payroll that also sells everything else.
Two ways out, the first being the owner's call: size each book's demand and capacity to the buyers the opening can name (staff then exceed the sales, so those firms open at a loss until they shrink, as now), or give each missing buyer class a researched, sourced customer (households' other retail categories, firms buying legal, accounting, telecom and construction services, county construction awards). Closing this item needs the second; it belongs with the stopgap above.

**Blocked on data access (Oct 19, claude/local-sales-note).** Tried to build the retail half and stopped: retail's missing buyers are the household categories the counted flows do not cover (apparel, furniture, electronics, household supplies, and the rest of the CE table). `data/research/prices/household-prices-2026.json` holds only utilities, fuel, telephone, internet, vehicle and beverage rows from BLS Table 2500, and `https://www.bls.gov/cex/tables/calendar-year/mean/cu-all-detail-2024.xlsx` returns 403 from the cloud container, so the category means and their regional and size splits cannot be sourced there. Inventing them would break "research before building". A builder who can load that table (or another session whose network allows bls.gov) adds one `householdServices` row per category in `src/core2/data/opening-customers.json`, each with its national, four regional and five size parameters and the CE cell citation, as the existing rows do; the owner's call on the other missing classes (construction, professional, information, realty, schools) stays with `SG-P8-outside-product-demand-crosswalk`. Then `world-unemployment-opening-jump` closes by the same measurement.

**Notes (Fable's check, Nov 10).** Read core-country-tier-town-joins-its-state and its parts first: they change who buys from the town's businesses from outside (the state's sectors) and read the same opening customer data (src/core2/data/opening-customers.json). Build on that code where it has merged, and say in the pull request which parts were on main.
