---
id: world-stopgap-finance-state-receipt-budget-proxy
title: "Stopgaps in finance-state (receipt-budget-proxy): 1 open"
area: world
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/finance-state.ts, kind receipt-budget-proxy"
after: world-io-supplier-shares, world-stopgap-opening-finance-authored-opening-counterparty-crosswalk, world-stopgap-finance-estimated-mechanism
claimed-at: 
---

**What.** In src/core2/finance-state.ts, a firm's supplier purchasing allowance is a cost-to-revenue ratio applied to each day's received sales, split across active routes by largest-remainder rounding and accumulated until due, which exhausted retailers in the completed finance year and left other firms without customers. Replace the allowance with ordering: at the business module's monthly review the owner orders inputs from the firm's suppliers in an amount set by expected sales (the recent trend), stock on hand against the days of supply for its kind (`inventoryDays` in world-io-supplier-shares), and cash the firm can spare after wages and bills; the order becomes a payable due on the supplier's terms (net 30 unless the supplier's contract says otherwise) and is paid from cash when due, or becomes arrears under world-stopgap-finance-estimated-mechanism. Suppliers are those the counterparty step chose. Delete the allowance, its accumulation, the routes' residue and the `SG-P8-finance-sales-receipt-budgets` marker and flag in finance.json.

**Rules.** No dice: an order follows expected sales, stock, cash and the owner's traits, never a roll. An effect is a read, not a record: the supplier's sales and cash must read the order's payment, and a shortage must reach the firm's own sales. Every dollar balances: an order is a payable and a payment, by journal record id. One model, two tiers: a counted-owner firm orders by the same rule. Replace, never layer: the allowance path is deleted when ordering replaces it. One rule, all 56 places: days of supply and shares are data by industry. Speed: ordering runs at the monthly review, not daily over all routes.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a retailer's monthly orders follow its sales trend and stock by order record id, the supplier receives the payment on the due date by journal record id, retailers are not exhausted nor other firms starved (every industry with customers keeps selling through the year), the town's year runs within 20 percent of its base time, the journal balances, and src/core2/finance-ordering.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/finance-state.ts, src/core2/data/finance.json, src/core2/modules/business.ts, src/core2/io-supplier-shares.ts, src/core2/finance-ordering.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Opening supplier reference budgets become cost-to-revenue ratios applied to novel actual received sales, allocated across all active routes with integer largest-remainder rounding per dated pool. A route accumulates its

Oct 20 (pool feeder): spec written; the replacement named in the row (firm-specific procurement terms or a validated procurement crosswalk) is the BEA input-output crosswalk plus the ordering decision; no source gives procurement timing, so net 30 is an ESTIMATED parameter.
