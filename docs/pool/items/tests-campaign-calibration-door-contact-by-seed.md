---
id: tests-campaign-calibration-door-contact-by-seed
title: "The campaign calibration test's door contact rate reads 0.494 in a West Virginia town, over its 0.45 ceiling, on clean main"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Nov 1 (seen by the traits test round's helper on clean main)
lead: governing
---

**What.** src/core2/campaign-calibration.test.ts fails on clean main with GOLDEN_PATH_SEED=1d1bfd25a7a60284200718c358723856d38a8a095fbcb9186f82fe2fd0360a0b in the West Virginia place 5431732: twelve hours of the player's doors (about 180 knocked) met 0.494 of the doors knocked, against the test's ceiling of 0.45 (`contact` < 0.45). Either that town answers its door more than the field rate allows for a real reason the records give (its households' hours at home, its age mix), and the band is too narrow for a sample of this size, or a door counts a meeting it should not (a household reached twice, or a filled-in person counted as met when no one answered). Find which by record before touching the band.

**Rules.** Never skip or widen the test to make it pass without a cause: ask why, by the door rows. No dice: whether someone answers is their own day and reasons. One rule, all 56 places: the place is drawn from all 56 and named with its seed.

**Done when.** The PR names, by door and household record ids in that town, why 0.494 of the doors were answered; the test passes on that seed and on three fresh seeds, each printing its place, seed and contact rate; and if the band changes, its new bounds cite the field rate and the sample's spread.

**Files.** src/core2/campaign-calibration.test.ts, src/core2/modules/campaigns.ts

**Notes.** Seen Nov 1 on clean main during the traits endorsement round (governing/traits-endorsements-heard); not caused by that branch, which changes only the traits test.
