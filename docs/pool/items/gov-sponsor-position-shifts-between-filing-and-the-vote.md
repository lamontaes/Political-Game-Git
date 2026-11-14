---
id: gov-sponsor-position-shifts-between-filing-and-the-vote
title: "A state senator's stand on their own bill flips between the day they file it and the evening before the vote"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) staging amount bills (#9310), Nov 14 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** In Iowa (1926400), seed cost1, a senator drafts a bill that sets the income tax at 4.95 percent (draftBill, then scheduleVote), and `memberPosition` is read for the sponsor on the day they file it and again on the evening before the vote, six days later. The parts move far with no change in the law (the income tax stays 3.8 percent in force the whole time): Eric Arnold's views go from -0.258 to 0.116 and his party part from -0.087 to 0.042. John Kemp, Elizabeth Espinoza and Larry Gomez all read the same constituents part, 0.049, at filing, though they hold different districts. At the evening before the vote each reads a different, much smaller one (0.015 to 0.031). Seen: which reason a sponsor gives when asking the player for a vote, and every member's vote on a bill filed and voted within a week.

**Cause.** Needs cause. Lead to check first: `positionOfMember` in src/core2/modules/legislature.ts takes the official's own parts only when `officialOf` finds an officials row, and otherwise weighs the member as a town member against the town's lean. The same constituents part for three senators at filing fits the town path, so a state senator may have no officials row yet on the day they file.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** One model, two tiers: a member weighs a bill by the same rule whether or not they have been filled in. Pinned tests: name the place and seed.

**Done when.** At the named place and seed a sponsor's position parts are the same on the day they file and on the evening before the vote when nothing in the law or the case made to them changed. A second session then reads a sponsor's reason for their own bill in a drawn place of its own choosing in the running game, and finds it matches their record on both days.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/officials.ts
