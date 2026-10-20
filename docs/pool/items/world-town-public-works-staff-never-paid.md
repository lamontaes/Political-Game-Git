---
id: world-town-public-works-staff-never-paid
title: "In Morrison, Oklahoma the town's Public Works Department holds no cash and pays its staff nothing for a whole year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In a played year at Morrison, Oklahoma (place 4049450, seed 35ae004f918cbf272f6432398117664222bc8643eab297e7225cefbd17b8d4a3) the only earner in the player's household is a maintenance worker at 'Morrison Public Works Department' (organization_f65162fe1649d10c, sector local-government-office). The department opens with liquidMinor 0 and has no business book, and after 40 days it still holds 0, so work-payroll posts no payment to the household in 12 months; the household's cash falls from $1,964 to 0 by month 2 and stays there. src/core2/player-money-year.test.ts fails there on the payroll line with 'expected 0 to be greater than 0'. Other places pay their town staff, so the funding link from the town's budget to the department is missing in this place, or the department is never given a budget line.

**Rules.** Wire to the world: a town job pays from the town's budget through the journal, one dollar followed from the budget line to the worker. One rule, all 56 places: no place named. No dice: the budget and the law in force decide whether the department is funded.

**Done when.** Running GOLDEN_PATH_SEED=35ae004f918cbf272f6432398117664222bc8643eab297e7225cefbd17b8d4a3 GOLDEN_PATH_PLACE_KEY=4049450 npx vitest run src/core2/player-money-year.test.ts passes: the department receives money from the town's budget, work-payroll posts to the maintenance worker's household by journal record id, and a one-year buildBenchWorld run in three other random places shows every town department with staff paid.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/official-pay.ts, src/core2/opening-economy.ts, src/core2/player-money-year.test.ts

**Notes.** Found Oct 20 on branch claude/player-living-cost-fraser (PR #5473) while rerunning player-money-year.test.ts in random places (run 2 of 3). Not caused by the player-home hold in that PR: the household has no one moving, the department simply has no cash. Check whether the pool items on public staffing (public-hire-staffing, official-pay-catchup) already fix this before building.

**What I found (Oct 20, claude/town-staff-paid).** The department's staff are paid in some runs of this seed and not in others, so the first thing to settle is why a seed does not reproduce. Runs of Morrison, Oklahoma (place 4049450, seed 35ae004f…) built with `buildBenchWorld` and advanced 45 days: some never paid (the worker's `totalsByJob` showed `paidMinor` 0, `requestedMinor` 479374, `workedDays` 33, and no `work-payroll` entry reached the worker's account); others posted `work-payroll:2025-02-13` and `2025-02-27` (130,738 and 145,265 minor) and showed `paidMinor` 276,003. The runs that paid were the ones whose script had first read account balances of the town, county, department, state office, post office and the U.S. treasury, or `accounts().main(worker)`. `accounts().main` only reads `cashJournal.residualAccountByOwner`, so the difference may be time or order (the public-pay link to the treasury `organization:treasury:place:4049450`), not that call. Next step: build the same world twice in one process and compare `publicPayTreasuries(core)` shortfalls and the department's cash at day 14. The player-home hold in PR #5473 is not the cause.
