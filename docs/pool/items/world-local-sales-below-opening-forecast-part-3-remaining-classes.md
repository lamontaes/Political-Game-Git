---
id: world-local-sales-below-opening-forecast-part-3-remaining-classes
title: "Realty, insurance, recreation and private schools get buyers or are sized, and the demand crosswalk stopgap closes"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-local-sales-below-opening-forecast-part-1-household-categories, world-local-sales-below-opening-forecast-part-2-firms-buy-services
blocked-on:
lead: money
model: opus
effort: medium
root: none
source: split from world-local-sales-below-opening-forecast in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** After retail and the firm-bought services have buyers, the rest of the gap is realty (75 percent of demand covered), recreation (51), private schools (15) and insurance. For each, give it a sourced customer or size its book to the buyers the opening can name, and say which in the data. Then SG-P8-outside-product-demand-crosswalk can close. This is the third of three parts of world-local-sales-below-opening-forecast.

**Cause.** Measured: Anon Raices, Puerto Rico (seed 1977d40995): planned buyers cover realty 75 percent of book demand, recreation 51 and private schools 15, and insurance is among the classes `unsupportedExternalDemandByClassification` in src/core2/data/opening-customers.json refuses to pay for. SG-P8-outside-product-demand-crosswalk (src/core2/data/stopgaps/p8.json) is open.

**Fix.** For each remaining class, add a sourced customer row (household CE categories for recreation and schools, tuition or fees, firm or household buyers for insurance and realty) or size the book to the buyers the opening can name, with the choice recorded in the data. Then resolve the stopgap row.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-local-sales-below-opening-forecast (the first-year shrink of a played town).

**Rules.** Research before building: every added customer cites its source and spread. One model, two tiers: counted and full buyers use the same rule, times their count. Replace, never layer: the class's old unsupported entry is removed in the same change.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose, plays a year in dev mode and reads every business kind's planned buyers beside its book demand by business and purchase-flow record id, with any remaining gap carrying a named reason. SG-P8-outside-product-demand-crosswalk is resolved in src/core2/data/stopgaps/p8.json, and a test in src/core2 names the place and seed.

**Waits on.** world-local-sales-below-opening-forecast-part-1-household-categories and world-local-sales-below-opening-forecast-part-2-firms-buy-services.

**Files.** src/core2/data/opening-customers.json, src/core2/opening-customers.ts, src/core2/data/stopgaps/p8.json
