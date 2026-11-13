---
id: tests-press-money-dawson-springs-red
title: "press-money fails on main for seed 87f9d8a36f733083: Dawson Springs, Kentucky's paper never gains readers and revenue in the same month"
area: gov
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-press-money-dawson-springs-red
pr: #8430
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T01:04:45.903Z
after:
lead: laws-effects
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
branch: claude/pool-tests-press-money-dawson-springs-red
merged-at: 2026-11-12T02:11:54.417Z
---

**What.** src/core2/press-money.test.ts fails on main with GOLDEN_PATH_SEED=87f9d8a36f733083. Its first draw, Dawson Springs, Kentucky (2120224), place seed cb670b23a8bfc0787ac8adf6af104ac8b022be4acf201ee326c4c7118b509e66, never has a month when the paper's readers and its revenue both rise, so the check that revenue follows the audience fails over March 2025 to January 2026. The analysis in the Notes found the cause: the paper's readers sit within 1 percent of 700 all year, while its subscriptions moved by a fifth, because households short of cash pay in part and the rest in a later month. A threshold fix passed Dawson but failed Little America, Wyoming (5646935, seed pmf1:0). Guards: the paper a player reads keeps its readers and revenue moving together, so a small town's paper does not stall.

**Cause.** Found in code: src/core2/press-money.test.ts near line 112 (the first paper whose readers both rose and fell) compares monthly signs, while src/core2/modules/press.ts lets a household short of cash pay a subscription in part, so a month's revenue is cash-limited and not audience-limited. The per-reader-month ceiling already in the test holds in both places. Place seed cb670b23a8bfc0787ac8adf6af104ac8b022be4acf201ee326c4c7118b509e66, Dawson Springs, Kentucky.

**Fix.** Change the check's shape to the year's subscription cash against reader-months (the per-reader-month ceiling already holds), not a monthly sign or a threshold, and show it passes in Dawson Springs, Kentucky and Little America, Wyoming (seed pmf1:0).

**Time box.** 3 hours.

**Rules.** Ask why: the fix names, by record, why the readers and the revenue move as they do in Dawson Springs. One rule, all 56 places: no place-specific branch, and the test draws its place at random. Every number lives in a parameter table.

**Done when.** A second session runs src/core2/press-money.test.ts on seed 87f9d8a36f733083 in the drawn place Dawson Springs, Kentucky, in Little America, Wyoming (seed pmf1:0) and on three fresh seeds the builder did not choose, in the played world, and sees every run pass. The PR body names by record why the readers and the revenue move as they do in Dawson Springs.

**Waits on.** Nothing.

**Files.** src/core2/press-money.test.ts, src/core2/modules/press.ts

**Notes.** TODO

Analysis (Claude worker, Oct 27; released unbuilt). Dawson Springs, Kentucky (2120224), place seed cb670b23…509e66, base 87f9d8a36f733083:0: the paper's readers sit within 1 percent of 700 all year (728.7, 700.9, 702.8, 699.1, 699.3, 700.8, 699.6, 696.2, 703.2, 694.2, 696.9, 695.7 from February 2025 to January 2026), while its subscriptions moved by a fifth (counted-household subscriptions 429,059 to 380,991 and back to 394,673; full-household 38,577 to 60,996 and back to 37,164 minor units). The monthly sign check pairs a few readers' noise with households paying from their cash in part (the rest in a later month), so no month has both moving the same way; it passes in other places by chance of that cash cycle. A fix tried on the test and rejected: counting a reader move only at 2 percent or more of the audience skips Dawson but then fails Little America, Wyoming (5646935, seed pmf1:0), where readers fell 2 percent in October 2025 and subscriptions did not fall that month; revenue is cash-limited month to month, not audience-limited. The check needs a different shape (for example the year's cash paid against its reader-months), not a threshold; the per-reader-month ceiling already in the test holds in both places. Whoever takes it should decide that shape from the engine's rule that a household short of cash pays in part (src/core2/modules/press.ts, subscriber payments).

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:04 UTC) on branch claude/pool-tests-press-money-dawson-springs-red.
