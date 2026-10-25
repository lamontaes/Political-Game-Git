---
id: core-speed-contact-offers-grow-with-ties
title: "Each day's choice scores one contact offer per person known, and group ties make that list grow every year (Bedford: 9.5 offers a choice in year one, 45 in year three)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), on #5994's head with people-drives-cause-acts-pull-less built (branch claude/drives-cause-acts-pull-less), the cause acts are back near real rates but the third year still runs about twice the first (34 to 42 s, then 71 to 81 s). A CPU profile of years one and three puts 30 s of the 40 s added under life.ts activate. Two things grow: the people chosen for each day (11,916 activations in year one, 25,782 in year three, as the focus set goes from 20 to 67 when the player joins cause groups and meets every member) and the offers each choice scores (12.0 a choice in year one, 58.1 in year three). Most of the growth is contact-known-person, one offer per person known (9.5, 28.3, then 45.3 a choice), each scoring the tie-fading reason (closeness.ts hoursLost). Joining a group ties the joiner to all its members (owner, Oct 10), so knownIds keep growing. Make scoring the contact offers cost no more as a person knows more people, with the same choices.

**Rules.** Speed: a town's year runs in under two minutes and year three within 1.2 times year one; never scan the whole world daily. No dice and sliding scales: who a person contacts stays their own scored choice; no cap or cutoff on whom they may contact. An exact cut keeps the deep fingerprint identical.

**Done when.** In the played world (buildBenchWorld), Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and a place drawn from all 56 (named with its seed), three years each: the deep fingerprint is identical before and after, a CPU profile of year three shows the contact offers' scoring time lower, and the third year's seconds over the first's are reported before and after on one process.

**Files.** src/core2/modules/life.ts, src/core2/modules/people.ts, src/core2/closeness.ts, src/core2/choice.ts

**Notes.** Filed Oct 25 by the speed lead. Scratch counts: activations and offers per act per year from duePeople and availableActs sampled twice a month; profiles in the speed lead's scratch (year-profiles.mts, incl-diff.py). Related: core-speed-opelika-year-memory-growth (the same focus growth from met-in-group ties).
