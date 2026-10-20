---
id: core-opening-customer-public-owner-coverage-missing
title: "A generated opening throws 'Actual customer public owner coverage record is missing' in some places"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** GOLDEN_PATH_SEED=5e6f7a8b npx vitest run src/core2/player-money-year.test.ts throws Error: Actual customer public owner coverage record is missing while the world opens (the place is drawn from the seed). Found Oct 20 on main while checking world-town-public-works-staff-never-paid. A customer whose payee is a public owner has no coverage record in that place; find the producer that should write it and why this place skips it.

**Rules.** Estimate, never UNKNOWN: a place without a public owner record starts from the average, marked ESTIMATED. One rule, all 56 places: no place named in the fix. Wire to the world: the record is read by the finance check that throws.

**Done when.** GOLDEN_PATH_SEED=5e6f7a8b npx vitest run src/core2/player-money-year.test.ts no longer throws at opening, and three other random seeds open without the error.

**Files.** src/core2/opening-finance.ts, src/core2/opening-capital.ts

**Notes.** TODO
