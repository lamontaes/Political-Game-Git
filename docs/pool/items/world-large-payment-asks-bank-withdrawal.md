---
id: world-large-payment-asks-bank-withdrawal
title: "A payment larger than the wallet asks the bank for a withdrawal"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-stopgap-credit-deposits-faked-mechanic
source: added with npm run pool -- add
---

**What.** SG-WORLD-deposit-wallet-buffer: savings are reviewed monthly with a three-month wallet reserve. A home purchase, a business founding and (after PR 5316) a dead person's estate already draw savings, but a large bill or settlement that the wallet cannot cover does not ask the bank for a withdrawal directly, so the household cannot pay while holding savings. Make any payment the wallet cannot cover ask the household's bank for a withdrawal that moves a real dollar, in one function every payer path calls.

**Rules.** Wire to the world: the withdrawal moves a real dollar and the books balance. Sliding scales and causes: the reserve follows the household's own spending, not a threshold. Replace, never layer: delete the monthly-only path's fake in the same change and resolve SG-WORLD-deposit-wallet-buffer.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed and place named in the PR body) a payment larger than the wallet triggers a withdrawal at the bank, shown by the deposit and withdrawal record ids with balanced books, in src/core2/bank-deposits.test.ts, and SG-WORLD-deposit-wallet-buffer is resolved in stopgaps.json.

**Files.** src/core2/credit-deposits.ts,src/core2/data/stopgaps.json,src/core2/bank-deposits.test.ts

**Notes.** TODO
