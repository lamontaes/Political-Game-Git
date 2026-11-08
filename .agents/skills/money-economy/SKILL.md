---
name: money-economy
description: How to work on Our Civic Duty's national economy and dollars (macro-model.ts, modules/macro.ts, treasuries, outside money, household income) and prove it in a played world. Use for a cycle, rate, price, outside-money or household-income defect, and before saying the economy moves; not for jobs and layoffs (the Jobs session) or timing (speed-work).
---

# Money: the economy and the dollar

Method that worked on Nov 8:

1. **Find why before building.** The national month (`stepMacroMonth`) was a damped linear system with no source of motion, so every world went flat. Check for a source of motion before tuning anything. A cycle needs positive feedback bounded by a ceiling (an accelerator held by capacity), never a dated shock or a dice roll.
2. **Prototype on the pure model.** `scripts/money/macro-cycle.ts` runs many worlds for 37 years with a smoothed Taylor rule and prints recessions per 37 years, share of months in recession and depth. Compare with real data using the SAME definition (unemployment up 1.5 points inside 24 months: real UNRATE 1990-2026 gives 4 episodes, 20% of months, depth 2.1 to 5.3). FRED CSVs come from `curl https://fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES>`.
3. **Check the bands.** `scripts/money/band-exits.ts` runs the 12-month bands test on the openings; a swing that starts from one noisy month's change exits the band (smooth the opening momentum).
4. **Prove in a played world.** `scripts/money/outside.ts` (outside money by owner and treasury balance by year), `scripts/money/income.ts` (counted household income by year), `npm run speed:year` (compare the same seed and place, main against your branch). Units: ledger amounts are minor units (cents); a billion dollars is 1e11.
5. **A flat number may be a reading artifact.** Compare the number a screen reads with the number the flows pay. Household income stayed flat because `unplacedPayPerWorker` ignored the pay level the paychecks used.
6. **Surplus piles come from the data.** A state budget row can have revenue far above spending (Census year); nothing spends it, so the treasury hoards and the outside account runs negative. Treasuries keep a reserve and invest the rest (`SG-GOV-reserve-sweep`).
7. **Tests red on main.** `budgets.test.ts` "every dollar lands" fails at the US treasury on clean main (Nov 8). Confirm by stashing, never loosen it.
8. **A treasury test that is off by one big number: trace every transfer.** `scripts/money/us-treasury.ts` wraps `api.accounts().transfer` and sums what moved into and out of the U.S. main account by reason over a year. On Nov 8 it showed inflows 615.4T and outflows 702.6T, and the 87.2T gap was the seeded opening cash (`opening-treasury:*`) the budgets test never counted. Guessing first (daily federal borrowing) left the gap unchanged: compare the gap to the traced flows before editing a test. Also: `medianTransactionBalance(pay, seed)` takes the world's seed; a test that omits it matches no world.
