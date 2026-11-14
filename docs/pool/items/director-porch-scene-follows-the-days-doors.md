---
id: director-porch-scene-follows-the-days-doors
title: 'A porch scene comes on a fixed every-third-outing rhythm, not from who answered the day''s doors'
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: play-petition-signatures-come-from-door-days
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead T47, Nov 14 (the lead's note on the measurement)
claimed-at:
---

**What.** After play-petition-signatures-come-from-door-days, a day of knocking on doors stages a porch scene (the `door-signature` or `door-ask` situation) on the first outing at least three days after the last one (`directorCircumstanceDoorEveryDays` 3), until six in a 91-day season. Measured at Otisville, New York (seed 580915c55b122496eedbb4aef26193e639a89d50e6df380c1a1073abc59559a5), daily doors from Feb 4, 2025: scenes shown on Feb 5, 8, 11, 14, 17 and 20, then none. The player will see the rhythm. The owner, Nov 14 00:50Z: "every now and then you might get 5 people or 20 people or no people, but there should be, you know, scenes every now and then, maybe sometimes no scenes."
Seen: the porch scene after Knock on doors.

**Cause.** Design: owner ruling, Nov 14, 2026, 00:50Z in chat ("scenes every now and then, maybe sometimes no scenes"). src/director/ledger.ts stages a circumstance moment when `spacingAllows` (a fixed number of days since the last) and the season cap allow it. src/director/doors.ts already names the day's door with the strongest stake (`stake`, the resident's agreement with the platform, for or against), but how strong that stake is plays no part in whether a scene comes.

**Fix.** Needs a design read by the Words lead: whether a porch scene comes from the day's doors (a resident who holds a strong stake, a full person met, someone the player knows) instead of a fixed spacing, keeping the season cap. No dice, no threshold flip.

**Time box.** 3 hours for one Opus session at medium effort, after the design read.

**Rules.** scene-standard, no-dice, sliding scales and causes.

**Done when.** A second session, on the train or main, sees in the running game that in three drawn places, daily doors for four weeks stage porch scenes on days the doors give cause, with no fixed spacing between them, and none on days whose doors give none. The dates and the stake behind each are in the PR body.

**Waits on.** The Words lead's design read.

**Files.** src/director/ledger.ts, src/director/doors.ts, src/director/data/director.json
