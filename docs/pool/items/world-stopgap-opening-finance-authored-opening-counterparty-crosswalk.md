---
id: world-stopgap-opening-finance-authored-opening-counterparty-crosswalk
title: "Stopgaps in opening-finance (authored-opening-counterparty-crosswalk): 1 open"
area: world
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-finance.json, kind authored-opening-counterparty-crosswalk"
after: world-io-supplier-shares
claimed-at:
---

**What.** The opening binds each household's and firm's standing purchase budget to counterparties through broad category crosswalks and capacity-weighted ties, with positive-cost household members pooled in recorded order; no observed customer choice, product, delivery or supplier contract is established (src/core2/data/opening-finance.json, src/core2/opening-finance.ts). Replace the capacity-weighted ties with a choice that has actor knowledge: each household splits its category spending among the providers it knows in town by a sliding weight of the provider's capacity (staff), distance decay from the home (the decay scale an ESTIMATED parameter with spread), price level, the household's habit (last month's provider keeps a pull) and its thrift trait; a firm's supplier purchases are split by the supplier shares in world-io-supplier-shares between suppliers in town and the outside market. The Consumer Expenditure Survey category splits stay as the amounts. A counted household splits its category by the same weights times its count, and fill-in keeps the same providers. Unbound categories remain a gap only where no provider of that kind exists, and then the spending goes to the outside market account, not nowhere.

**Rules.** No dice: the split among providers is the same weights every month from distance, capacity, price, habit and the household's traits, never a draw. Sliding scales and causes: nothing flips at a threshold, and a price rise or a closed provider shifts shares gradually. One model, two tiers: a counted group chooses by the same weights times its count. An effect is a read, not a record: the finance engine must read the contract's payee to pay it, and a closing provider's customers must move their spending. One rule, all 56 places: distances come from the place's geography and kinds from the data, with no named place. Ask why: a household's provider split keeps the weights that produced it. Estimate, never UNKNOWN: the distance decay scale is ESTIMATED with source and spread.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), two households at different distances from the same two grocers split their grocery contract differently by finance contract record id, a provider that closes loses its customers' contracts to the next-best providers, a counted group and a filled-in member of it hold the same provider split, a firm's supplier contracts follow the supplier shares by supplier kind, the journal balances, and src/core2/opening-finance-choice.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/opening-finance.ts, src/core2/data/opening-finance.json, src/core2/opening-customers.ts, src/core2/io-supplier-shares.ts, src/core2/opening-finance-choice.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Opening household/firm standing purchase-budget counterparties from real existing organizations and broad source category/classification crosswalks, with projected payroll-capacity shares. Household positive-cost members

Oct 20 (pool feeder): spec written; research note in data/research/stopgaps-oct19/B-people-behavior-2.json: keep the CEX splits, weight suppliers by capacity times distance decay, tag the decay ESTIMATED. The ruling 'money is time, freedom and pressure' says household budgeting needs no great depth, so this stays a background split, never a player-facing budgeting screen.
