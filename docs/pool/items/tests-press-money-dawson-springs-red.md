---
id: tests-press-money-dawson-springs-red
title: "press-money fails on main for seed 87f9d8a36f733083: Dawson Springs, Kentucky's paper never gains readers and revenue in the same month"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/core2/press-money.test.ts fails on main with GOLDEN_PATH_SEED=87f9d8a36f733083. Its first draw, Dawson Springs, Kentucky (2120224), place seed cb670b23a8bfc0787ac8adf6af104ac8b022be4acf201ee326c4c7118b509e66, never has a month when the paper's readers and its revenue both rise, so the check that revenue follows the audience fails over March 2025 to January 2026. Either the outlet's revenue there truly does not follow its readers (a defect in the press money rule) or the town is too small for the check's shape and the test needs to say so from the record. The test draws its place at random, so CI turns red on any change whose run lands here.

**Rules.** Ask why: the fix names, by record, why the readers and the revenue move as they do in Dawson Springs before changing the rule or the check. One rule, all 56 places: no place-specific branch. Every number lives in a parameter table.

**Done when.** src/core2/press-money.test.ts passes on seed 87f9d8a36f733083 and on three fresh seeds the builder did not choose, in the played world, with the cause in Dawson Springs named by record in the PR body.

**Files.** src/core2/press-money.test.ts, src/core2/modules/press.ts

**Notes.** TODO

Analysis (Claude worker, Oct 27; released unbuilt). Dawson Springs, Kentucky (2120224), place seed cb670b23…509e66, base 87f9d8a36f733083:0: the paper's readers sit within 1 percent of 700 all year (728.7, 700.9, 702.8, 699.1, 699.3, 700.8, 699.6, 696.2, 703.2, 694.2, 696.9, 695.7 from February 2025 to January 2026), while its subscriptions moved by a fifth (counted-household subscriptions 429,059 to 380,991 and back to 394,673; full-household 38,577 to 60,996 and back to 37,164 minor units). The monthly sign check pairs a few readers' noise with households paying from their cash in part (the rest in a later month), so no month has both moving the same way; it passes in other places by chance of that cash cycle. A fix tried on the test and rejected: counting a reader move only at 2 percent or more of the audience skips Dawson but then fails Little America, Wyoming (5646935, seed pmf1:0), where readers fell 2 percent in October 2025 and subscriptions did not fall that month; revenue is cash-limited month to month, not audience-limited. The check needs a different shape (for example the year's cash paid against its reader-months), not a threshold; the per-reader-month ceiling already in the test holds in both places. Whoever takes it should decide that shape from the engine's rule that a household short of cash pays in part (src/core2/modules/press.ts, subscriber payments).
