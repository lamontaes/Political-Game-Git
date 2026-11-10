---
id: tests-campaign-calibration-door-contact-by-seed
title: "The campaign calibration test's door contact rate reads 0.494 in a West Virginia town, over its 0.45 ceiling, on clean main"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: governing lead, Nov 1 (seen by the traits test round's helper on clean main)
lead: governing
after:
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** src/core2/campaign-calibration.test.ts fails on clean main with GOLDEN_PATH_SEED=1d1bfd25a7a60284200718c358723856d38a8a095fbcb9186f82fe2fd0360a0b in the West Virginia place 5431732: twelve hours of the player's doors (about 180 knocked) met 0.494 of the doors knocked, against the test's ceiling of 0.45. Either that town answers its door more than the field rate allows for a real reason the records give (its households' hours at home, its age mix), or a door counts a meeting it should not (a household reached twice, or a filled-in person counted as met when no one answered). Find which by record before touching the band. Guards: the doors-met count on the Campaigns screen is not inflated by a household counted twice (0.494 in West Virginia 5431732).

**Cause.** Needs cause. Looked at src/core2/campaign-calibration.test.ts and the door code in src/core2/modules/campaigns.ts: the item offers two hypotheses and neither is shown by the door rows. Measured: GOLDEN_PATH_SEED=1d1bfd25a7a60284200718c358723856d38a8a095fbcb9186f82fe2fd0360a0b, West Virginia place 5431732. The Nov 8 ruling that no check fails a run for leaving a real band may turn the ceiling into a report with the sample's spread.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Ask why: never skip or widen the test to make it pass without a cause, shown by the door rows. No dice: whether someone answers is their own day and reasons. One rule, all 56 places: the place is drawn from all 56 and named with its seed. Ranges are not targets (owner, Nov 8): a real field rate is reported, not a pass or fail line.

**Done when.** A second session runs src/core2/campaign-calibration.test.ts on the named seed and on three fresh drawn seeds, each printing its place, seed and contact rate, and sees every run pass. The PR names, by door and household record ids in that town, why 0.494 of the doors were answered, and a changed ceiling cites the field rate and the sample's spread.

**Waits on.** Nothing.

**Files.** src/core2/campaign-calibration.test.ts, src/core2/modules/campaigns.ts

**Notes.** Seen Nov 1 on clean main during the traits endorsement round (governing/traits-endorsements-heard); not caused by that branch, which changes only the traits test.
