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

**Cause.** Needs cause. Measured: `npm run speed:year -- --place 0973980 --seed gqa --years 1 --exclusive` printed year 1: 192.2 s without #9252 and 185.0 s with it, 562,685 and 562,502 records kept, heap 1.2 GB, 4.1 GB process; Minto, North Dakota took 49.8 s and Conejo, New Mexico 53.2 s the same way. The step that takes the time at Storrs has not been profiled on the current train; `scripts/speed-years/profile-year.ts` is the tool.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one opus session.

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history for each person or step. A speed change never changes what the simulation decides.

**Done when.** In the played world (buildBenchWorld, drawn place Storrs, Connecticut), `npm run speed:year -- --place 0973980 --seed gqa --years 1 --exclusive` prints year 1 under 120 seconds, `--same-records` against the train before the change shows every table identical, and a second session sees the same number on the train, with the profile of the step that was cut and its before and after seconds written in the pull request.

**Waits on.** Nothing.

**Files.** scripts/speed-years/profile-year.ts, src/core2/modules/

**Notes.** Older Storrs speed items (core-speed-hiring-ranked-once, core-speed-prestart-history-insert, core-speed-rehouse-rent-per-review) are done; this is what remains.

Nov 14, voter registration record PR (#9323): speed:year seed spd1 also runs over the bar at Littleton Common, Massachusetts, 94.5 s in year 1 and 144 s in year 2 on the train head 5fe71dec7a; with the registration record it is 94.9 s and 143.5 s, so the record is not the cause.
