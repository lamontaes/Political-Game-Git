---
id: world-player-household-broke-in-month-one-grangeville
title: "A played year in Grangeville, Idaho: the player's household is out of cash from month 1 and pays living costs through the counted residents account"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: sonnet
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The command GOLDEN_PATH_SEED=4dd8e78f80e4655594ad8dfe9f684320be1d6c47b100552fa8978a9512b3b07f GOLDEN_PATH_PLACE_KEY=1632950 npx vitest run src/core2/player-money-year.test.ts failed at the living-cost line (src/core2/player-money-year.test.ts line 107) on Oct 20: the household's cash went 52,068 to 0 in the first month and stayed near 0 for the year (about $10,800 of pay, $2,450 of contracts settled, $8,100 moved to the counted residents account, no accounts.transfer living entry). The Oct 25 audit set the item open because the pull request that named it merged as other work, so the failure has not been reproduced on main. Find why the household runs dry so fast: its pay against its living cost, a living cost larger than its income, or members' cash left in the wrong account. The sibling core-player-household-no-income is done; read it first.

**Cause.** Needs cause. Looked at src/core2/player-money-year.test.ts (line 107 is the living-cost assertion) and the item: the failing command has not been rerun on main since the Oct 25 audit, and the sibling core-player-household-no-income is done, so it may be the same cause fixed.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the player's own household's cash, which runs to zero in the first month.

**Rules.** Wire to the world: one dollar followed from the household to the payee by journal record id. No dice. One rule, all 56 places: no place named in the fix. Estimate, never UNKNOWN.

**Done when.** A second session, on main in Grangeville, Idaho (place key 1632950, seed 4dd8e78f80e4655594ad8dfe9f684320be1d6c47b100552fa8978a9512b3b07f) and three other drawn places with seeds named, plays a year as the player and sees the household pay its living costs from its own money through a living transfer record, not run dry in month one with the cost moved to the counted residents account. The command above passes, and the cause found is written into this item.

**Waits on.** Nothing.

**Files.** src/core2/player-money-year.test.ts, src/core2/opening-finance.ts, src/core2/starting-cash.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): merging main still conflicts in scripts/health/mortality-band.ts and src/core2/player-money-year.test.ts; finish on that branch, merge main into it first.

Set open by the Oct 25 audit: PR #5080 merged as world-counted-reads-six-engines, not as this item; reproduce on main before building.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/grangeville-broke` (2026-10-20). Cleared from the front matter and kept here.
