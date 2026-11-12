---
id: world-io-supplier-shares
title: "Input-output supplier shares: what each industry buys from which supplier industry, as sourced data with a reader"
area: world
kind: research
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: none
milestone:
source: Split from world-stopgap-finance-state-receipt-budget-proxy and world-stopgap-opening-finance-authored-opening-counterparty-crosswalk by pool feeder Oct 20; the stand-in research says BEA input-output tables can calibrate demand (SG-P8-outside-product-demand-crosswalk)
checked: fable 2026-11-10
---

**What.** Firms' purchases from suppliers are cost-to-revenue ratios spread across whatever routes exist, and households' and firms' counterparties are capacity-weighted ties, with no source for which supplier industry a firm buys from. Add the Bureau of Economic Analysis input-output Use table (apps.bea.gov, reachable from cloud on Oct 20) as a sourced data file under src/core2/data/business/ with a reader: for each purchasing industry, the share of its intermediate purchases by supplier industry, mapped to the game's business kinds through NAICS, with the share bought from the place versus outside (an ESTIMATED regional purchase coefficient with its source and spread). Include the Census Monthly Trade inventory-to-sales ratios by industry as the days of supply a firm holds. Expose `supplierShares(kindId)` and `inventoryDays(kindId)` for the two engines that read them.

**Cause.** Found in code: `prepareFinanceProcurement` in src/core2/finance-state.ts (line 615) spreads firms' purchases as cost ratios over the routes that exist and marks SG-P8-finance-sales-receipt-budgets; SG-P8-opening-finance-bindings marks the capacity-weighted counterparty ties (both open in src/core2/data/stopgaps/p8.json). data/research/core/bea-2023-use-summary-buyer-shares.json already holds a BEA Use summary on the buyer side; read it first and build on it.

**Fix.** Add the BEA Use-table supplier shares by industry and the Census inventory-to-sales ratios as a sourced file with `supplierShares(kindId)` and `inventoryDays(kindId)`, and have the opening counterparty step and the ordering step call them by supplier kind id.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: the table checks and shapes the simulation and never decides one firm's purchase by itself. Estimate, never UNKNOWN: a kind with no mapped row takes the all-industry shares, marked ESTIMATED with its spread. One rule, all 56 places: the shares are national data, and the in-town share depends on what the place has, never on a named place. An effect is a read, not a record: the reader must be called by the counterparty and ordering steps. Every number is SOURCED with publisher, year and URL, and the file never copies the publisher's table whole beyond the rows used.

**Done when.** A second session, on main in a drawn place from all 56 and a seed it chooses, runs a year in dev mode and follows one firm's purchases: the supplier kinds it buys from come from `supplierShares`, each kind's shares sum to one with a source and spread, and the purchase records name the supplier kind id the reader returned. A test in src/core2/io-supplier-shares.test.ts reads the shares for each business kind in that place's generated world (buildBenchWorld, place and seed named in the PR body) and shows the opening counterparty step and the ordering step call the reader.

**Waits on.** Nothing.

**Files.** src/core2/data/business/io-supplier-shares.json (new), src/core2/io-supplier-shares.ts (new), src/core2/io-supplier-shares.test.ts (new), src/core2/data/parameters.json, src/core2/finance-state.ts, data/research/core/bea-2023-use-summary-buyer-shares.json

**Notes.** Split from world-stopgap-finance-state-receipt-budget-proxy and world-stopgap-opening-finance-authored-opening-counterparty-crosswalk by pool feeder Oct 20; the stand-in research says BEA input-output tables can calibrate demand (SG-P8-outside-product-demand-crosswalk).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sourced which industry buys from which; no player sees a supplier share.
