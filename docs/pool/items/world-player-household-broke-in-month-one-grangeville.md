---
id: world-player-household-broke-in-month-one-grangeville
title: "A played year in Grangeville, Idaho: the player's household is out of cash from month 1 and pays living costs through the counted residents account"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** GOLDEN_PATH_SEED=4dd8e78f80e4655594ad8dfe9f684320be1d6c47b100552fa8978a9512b3b07f GOLDEN_PATH_PLACE_KEY=1632950 npx vitest run src/core2/player-money-year.test.ts fails at the living-cost line (src/core2/player-money-year.test.ts line 107): the household's cash goes 52,068 to 0 in the first month and stays near 0 for the year (about $10,800 of pay, $2,450 of contracts settled, $8,100 moved to the counted residents account, no accounts.transfer living entry). Found Oct 20 while checking PR 5580. Find why the household runs dry so fast: its pay against its living cost, a living cost larger than its income, or members' cash left in the wrong account. The sibling pool item core-player-household-no-income may be the same cause; read it first.

**Rules.** Wire to the world: one dollar followed from the household to the payee by journal record id. No dice. One rule, all 56 places: no place named in the fix. Estimate, never UNKNOWN.

**Done when.** The command above passes, and the same test passes in three other random places with seeds named in the PR body.

**Files.** src/core2/player-money-year.test.ts, src/core2/opening-finance.ts, src/core2/starting-cash.ts

**Notes.** TODO
