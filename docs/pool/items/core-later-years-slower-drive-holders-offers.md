---
id: core-later-years-slower-drive-holders-offers
title: "A town's second and third years run 1.5 and 2.3 times slower than its first because activists are offered more acts each year (Bedford, Wyoming)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5090
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A town's year takes longer each year it is played. Bedford, Wyoming (seed 9a4dd331ace7, place 5606045, run seed audit-oct17, one process, four-core container) ran 36.8, 54.5 and 81.9 seconds for years one to three; American Samoa 146, 220 and 342; the Northern Mariana Islands 180, 231 and 760. A profile of years one and three in Bedford puts the growth in people's daily choices: the daily choice code (`activate`) goes from 5.2 s to 58 s, with `availableActs` and `scoreOffers` the biggest parts. The count of people choosing is roughly flat, but the acts offered per choice grow: 11 offers a call in year one, 31 in year two and 66 in year three, with 1.36 million offers in year three against 117,000 in year one.

**Rules.** Speed: a town's game year runs in under two minutes, no change makes a year more than 20 percent slower than its base, and nothing scans the whole world each day: use indexes or act on the day something changed. No dice: who is offered what follows drives, groups and relationships. One model, two tiers.

**Done when.** On the same machine, one process, Bedford's third year runs within 20 percent of its first, with the offers per call and the profile lines for `activate`, `availableActs` and `scoreOffers` in the PR body; the activism acts people take stay the same in number for the same causes, shown by drive record ids.

**Files.** src/core2/modules/drives.ts, src/core2/life.ts, src/core2/choice.ts

**Notes.** Found running three years in six places (nothing crashed and every check passed). The growth tracks drive holders, not the whole town: 45 people hold 211 drives by year three (11 in year one), 30 cause groups (4 in year one) and 1,173 memberships (138). The providers in drives.ts offer, for each drive a person holds, an act per cause group, per known public figure and per volunteering place, so offers per person grow with drives times those lists; the logged acts of the player's circle (`person.acted`) also rise from 10,800 to 46,000 a year and the durable log from 12,000 to 79,000 records. Bedford's year-three profile has 28 s of garbage collection against 5.7 s in year one. One cheap cut is to stop offering an act a person's drive would only repeat the same day (one offer per kind of act and drive, not per target); a larger one is to rank targets once a week instead of scoring every one daily. Not built.

Offers admitted, by act, in Bedford (counted at `availableActs` after `admits`): year one 87,000 `contact-known-person`, 15,000 `care-for-relative`, 11,000 `rest`, 2,100 `volunteer-for-cause`, 490 `donate-to-cause`; year two 233,000 contact, 50,000 volunteer, 42,000 `join-cause-group`, 40,000 donate, 17,000 `share-cause`; year three 675,000 contact, 360,000 volunteer, 211,000 donate, 45,000 join, 23,000 share. So the offers to contact a known person triple a year (people with up to 69 known people are choosing often), and the volunteer and donate offers grow 170 and 430 times from year one. Choosing among the offers is the cost; cutting it without changing who does what means scoring the same offers fewer times (once a day per person, cached across the act kinds), or ranking the known people once a week.

Tried Oct 18 (claude, measured, not shipped): a repeat interval per drive and act, so a holder is not offered a donation again for 30 days or a volunteer session again for 7 (the drive's date of its latest act of each kind, filtered in `servingDrives`). Bedford, Wyoming years one to three fell from 37, 55 and 82 s to 29, 40 and 56 s (year three 32 percent faster), donations from 7,190 to 1,319 a year and volunteer sessions from 6,805 to 3,859, while `cause.shared` rose from 3,888 to 4,715 as the freed days went to other acts. Bethany Beach, Delaware shows the same pattern in its profile (daily choices 5.7 s in year one to 99.7 s in year three; years 39, 73 and 144 s). It is not enough alone: a bigger town's third year would still be several times the two-minute rule, and the gifts change the money the giving check reads. `scripts/core2-year/giving-proof.ts` (Trenton, North Carolina, seed bdbb4f011961, two years) gives 40 givers making 4,159 gifts and $15,157 now; with a 91-day interval 100 give 1,007 gifts and $2,825; raising `donationShareOfSpare` from 0.001 to 0.005 brings the full people to $12,475 but the counted raises, which read the same share, rise from $2,855 to $12,143. The note in the parameter says real donors give a few times a year where the model has them give about 80, so an interval is the faithful shape; doing it needs the share split between full givers and counted raises and the giving total re-checked against its Giving USA figure.
**What.** A town's second and third years run 1.5 and 2.3 times slower than its first because activists are offered more acts each year. The drives engine keeps growing the list of acts it offers and re-reads it for every holder every day. Make the daily cost depend on what changed that day, with the offer list kept bounded by what a holder can actually act on, so a later year costs about what the first did.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base; never scan a whole history every day. Sliding scales and causes: trimming offers must follow from the holder's drives and means, not a cutoff or a roll.

**Done when.** In a drawn place such as Bedford, Wyoming, `buildBenchWorld` with every module installed runs three played years on one process; the third year takes no more than 1.2 times the first, measured by the bench timing on the same machine, and the holders' chosen acts match the unbounded run by record id.

**Files.** src/core2/modules/drives.ts, src/core2/drives.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

**What.** A town's later game years run slower than its first, and the cause named when this was filed is that drive holders are offered more acts each year. A commit already stopped scoring a full choice daily for every holder, so the first two years now run level. The third year still runs about twice as long as the first two, so something else still grows with the years. Find what grows between year 2 and year 3 with a CPU profile of year 3, and fix it at the root by acting on the day something changes instead of scanning.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. No dice: the fix changes no outcome, only when the work is done. Wire to the world: measure in the played world with the bookkeeping off.

**Done when.** In the played world, `npm run speed:year -- --seed 7c1d --years 3 --exclusive` on Mongmong-Toto-Maite, Guam (key territory:GU:mongmong-toto-maite) shows year 3 within 20 percent of year 2, with the three year times and the profile's top function by name in the PR body; the guard in scripts/speed-years/compare.ts passes.

**Files.** src/core2/modules/drives.ts, src/core2/life.ts, scripts/speed-years/run.ts

**Notes.** Measured Oct 19 on a cloud machine (slow; compare ratios, not seconds): build 69.3 s, year 1 330.8 s, year 2 333.8 s, year 3 657.3 s, seed 7c1d. Commit a04e82f0f6 already limited the daily drive scoring to the player's circle, which is why years 1 and 2 match. Not yet profiled.

Profiled Oct 19 (same place and seed, first 90 days of year 3, CPU profile by self time): garbage collection 21.3 percent, the people module's daily handler 6.9, postCashJournal 3.2, availableActs 3.1, makeIsoDate 3.1, projectCashJournal 2.5, free-block candidates 2.3, parameter lookups 2.3. No single hot function: the profile is flat apart from garbage collection, so year 3 is slow because memory grows (more records kept each year), not because one loop is. This overlaps core-year-speed-activate-and-gc, claimed by another session; take the growth in kept records (journal and history rows per person) after that item lands, and re-measure year 3.
