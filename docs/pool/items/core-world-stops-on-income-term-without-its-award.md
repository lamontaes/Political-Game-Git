---
id: core-world-stops-on-income-term-without-its-award
title: "A played world stops on September 1 of year 1 when an income term cannot find its current award"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: core
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** Seen: the game stops. A world that throws cannot be played (CTO, Nov 12, #7365 comment 6822123666). In South Ogden, Utah (place 4970960), seed 7a605c17-6fe1-465b-b397-caf285473399, the played world reaches 2025-09-01 and throws "Actual income term does not resolve its current qualified award." from src/core2/finance-cash.ts line 313, reached through contractAuthority and settleDueFinance. Found by Merger codex-4629 while gating #8375 (#7365 comment 6822115296): src/core2/drives-filled-in-job-loss.test.ts, test line 138, fails the same way on clean main 3ed3915c59 with NODE_OPTIONS unset and GOLDEN_PATH_SEED=7a605c17-6fe1-465b-b397-caf285473399. The other failure in that file (Steamboat Springs, Colorado) is tests-drives-filled-in-job-loss-no-counted-loss, not this item. Seen: the world keeps playing past September 1 of the first year

**Cause.** Needs cause. Read in code, not yet traced in the world: the throw is the check in src/core2/finance-cash.ts that an income term in force resolves to a current qualified award. Not known: which income term it was (the person, the kind of income and the award's record id), and whether the award ended, was replaced or was never written on that date. September 1 suggests a term whose award turns over at the start of a month or a school or benefit year. The cause find replays the seed to 2025-09-01, catches the throw, and names the term, its person and the award it expected by record id, then the engine step that left the term without its award.

**Fix.** None until the cause is found.

**Time box.** 2 hours

**Rules.** One rule, all 56 places. No dice. One money system: the fix changes the function that already owns the award or the term, never a second payment path. Never catch and ignore the throw.

**Done when.** A second session runs GOLDEN_PATH_SEED=7a605c17-6fe1-465b-b397-caf285473399 npx vitest run src/core2/drives-filled-in-job-loss.test.ts and sees the South Ogden world play past 2025-09-01, and plays two more drawn places through September 1 of year 1 with no throw, with the Notes naming the term and the award by record id.

**Waits on.** Nothing

**Files.** src/core2/finance-cash.ts, src/core2/drives-filled-in-job-loss.test.ts
