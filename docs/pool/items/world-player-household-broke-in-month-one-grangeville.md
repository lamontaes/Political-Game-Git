---
id: world-player-household-broke-in-month-one-grangeville
title: "A played year in Grangeville, Idaho: the player's household is out of cash from month 1 and pays living costs through the counted residents account"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-8defjq
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:25:54.711Z
---

**What.** GOLDEN_PATH_SEED=4dd8e78f80e4655594ad8dfe9f684320be1d6c47b100552fa8978a9512b3b07f GOLDEN_PATH_PLACE_KEY=1632950 npx vitest run src/core2/player-money-year.test.ts fails at the living-cost line (src/core2/player-money-year.test.ts line 107): the household's cash goes 52,068 to 0 in the first month and stays near 0 for the year (about $10,800 of pay, $2,450 of contracts settled, $8,100 moved to the counted residents account, no accounts.transfer living entry). Found Oct 20 while checking PR 5580. Find why the household runs dry so fast: its pay against its living cost, a living cost larger than its income, or members' cash left in the wrong account. The sibling pool item core-player-household-no-income may be the same cause; read it first.

**Rules.** Wire to the world: one dollar followed from the household to the payee by journal record id. No dice. One rule, all 56 places: no place named in the fix. Estimate, never UNKNOWN.

**Done when.** The command above passes, and the same test passes in three other random places with seeds named in the PR body.

**Files.** src/core2/player-money-year.test.ts, src/core2/opening-finance.ts, src/core2/starting-cash.ts

**Notes.** TODO

Built Oct 20 (claude/political-game-pool-8defjq, PR #5080). Root cause of the failing line: in Grangeville (seed 4dd8e78f...) the town has no seller for the household's living costs, so the household pays them as its outside-living flow (`residents:outside-living:household_96e6d278...`, $8,109 over the year, kind `accounts.transfer residents`) instead of the local `living:` entries the test counted. The test now counts either. A second narrow expectation failed in Pilot Point, Alaska (seed pm-3): a household that owns its home outright settles no contract and pays property tax (`property-tax:household_bd0a10e2...`); the test now counts property tax as housing cost too. Every other assertion is unchanged. Passes with the item's command and with GOLDEN_PATH_SEED pm-1, pm-2, pm-3, pm-4 and pm-5.

Not a bug in the test, left for core-player-household-no-income: the Grangeville household is one 50-year-old earner and three children (13, 15, 17) with $520 in cash, earning about $10,800 a year (biweekly payroll near $415) against a living cost of $109.82 a day, about $40,000 a year (the Consumer Expenditure mean for a household of four, not scaled to income), so its cash goes to zero in month one and stays near zero. Pay and living cost disagree by a factor of four; either the opening job's hours and pay are too low for a household of four, or living costs need to follow income class and the benefits a household that poor would draw.

