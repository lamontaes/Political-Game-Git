---
id: laws-price-laws-public-payee-nearest-treasury
title: "price-laws.test.ts expects no public price rule where the governing place keeps no treasury, but place-prices pays the nearest government (Farson, Wyoming, red on main)"
area: laws
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-laws-price-laws-public-payee-nearest-treasury
pr: #8454
blocked-on:
lead: laws
source: review of speed/fold-cash-receipts, Nov 2 (fails the same way on main 15059c66cc)
after:
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:55:59.343Z
merged-at: 2026-11-12T01:15:30.079Z
---

**What.** src/core2/price-laws.test.ts ("reads price laws at settlement and removes their rules on repeal") fails on main 15059c66cc in Farson, Wyoming (5626055), seed 940b68b7e6950184a2b3e24dc1ab278af33b9d874b49a7937a24757cbe8fd2f7, with "us-policy-positions:environment-energy.price-carbon, governing place:5626055, treasury false: expected true to be false" at price-laws.test.ts:149-157. The test expects a law whose price is paid to the public to make no rule where the governing jurisdiction keeps no budget row. src/core2/modules/place-prices.ts:964-983 instead pays the town's nearest government that keeps one (its comment names a territory), so the carbon price rule exists. One of the two is wrong: decide what the law means where the governing place has no treasury, and make the other read the same rule. Guards: a price law the player passes (carbon price) charges and pays the right treasury in any town, and main stays green.

**Cause.** Found in code: src/core2/modules/place-prices.ts (lines 964 to 985) pays the town's nearest government that keeps a budget, its comment naming a territory, so the carbon price rule exists; src/core2/price-laws.test.ts (lines 148 to 157, "reads price laws at settlement and removes their rules on repeal") expects no rule where the governing place keeps no treasury. Repro: Farson, Wyoming (5626055), seed 940b68b7e6950184a2b3e24dc1ab278af33b9d874b49a7937a24757cbe8fd2f7.

**Fix.** Keep the engine's nearest-treasury rule, which a territory needs, and make price-laws.test.ts expect a rule wherever any government at or above the governing level keeps a treasury.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the place and seed are named here, and the fix applies to every place without naming one in logic. An effect is a read, not a record: a public price is paid only to a treasury the budgets engine keeps, and the test reads the same rule the engine applies.

**Done when.** A second session, not the fixer, runs src/core2/price-laws.test.ts with LAW_LINK_DRAW set to {"name":"Farson, Wyoming","key":"5626055","seed":"940b68b7e6950184a2b3e24dc1ab278af33b9d874b49a7937a24757cbe8fd2f7"} and sees it pass, then sees it pass in three fresh drawn places, each run naming its place and seed, with the test's expectation and the treasury choice in place-prices agreeing.

**Waits on.** Nothing.

**Files.** src/core2/price-laws.test.ts, src/core2/modules/place-prices.ts

**Notes.** lead: laws. Reproduced by the speed lead's builder on main 15059c66cc and on speed/fold-cash-receipts with the same draw; unrelated to the cash journal fold.
