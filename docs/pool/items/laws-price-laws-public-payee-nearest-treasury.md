---
id: laws-price-laws-public-payee-nearest-treasury
title: "price-laws.test.ts expects no public price rule where the governing place keeps no treasury, but place-prices pays the nearest government (Farson, Wyoming, red on main)"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: laws
source: review of speed/fold-cash-receipts, Nov 2 (fails the same way on main 15059c66cc)
---

**What.** src/core2/price-laws.test.ts ("reads price laws at settlement and removes their rules on repeal") fails on main 15059c66cc in Farson, Wyoming (5626055), seed 940b68b7e6950184a2b3e24dc1ab278af33b9d874b49a7937a24757cbe8fd2f7, with "us-policy-positions:environment-energy.price-carbon, governing place:5626055, treasury false: expected true to be false" at price-laws.test.ts:149-157. The test expects a law whose price is paid to the public to make no rule where the governing jurisdiction keeps no budget row. src/core2/modules/place-prices.ts:964-983 instead pays the town's nearest government that keeps one (its comment names a territory), so the carbon price rule exists. One of the two is wrong: decide what the law means where the governing place has no treasury, and make the other read the same rule.

**Rules.** One rule, all 56 places: the place and seed are named here, and the fix applies to every place without naming one in logic. An effect is a read, not a record: a public price is paid only to a treasury the budgets engine keeps, and the test reads the same rule the engine applies.

**Done when.** price-laws.test.ts passes with LAW_LINK_DRAW set to that draw ({"name":"Farson, Wyoming","key":"5626055","seed":"940b68b7e6950184a2b3e24dc1ab278af33b9d874b49a7937a24757cbe8fd2f7"}) and in three fresh drawn places, each run naming its place and seed, with the test's expectation and place-prices' treasury choice agreeing.

**Files.** src/core2/price-laws.test.ts, src/core2/modules/place-prices.ts

**Notes.** lead: laws. Reproduced by the speed lead's builder on main 15059c66cc and on speed/fold-cash-receipts with the same draw; unrelated to the cash journal fold.
