---
id: world-io-supplier-shares
title: "Input-output supplier shares: what each industry buys from which supplier industry, as sourced data with a reader"
area: world
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: Split from world-stopgap-finance-state-receipt-budget-proxy and world-stopgap-opening-finance-authored-opening-counterparty-crosswalk by pool feeder Oct 20; the stand-in research says BEA input-output tables can calibrate demand (SG-P8-outside-product-demand-crosswalk)
---

**What.** Firms' purchases from suppliers are currently cost-to-revenue ratios spread across whatever routes exist (SG-P8-finance-sales-receipt-budgets), and households' and firms' counterparties are capacity-weighted ties (SG-P8-opening-finance-bindings), with no source for which supplier industry a firm buys from. Add the Bureau of Economic Analysis input-output Use table (apps.bea.gov, reachable from cloud on Oct 20) as a sourced data file under src/core2/data/business/ with a reader: for each purchasing industry, the share of its intermediate purchases by supplier industry, mapped to the game's business kinds through NAICS, with the share bought from the place versus outside (an ESTIMATED regional purchase coefficient with its source and spread). Include the Census Monthly Trade inventory-to-sales ratios by industry as the days of supply a firm holds. Expose `supplierShares(kindId)` and `inventoryDays(kindId)` for the two engines that read them.

**Rules.** Research before building: the table checks and shapes the simulation and never decides one firm's purchase by itself. Estimate, never UNKNOWN: a kind with no mapped row takes the all-industry shares, marked ESTIMATED with its spread. One rule, all 56 places: the shares are national data, and the in-town share depends on what the place has, never on a named place. Numbers in the parameter table are SOURCED with publisher, year and URL, and never copy the publisher's table whole beyond the rows used. An effect is a read, not a record: the reader must be called by the counterparty and ordering items.

**Done when.** A test in src/core2/io-supplier-shares.test.ts reads the shares for each business kind in a drawn place's generated world (buildBenchWorld, place and seed named in the PR body, a seed the builder did not choose), shows every kind has shares that sum to one with a source and spread, and shows the opening-finance counterparty step and the ordering step read the reader by supplier kind id.

**Files.** src/core2/data/business/io-supplier-shares.json, src/core2/io-supplier-shares.ts, src/core2/data/parameters.json, src/core2/io-supplier-shares.test.ts

**Notes.** Split from world-stopgap-finance-state-receipt-budget-proxy and world-stopgap-opening-finance-authored-opening-counterparty-crosswalk by pool feeder Oct 20; the stand-in research says BEA input-output tables can calibrate demand (SG-P8-outside-product-demand-crosswalk).
