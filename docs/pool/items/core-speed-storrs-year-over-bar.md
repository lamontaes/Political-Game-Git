---
id: core-speed-storrs-year-over-bar
title: "Speed: Storrs, Connecticut's year runs about 190 seconds, over the 120-second bar"
area: core
lead: speed
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, found while checking #9252 (not caused by it)
claimed-at:
standard: 2
root: none
model: opus
effort: medium
---

**What.** A country's year has to run in under 120 seconds. In the played world at Storrs, Connecticut (key 0973980), year 1 takes about 190 seconds, with the group-quarters partner change and without it, so the town is over the bar on its own. A town that is mostly dorms and other rooms is the slowest place in the country. Seen: the wait when a player starts or advances a life at Storrs, and the speed:year line.

**Cause.** Measured: Storrs, Connecticut (0973980), `node --import tsx scripts/speed-years/profile-year.ts --seed gqa --place 0973980 --year 1` on the train at df168042e6, a CPU profile of year 1 (304 sampled seconds on this container). One chain is 41 percent of the year. Each month the work review (`loseAwayWorkByTurnover`, src/core2/modules/jobs.ts, 110.9 s) takes a share of out-of-town work off every counted household that has any, and each one is then regrouped (`regroupHousehold`, src/core2/modules/residents.ts, 124.7 s with the regional hires that call it too). Every regroup called `peopleInGroup` (src/core2/counted-money.ts, 88.5 s on its own), which walks every household of the household's group to count its people. That count is used only when the household moves to another group, and a lost share of work rarely moves it. Storrs is the worst place for it because its counted groups are very large: rooms of students in a few groups. The rest of the year, largest first: the press's day 21 s, regional hiring 20 s, the coverage day 17 s, the garbage collector 16 s, the counted news groups 15 s. Earlier measurements, from the item's first version: `npm run speed:year -- --place 0973980 --seed gqa --years 1 --exclusive` printed 192.2 s without #9252 and 185.0 s with it on another machine; Minto, North Dakota took 49.8 s and Conejo, New Mexico 53.2 s the same way.

**Fix.** Built in #9520: `regroupHousehold` reads the old group's people only when the household's new key is another group. Timed here in the order base, cut, cut, base, one process at a time: 301.5 s, 170.9 s, 174.9 s, 308.7 s, 43 percent off the year, with 561,975 records in all four and identical records proofs (digest 2265785febf30f2e, 611 tables). This container runs the base at 1.6 times the 190 s in What, so on that machine the cut year should read about 108 s; a second session times it there before this item is called done. If it is still over, the next parts are the ones listed in Cause.

**Time box.** 4 hours for one opus session.

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history for each person or step. A speed change never changes what the simulation decides.

**Done when.** In the played world (buildBenchWorld, drawn place Storrs, Connecticut), `npm run speed:year -- --place 0973980 --seed gqa --years 1 --exclusive` prints year 1 under 120 seconds, `--same-records` against the train before the change shows every table identical, and a second session sees the same number on the train, with the profile of the step that was cut and its before and after seconds written in the pull request.

**Waits on.** Nothing.

**Files.** scripts/speed-years/profile-year.ts, src/core2/modules/

**Notes.** Older Storrs speed items (core-speed-hiring-ranked-once, core-speed-prestart-history-insert, core-speed-rehouse-rent-per-review) are done; this is what remains.

Nov 14, voter registration record PR (#9323): speed:year seed spd1 also runs over the bar at Littleton Common, Massachusetts, 94.5 s in year 1 and 144 s in year 2 on the train head 5fe71dec7a; with the registration record it is 94.9 s and 143.5 s, so the record is not the cause.
