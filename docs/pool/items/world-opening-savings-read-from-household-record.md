---
id: world-opening-savings-read-from-household-record
title: "A household's opening savings come from what its record says it earned and spent, not a savings draw per household"
area: world
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "Account lead, Nov 16 06:53Z, for the renters thread: 1,598 new draws at open are what the owner asked to see tracked and then removed (owner, Nov 16 02:37Z: 'track everything at open so that way you can ... finally eliminate all of these random draws or fixed things')"
---

**What.** Every household opens with its survey median balance times its own savings draw, exp(σz), where z is a standard normal drawn from the world's seed and the household's id. Dev mode's "How this world opened" lists the draw as generation on the world's seeded unit. At Ridgeville, Alabama (0164656), world seed 3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178, a New Game opening takes 1,598 of these draws. Two families alike in income and age then differ in savings only because of the draw, and nothing on their record says why. Seen: dev mode's person card shows the cash row as generation with no record behind the spread.

**Cause.** Measured: `npx vitest run src/bench/dev-opening-draws.test.ts` at Ridgeville, Alabama (0164656), seed 3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178, counts 1,598 seeded-unit draws at `balanceDrawZ` (src/core2/household-balance-draw.ts), called from `householdBalanceDraw` in src/core2/population.ts (about lines 1429 and 2013) and src/core2/opening-county-sample.ts (about line 291). The median is read from pay and the head's age (`medianTransactionBalance`, src/core2/starting-cash.ts); the spread around it is the draw alone.

**Fix.** Read the spread from what the household's record already holds at open, by the same rule for full and counted households: its adults' years in work since 18 and their pay, its size and children, whether it owns or rents and its housing cost, and its recorded health costs, each moving the balance by a row in src/core2/data/counted/parameters.json sourced to the Survey of Consumer Finances 2022 (balances by those traits within an income group). Delete `balanceDrawZ` and `householdBalanceDraw` once nothing calls them, and delete the site row `src/core2/household-balance-draw.ts#balanceDrawZ` from src/bench/dev-views/opening-sources.json in the same change. The survey's spread within an income group is the check on the totals, never a draw.

**Time box.** 4 hours, Opus, medium. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a balance follows from the household's own record. Sliding scales: each trait moves the balance continuously. One model, two tiers: a counted household reads the same rows, times its count. One rule, all 56 places.

**Done when.** At Ridgeville AL with the seed above, dev-opening-draws.test.ts shows no `balanceDrawZ` site and the test passes. At three named places with seeds, the mean opening balance over the mean median stays within the survey's range (about 2.63) and the spread within an income group is no narrower than half the survey's. A second session sees in dev mode, at a drawn place it names with its seed, the cash row of a household naming the record values its balance came from.

**Waits on.** Nothing.

**Files.** src/core2/household-balance-draw.ts, src/core2/population.ts, src/core2/opening-county-sample.ts, src/core2/counted-money.ts, src/core2/starting-cash.ts, src/core2/data/counted/parameters.json, src/bench/dev-views/opening-sources.json.
