---
id: laws-reach-b-price-proofs
title: "Transit fare, mileage fee, broadband bill and clean-energy price: replace their estimated use with records and prove the chain in a played year"
area: laws
kind: stopgap
priority: 3
size: M
status: claimed
claimed-by: claude/political-game-pool-7xkkii
pr: #5310
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:49:31.121Z
---

**What.** Four price laws (fare-free transit, the mileage fee in place of the fuel tax, public broadband and the clean-electricity standard's price) are enacted and paid by the price engine in a played year, and the test src/core2/price-laws.test.ts records their journal receipts. Its stopgap rows (SG-GOV-REACH-B-transit-fare-price, -mileage-fee-price, -broadband-bill, and the clean-energy price row) still stand because a household's fare, miles, fuel and broadband use are estimates, not records, and nothing yet follows one dollar to one named person. Replace each estimated use with a record the engine reads (a household's own trips, driving or bill) where the world holds one, and prove the chain for one named person per law: the journal payment, the notice they received, the stance they took because of it, and the director's line about it.

**Rules.** The chain is the acceptance: a law is finished only when one dollar is followed to a named person and back out, with record ids. Wire to the world: the price rule moves a payment on the journal, proven in a generated world. An effect is a read, not a record: another engine must read what the law wrote at the moment it decides or pays. Ask why: the person's stance cites the notice or news they received, and nobody is said to know of a law they never heard of. One rule, all 56 places: the place drawn is named in the PR body.

**Done when.** In a one-year played world (buildBenchWorld) in a drawn place from all 56, named with its seed, each of the four laws is enacted through the legislature's writers; for each, one named resident has a journal receipt of the price rule, a record of the notice they received, a stance that cites that notice, and a director scene or journal line naming the law, all by record id. A test beside src/core2/price-laws.test.ts states it, the stopgap rows are replaced or kept with a registered reason, and the owner plays it: pass fare-free transit and read why this neighbor's bill fell.

**Files.** src/core2/modules/place-prices.ts, src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps.json, src/core2/price-laws.test.ts, src/director/journal.ts

**Notes.** Written Oct 20 from reading price-laws.test.ts. That test builds a town, drafts one bill per law through the legislature, plays 365 days, collects the price receipts and checks the journal balances and the rules end on repeal; it asserts nothing about a person. The chain pieces exist separately (reachOf in src/core2/counted-reach.ts, the law-reached scenes in src/director/law-reached-scenes.test.ts, press-law-reach.test.ts), so the work is to join them for these four laws and to find or build the use records. If no record of a household's transit or driving use can be had without a new engine, file that as its own item and keep the estimate as a registered stopgap with its source.
