---
name: money-economy
description: How to work on Our Civic Duty's national economy and dollars (macro-model.ts, modules/macro.ts, treasuries, outside money, household income) and prove it in a played world. Use for a cycle, rate, price, outside-money or household-income defect, and before saying the economy moves; not for jobs and layoffs (the Jobs session) or timing (speed-work).
---

# Money: the economy and the dollar

The design is `docs/design/country-tier.md` (owner, Nov 8: no hard-coded baseline; ranges are checks, not targets; Nov 10: the clock has two speeds, results first). Run scripts from the repository root and, in a cloud session, with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` set. A builder runs only the tests it wrote or changed; a checker runs the gate. No seeded roll or fixed percentage decides what a household, firm or treasury does (`no-dice`).

Method that worked on Nov 8:

1. **Find why before building.** The national month was once one damped linear formula (`stepMacroMonth`) with no source of motion, so every world went flat; it was deleted on Nov 10. The national row is now the sum of the states, each kept as counts and stepped by the month (`country-model.ts`), so motion comes from the states' households, employers and books, never a dated shock or a dice roll.
2. **Prototype on the pure model.** `src/core2/country-model.test.ts` builds the tier without a world. The cycle prototype script (`macro-cycle.ts`) was deleted with the formula it ran. Compare recession counts with real data using one definition (unemployment up 1.5 points inside 24 months: real UNRATE 1990-2026 gives 4 episodes, 20% of months, depth 2.1 to 5.3). FRED CSVs come from `curl https://fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES>`.
3. **Check the bands.** `scripts/money/band-exits.ts` runs the 12-month bands test on module worlds opened on published and drawn months; a swing that starts from one noisy month's change exits the band (smooth the opening momentum).
4. **Prove in a played world.** `scripts/money/outside.ts` (outside money by owner and treasury balance by year), `scripts/money/played.ts` (the national economy by year in a played world), `scripts/money/collected.ts` (receipts by government and year), `scripts/money/pay-paths.ts` (where pay flows); the old `scripts/money/income.ts` is gone, `npm run speed:year` (compare the same seed and place, main against your branch). Units: ledger amounts are minor units (cents); a billion dollars is 1e11.
5. **A flat number may be a reading artifact.** Compare the number a screen reads with the number the flows pay. Household income stayed flat because `unplacedPayPerWorker` ignored the pay level the paychecks used.
6. **Surplus piles come from the data.** A state budget row can have revenue far above spending (Census year); nothing spends it, so the treasury hoards and the outside account runs negative. Treasuries keep a reserve and invest the rest (`SG-GOV-reserve-sweep`).
7. **Tests red on main.** `budgets.test.ts` "every dollar lands" failed at the US treasury on clean main (Nov 8). Rerun it on clean `origin/main` with the same seed before blaming your branch; never loosen it. If it is still red there, say so on the pull request with the test, place and seed.
