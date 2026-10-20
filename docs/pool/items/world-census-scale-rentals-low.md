---
id: world-census-scale-rentals-low
title: "A town opened at its Census size has too few rentals: Merrick, New York shows 3.6 percent of households renting"
area: world
kind: bug
priority: 3
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-cc
pr:
blocked-on: cto: premise wrong, Merrick's own ACS tenure is 3.4 percent renters, so 3.6 is right; drop it (PR 5685 now checks the ACS share)
source: added with npm run pool -- add
claimed-at: 2026-10-20T17:08:04.588Z
---

**What.** In the census-weight economy test (seed e0b6b155233c130bd7bdad92b2923cab26347ad3b132618f600f7a7fe85a7694, Merrick, New York, Census 21,744) the rental stock less vacancies is 3.6 percent of the counted households. A real town of that kind runs about 10 percent or more renting. Find whether the rental stock is scaled by the Census count the way owned homes are, and fix the share.

**Rules.** One model, two tiers: counted groups read with the full person rule times their count. No dice. One rule, all 56 places.

**Done when.** In a drawn place above 10,000 (named in the PR body), rental units less vacancies over counted households is within the place's ACS renter share spread, and src/core2/census-weight-economy.test.ts asserts the floor at 0.05 again.

**Files.** src/core2/modules/housing.ts, src/core2/census-weight-economy.test.ts

**Notes.** Found Oct 20 rebuilding PR 5454 on claude/political-game-pool-yucp92-bc; the test floor was loosened to 0.02 for it.
