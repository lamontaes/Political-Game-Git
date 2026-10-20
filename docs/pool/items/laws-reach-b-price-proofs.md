---
id: laws-reach-b-price-proofs
title: "Transit fare, mileage fee, broadband bill and clean-energy price: replace their estimated use with records and prove the chain in a played year"
area: laws
kind: stopgap
priority: 3
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-hh
pr: #5310
blocked-on: records that do not exist: households' miles driven, fuel bought, transit rides and broadband bills are consumption estimates because no engine records them; the item text is also an empty shell
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:51:27.412Z
---

**What.** Four price laws (fare-free transit, the mileage fee in place of the fuel tax, public broadband and the clean-electricity standard's price) are enacted and paid by the price engine in a played year, and the test src/core2/price-laws.test.ts records their journal receipts. Its stopgap rows (SG-GOV-REACH-B-transit-fare-price, -mileage-fee-price, -broadband-bill, and the clean-energy price row) still stand because a household's fare, miles, fuel and broadband use are estimates, not records, and nothing yet follows one dollar to one named person. Replace each estimated use with a record the engine reads (a household's own trips, driving or bill) where the world holds one, and prove the chain for one named person per law. Merged PR #5310 built the middle of that chain (a household whose payer heard a story about the law learns what it did to their bills, and holds a stance citing the story); what remains is the estimated use, the director's line about the notice, and the same proof for all four laws, not only fare-free transit.

**Rules.** The chain is the acceptance: a law is finished only when one dollar is followed to a named person and back out, with record ids. Wire to the world: the price rule moves a payment on the journal, proven in a generated world. An effect is a read, not a record: another engine must read what the law wrote at the moment it decides or pays. Ask why: the person's stance cites the notice or news they received, and nobody is said to know of a law they never heard of. One rule, all 56 places: the place drawn is named in the PR body.

**Done when.** In a one-year played world (buildBenchWorld) in a drawn place from all 56, named with its seed, each of the four laws is enacted through the legislature's writers; for each, one named resident has a journal receipt of the price rule, a record of the notice they received, a stance that cites that notice, and a director scene or journal line naming the law, all by record id. A test beside src/core2/price-laws.test.ts states it, the stopgap rows are replaced or kept with a registered reason, and the owner plays it: pass fare-free transit and read why this neighbor's bill fell.

**Files.** src/core2/modules/place-prices.ts, src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps.json, src/core2/price-laws.test.ts, src/director/journal.ts

**Notes.** Written Oct 20 from reading price-laws.test.ts and PR #5310. price-laws.test.ts builds a town, drafts one bill per law through the legislature, plays 365 days, collects the price receipts and checks the journal balances and the rules end on repeal; it asserts nothing about a person. PR #5310 (merged) added the learned-effect event in src/core2/modules/place-prices.ts, proven for fare-free transit by src/core2/place-prices-learned.test.ts, and left the four price stopgap rows open, the estimates in place and no director scene. The other chain pieces exist separately (reachOf in src/core2/counted-reach.ts, the law-reached scenes in src/director/law-reached-scenes.test.ts). If no record of a household's transit or driving use can be had without a new engine, file that as its own item and keep the estimate as a registered stopgap with its source.
