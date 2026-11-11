---
id: world-local-sales-below-opening-forecast-part-2-firms-buy-services
title: "Professional services, information and construction books have named firm buyers"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: medium
root: none
source: split from world-local-sales-below-opening-forecast in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Professional services, information and construction books open with planned buyers for only about 52, 36 and 58 percent of their demand, because the opening data refuses to invent a payer for demand that firms and governments, not households, create. Give those classes sourced firm buyers: the industries that buy legal, accounting, telecom and construction services (from the BEA Use table) and county construction awards. The buyers become purchase flows the opening binds. This is the second of three parts of world-local-sales-below-opening-forecast.

**Cause.** Measured: Anon Raices, Puerto Rico (seed 1977d40995): planned buyers cover professional services 52 percent, information 36 and construction 58 of book demand. `unsupportedExternalDemandByClassification` in src/core2/data/opening-customers.json lists enterprise:construction, professional and information as classes with no payer, and SG-P8-outside-product-demand-crosswalk (src/core2/data/stopgaps/p8.json) is open.

**Fix.** For each of the three classes add a firm-buyer set (which industries buy it, by share, from the BEA Use table in data/research/core/bea-2023-use-summary-buyer-shares.json, and county construction awards from Census), each with source and spread, and have the opening bind them as purchase flows. If world-io-supplier-shares has landed, read its `supplierShares` instead of a second table.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-local-sales-below-opening-forecast (the first-year shrink of a played town).

**Rules.** Research before building: every buyer share cites its source and spread, and the table never decides one firm's purchase. One model, two tiers: a counted firm buys by the same rule as a full one, times its count. Wire to the world: each added flow is paid from a buyer's books and read by the seller.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose, plays a year in dev mode and reads a professional services, an information and a construction business: each lists named firm buyers by purchase-flow record id with a source, and the share of its book demand with planned buyers is printed beside the 52, 36 and 58 percent measured in Anon Raices, Puerto Rico (seed 1977d40995) as a report. A test in src/core2 names the place and seed.

**Waits on.** Nothing to start. Read core-country-tier-town-joins-its-state and its parts first: they change who buys from the town's businesses from outside (the state's sectors) and read the same opening customer data (src/core2/data/opening-customers.json). Build on that code where it has merged, and say in the pull request which parts were on main.

**Files.** src/core2/data/opening-customers.json, src/core2/opening-customers.ts, src/core2/data/stopgaps/p8.json, data/research/core/bea-2023-use-summary-buyer-shares.json
