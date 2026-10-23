# PW-7: money reaches accounts: pay, loans, owner draws, home values, layoffs

Pay never reaches a spendable account: both players started with a few hundred dollars and sat at $0 for three years while employed relatives were paid. A $4.4 million loan went to a household with $8,000. Owner-run firms paid their owners $0 and skipped costs. Every dwelling is owner-occupied at $0 with no rents, sales or mortgages. Laid-off counted workers vanish from the counts instead of becoming unemployed counted workers.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`, then PW-1.
- **Builder:** one Opus session at **high**: money conservation is one of the three automatic gates, and every fix here moves dollars.
- **Branch:** `pw/money-paths`, from `main` after PW-1 lands. Pillar: OPUS-WORLD; it reviews the PR. Do not push to `opus-world`.
- **Owned paths:** `src/core2/modules/jobs.ts`, `src/core2/modules/credit.ts`, `src/core2/modules/business.ts`, `src/core2/modules/housing.ts`, their data under `src/core2/data/{jobs,credit,business,housing}/`, the opening builders `src/core2/opening-economy.ts` and `src/core2/opening-finance.ts` (with OPUS-CORE's review), their tests, `docs/archive/2026-10-23/roadmap/PROGRESS.md`, a release note. The cash journal itself (`src/core2/journal-state.ts`, `cash-host.ts`) is OPUS-CORE's; a change there is a request in the PR body.

## Build

Each step: find the cause in a played-world run on a fresh seed, write it in the commit, fix it, show the records.

1. **Pay lands.** Trace one payroll receipt from `onWorkPayroll` to the household's accounts. Find where it stops (an "unplaced pay" stand-in from the core, a receipt that posts to the employer's side only, an account id the household does not have). Fix it so every payroll receipt credits a spendable account of the paid person's household, through the cash journal, and the employer's cash falls by the same amount plus withholding. OPUS-CORE's audit item 3 says the core stand-ins (unplaced pay, outside rent, owner payouts) should switch off when the WORLD engines run. If the stand-in is what swallows the pay, switch it off on your branch behind the module's presence, register the stopgap, and tell OPUS-CORE in the PR body.
2. **Loans fit the borrower.** The credit module sizes a line from the bank's capital and the borrower's record. Find how $4.4 million reached a household with $8,000 (a unit mix of minor and major units, a missing income read for a counted borrower, a cap parameter never applied). Fix the cause and add the module's declared debt-to-income ceiling as a parameter (SOURCED from the lending rule you cite, with its spread), applied as a sliding scale of willingness, not a cliff. Record the decision's reasons.
3. **Owners draw and firms pay costs.** The business module says the owner draws from profit, never more than earned. Find why the draw is $0 (profit never computed because costs are skipped, a draw scheduled on a calendar date that never comes, the owner not linked to the firm). Fix so each owner-run firm records its monthly costs (rent, payroll, inputs from `business-books.json`), computes profit, and the owner's draw decision runs with its reasons; a firm that cannot afford a draw records why.
4. **Homes have values and rents.** `rentValueOf(county)` reads a county figure; the dwellings still show $0. Find the break (the opening builder sets ownership without a value, the county key does not match the place's record, the parameter is read but never written to the dwelling row). Seed each dwelling's value and, for renters, rent from the place's records (the Census median value and median gross rent for the county, SOURCED, with a per-world spread), and mortgages for owners who by the records would carry one. Housing payments then flow monthly through the cash journal.
5. **Laid-off counted workers stay counted.** A layoff of a counted worker moves them from the employer's counted jobs to the place's counted unemployed, with the date, and the counts (`countedJobsOf` and the residents counts) still sum to the same people. They look for work by the same rule counted workers already use for quitting (OPUS-WORLD audit item 1) and come back onto a payroll when hired.

## Acceptance checks (PW-1 letter L, and the money gate)

1. **L:** On two fresh seeds, four things hold. Every payroll receipt in the year credited a spendable household account; the test is that the sum of receipts to a person equals the rise in their household's accounts from pay, net of their own spending, to the cent. No open loan exceeds the credit module's declared ceiling against the borrower's recorded income. Every owner-run firm recorded at least one owner draw or a reason it could not. No occupied dwelling has a $0 value, and renters have a rent.
2. The counted population's workers plus counted unemployed at year end equals the start plus hires minus departures, by record.
3. The money-balancing check passes on both seeds.
4. The players' cash at the end of the year in both seeds, with the receipts that moved it, in the PR body.
5. Remove the `fails` marker for L and show the suite green.
6. Year time before and after, same seed, within 20%.

## How the owner checks it

In `/play`, after a skipped month with a job, his account went up by his pay stub's net. His parents' house has a value and, if they rent, a rent that leaves each month. The diner owner he talks to took a draw last month, or the record says the month lost money. The bank offers him a loan he could plausibly repay, and shows why that amount.

## Out of scope

The national economy and prices (the local price level rising 19% in three years is OPUS-WORLD's macro work). The cash journal's own API. The outside-buyer residual (OPUS-CORE audit item 1).
