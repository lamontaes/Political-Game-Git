# Session B — overnight October 15

Only Session B writes this file.

## What the owner can play now

On `world/session-b-layoffs`, firms read their paid sales and operating losses before hiring or laying off. Workers lose the actual job, can claim unemployment insurance, and the press can print the employer's announcement.

## Orders

- Layoffs: draft #4329. Implementation and focused checks pass; acceptance remains incomplete. The drawn year has hires 1.197%, quits 0.921%, layoffs including closures 1.105% per month, below the historical national bands. Never force those rates onto individual outcomes.
- Deposits: draft #4340, `world/session-b-deposits`, built fresh from main. Household and business savings move through the cash journal. The bank owes separate depositor claims and lending reads both liabilities and available cash. Full and counted households use the same cost buffer. All 33 focused tests pass. The played-world proof names deposits, withdrawals and a paid personal loan.
- New homes: draft #4347, `world/session-b-new-homes`, fresh main `90d287aa46`. Local full and counted tenants can take completed rentals when rent savings outweigh moving hassle. Both tiers now renew rent from the same vacancy calculation. Broader arrival, job-location and family-space coverage remains registered. Five ordinary years produced 30 counted-household moves into 25 completed units, including turnover. No full-household move occurred in that world.
- Core cleanup: not started.
- Pool: not claimed; the assigned orders are not complete.

## Deposits proof and limitations

The drawn place and seed below also apply to deposits. The year has zero cash or deposit-liability error at all twelve monthly observations. All thirteen bank balance sheets balance. Households and businesses both deposit and withdraw. The final observation took 24.698 seconds for the year, 28.176 including construction. It adds loan IDs omitted by the first proof script. Loan `loan:household_9fbf426814c0f317:2025-11-01` paid 276,700 minor units to `person_49361fbb9f62719d`. The year ends with 131,949,107 minor units in deposits across 54 holders. The six focused test files pass all 33 cases.

The monthly cash buffer is registered as `SG-WORLD-deposit-wallet-buffer`: extraordinary payments and estates do not yet all draw savings on demand. Unpaid claims persist. Opening mortgage funding remains an explicit anonymous liability offset, registered as `SG-WORLD-opening-mortgage-funding`; it is not fabricated customer cash.

## Layoffs proof and checks

Source `5d18f477b5`, base `1977d40995d7bf88a69f24d2e5a100210eafec54`. Seed `1977d40995`, place drawn by `drawPlace(seed, "world-business")`: Anon Raices, Puerto Rico (`7203174`). The ordinary bench world runs January 20, 2025 through January 20, 2026 with all its modules. Build 4.113 seconds, year 24.632 seconds; baseline build plus year rounded to 28 seconds. No claim of a median or precise percentage from rounded timing.

Full worker `person_f8ba73a7d4dea8d8` lost job `work-relationship_59bb1bb9c1069956` on October 1; its claim paid 336,000 minor units. Counted worker `person_41730db0ac21dae5` lost job `work-relationship_5b59c2ee50741ed3` on March 1; its claim paid 344,960 minor units to the residents account. Trading, change, claim and printed-story IDs are in #4329.

Focused tests: 33 passed across jobs, affordability, business and business-audit; after the final recovery correction, the 15 jobs and affordability tests passed again. Changed-file typecheck has zero diagnostics (five in unchanged dependencies excluded); eslint, prettier, zero-dice and release PR check pass. No full suite ran.

## Remaining failures and dependencies

The JOLTS check fails for all three series. The proof excludes government and other jobs outside the staffing engine's business books rather than counting those jobs only in its denominator. The six printed stories establish press consumption; the press's existing `SG-PEOPLE-press-bring-it-up-row` path does not pass the detailed operating-cost facts through to reader text. The Words session owns that path. No claim that a rendered news sentence explains the costs.

Runtime access needs `network.enabled` on remote commands. Dependencies are installed in the existing checkout. Storage state is `/workspace/.session-b-storage`; no second repository copy was made.

Builder: Codex; no helpers. Exact deployment effort, usage and total session cost are unavailable. No PR was merged.

## New homes observation

Base SHA seed `90d287aa46` draws Vaitogi, American Samoa, through the same all-56 place draw. Base construction plus first year rounded to 66 seconds. No completed apartment exists in the first year. An initial three-year observation found the first apartment project starts in January 2027 and completes in September 2028. The final observation follows ordinary production through January 2030; no projects or movers are injected. Cash balances at all five annual checkpoints. Build 31.516 seconds plus first year 41.761 equals 73.277 seconds, within 20% of the rounded 66-second base. The busiest observed year took 48.576 seconds. The focused housing tests pass six existing cases and three construction/occupancy cases. The occupancy fixture first used an invalid retirement award; it now uses recorded jobs and still tests the real lease writer. No test was skipped.

The old full-only rent-discount completion path and rent renewal loop were removed. The replacement records units and changes full leases or counted rent flows. A local move leaves an old rental vacant, so it has zero net effect on the town's vacant count. Incoming and homeless household assignment is still open; the vacancy stopgap remains registered.

Final housing proof source: `3c5db559ce`. Move `housing-move:household_a7eef7182a6db1c0:2028-09-06` assigns unit 0 of `project:jurisdiction_6e52239622b01e60:multi:2027-01-06:25`. Members `person_8c557145d673232f` and `person_8c557045d673217c` pay the counted rent flow. The move changes rent from 150,685 to 93,992 minor units, against monthly income 290,874.58. The flow later reads 93,074 after renewal, advances through January 2030, and has no arrears. The retained renewal records include 1,156 counted households and five full households. No claim that the first-year window contains this later move.
