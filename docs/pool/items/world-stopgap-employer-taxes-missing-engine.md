---
id: world-stopgap-employer-taxes-missing-engine
title: "Stopgaps in employer-taxes (missing-engine): 2 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/employer-taxes.ts, kind missing-engine"
after: world-business-premises-record
---

**What.** One of this item's two rows is already resolved: SG-WORLD-business-profit-pass-through closed (an owner-run business's profit is taxed as its owner's income in employer-taxes.ts, proved in src/core2/profit-pass-through.test.ts). The one that remains is SG-WORLD-business-premises-property-tax: businesses pay no property tax on their premises because the property-tax engine bills homes only and a business's books record no premises. Once world-business-premises-record gives each business a premises record with an assessed value and an owner, make the property-tax billing in src/core2/housing-property-tax.ts (`billPropertyTax`) read business premises as well as homes, at the commercial rate in force where the premises stand, billed to whoever owns the premises, and remove the premises marker and the `PREMISES_STOPGAP` constant in employer-taxes.ts.

**Rules.** Replace, never layer: the business bill uses the same billing function as homes, not a second tax path. An effect is a read, not a record: the tax engine reads the premises row and the rate in force, and the county treasury receives the payment. One rule, all 56 places: the commercial rate and due dates come from the place's data, with no state named. One model, two tiers: a counted-owner business is billed through its group as a full one is from its cash. Every dollar balances: the tax paid is a journal record between the business and the treasury, and it comes out of the business's occupancy cost share.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a business that owns its premises is billed the property tax by premises record id and assessment row, the county treasury's receipts rise by the same journal records, a raised property-tax rate in force raises the next bill, and src/core2/business-property-tax.test.ts proves it; the row SG-WORLD-business-premises-property-tax is resolved in stopgaps.json.

**Files.** src/core2/housing-property-tax.ts, src/core2/modules/employer-taxes.ts, src/core2/modules/business.ts, src/core2/business-property-tax.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: An owner-run business pays no tax on its profit: under the law its profit is its owner's income (a pass-through), and owners' draws and profit aren't taxed as income yet. Only businesses owned by another organization pay

Oct 20 (pool feeder): spec written; the profit pass-through row is already resolved (status resolved in stopgaps.json, no marker in code), so the title's '2 open' is stale: one open row remains, waiting on the new premises record.
