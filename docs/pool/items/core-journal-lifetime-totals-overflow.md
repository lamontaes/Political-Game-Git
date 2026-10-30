---
id: core-journal-lifetime-totals-overflow
title: "A long save stops in year 7: the cash journal's lifetime totals pass the exact-integer limit (Ringgold, Louisiana, seed long-1)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: speed/journal-lifetime-totals
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T23:44:38.469Z
---

**What.** One save of the played world (npm run speed:year -- --seed long-1 --years 100, Ringgold, Louisiana, key 2264905, main 923bfbf3) stops in year 7 with 'Invalid nonnegative integer journal amount: journal debits' from plusTotals in src/core2/journal-state.ts, called from postCashJournal through the budgets treasury's payOut. The world-wide lifetime totals (runtime.totals) add every posting since the world opened; the federal treasury alone pays out about 573 billion dollars a month, so the sum passes 2^53 minor units (about 90 trillion dollars) in year 6 or 7. Only tests read the world total. The federal treasury's own lifetime totals (totalsByOwner, read by the books screen in src/bench/budget.ts and dev mode's ledger in src/bench/dev-why.ts) and the outside market's flow totals (externalFlowsByOwner) pass the same limit in about year 13. The owner, Oct 29: 'I want simulations to be able to go hundreds of years.'

**Rules.** Every dollar still balances exactly (the journal tests are the check). Speed: no change makes a year more than 20 percent slower. A long save runs as fast in year 100 as in year 1 (owner, Oct 29 22:45). Estimate, never UNKNOWN: a screen that shows a lifetime total keeps showing it.

**Done when.** npm run speed:year -- --seed long-1 --years 30 runs past year 13 without a journal error on main code; the lifetime totals (world, per owner, per account, outside flows) are exact past 2^53 minor units (a journal-state test posts past the limit and reads the exact sum); the books screen and dev mode's ledger show the same totals as before for a one-year world; src/core2/journal*.test.ts, accounts and finance tests pass, shown in the PR body.

**Files.** src/core2/journal-state.ts, src/bench/budget.ts, src/bench/dev-why.ts

**Notes.** TODO
