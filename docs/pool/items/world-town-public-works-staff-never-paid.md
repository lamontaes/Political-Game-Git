---
id: world-town-public-works-staff-never-paid
title: "In Morrison, Oklahoma the town's Public Works Department holds no cash and pays its staff nothing for a whole year"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr: #5554
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:21:27.295Z
---

**What.** In a played year at Morrison, Oklahoma (place 4049450, seed 35ae004f918cbf272f6432398117664222bc8643eab297e7225cefbd17b8d4a3) the only earner in the player's household is a maintenance worker at 'Morrison Public Works Department' (organization_f65162fe1649d10c, sector local-government-office). The department opens with liquidMinor 0 and has no business book, and after 40 days it still holds 0, so work-payroll posts no payment to the household in 12 months; the household's cash falls from $1,964 to 0 by month 2 and stays there. src/core2/player-money-year.test.ts fails there on the payroll line with 'expected 0 to be greater than 0'. Other places pay their town staff, so the funding link from the town's budget to the department is missing in this place, or the department is never given a budget line.

**Rules.** Wire to the world: a town job pays from the town's budget through the journal, one dollar followed from the budget line to the worker. One rule, all 56 places: no place named. No dice: the budget and the law in force decide whether the department is funded.

**Done when.** Running GOLDEN_PATH_SEED=35ae004f918cbf272f6432398117664222bc8643eab297e7225cefbd17b8d4a3 GOLDEN_PATH_PLACE_KEY=4049450 npx vitest run src/core2/player-money-year.test.ts passes: the department receives money from the town's budget, work-payroll posts to the maintenance worker's household by journal record id, and a one-year buildBenchWorld run in three other random places shows every town department with staff paid.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/official-pay.ts, src/core2/opening-economy.ts, src/core2/player-money-year.test.ts

**Notes.** Found Oct 20 on branch claude/player-living-cost-fraser (PR #5473) while rerunning player-money-year.test.ts in random places (run 2 of 3). Not caused by the player-home hold in that PR: the household has no one moving, the department simply has no cash. Check whether the pool items on public staffing (public-hire-staffing, official-pay-catchup) already fix this before building.

Oct 20 (claude/fixed-on-main-notes): not reproduced on current main. `GOLDEN_PATH_SEED=35ae004f918cbf272f6432398117664222bc8643eab297e7225cefbd17b8d4a3 GOLDEN_PATH_PLACE_KEY=4049450 npx vitest run src/core2/player-money-year.test.ts` passes (1 test), so the staffing and pay-catch-up work that landed since fixes it. The CTO can mark this done.

Sent back 2026-10-20 from PR #5554 (branch claude/political-game-pool-yucp92-xx): total gross credits do not prove public payroll and the alive filter can skip every assertion; require wage journal records tied to the paying department and a nonempty checked set; finish on that branch, merge main into it first.
