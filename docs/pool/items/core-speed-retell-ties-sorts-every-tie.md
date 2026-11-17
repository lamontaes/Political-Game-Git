---
id: core-speed-retell-ties-sorts-every-tie
title: "A listener choosing whom to retell a speech to sorts every tie they hold to take the closest three"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/speed-retell-ties
pr: 9867
after: speed-leadership-organizing-rates-each-pair-once
blocked-on:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
source: Speed, profiling the long-save slowdown at Inarajan, Guam (item 4 on #9747), Nov 17
---

**What.** After a speech, each listener heard as a person may retell it to the few people they are closest to outside their household. To find those few, the game sorted every tie the listener holds and then took the first three. As the save goes on, people hold more ties and more people hear speeches, so this step grows every election year. Seen: a long save's election years slow down year after year.

**Cause.** Measured: at Inarajan, Guam (place territory:GU:inarajan, world seed 426e846c0d8d670dcf6b366852affad6b4f5d0a40f84c3d639a165315194a834), by `years-profile` (a CPU profile of year 6 on main 74e6551b plus #9824 and #9836), `tiesBeyondHome` (src/core2/modules/speech.ts) took 28.1 s of a 478 s year, 22.9 s of it its own sorting, over 79,768 calls; in year 2 it took 0.6 s. Found in code: `tiesBeyondHome` pushes every tie into a list, sorts the whole list by closeness and id, and slices the first `speechRetellTies` (3).

**Fix.** `tiesBeyondHome` keeps only the closest `speechRetellTies` while it reads the ties, in order, with the same comparison (closeness, then id), so the same people come out in the same order. The player sees long saves' election years run faster.

**Time box.** 2 hours.

**Rules.** Speed: never sort a whole list to take its first few. No dice: the records proof shows the same records before and after, by table digest.

**Done when.** At Inarajan, Guam and at a drawn place, `speed:year --proof-out` gives 0 differing tables between main and the branch, and a year-6 profile at Inarajan shows `tiesBeyondHome`'s time before and after. A second session plays a long save at a drawn place on main and sees election years run faster than before.

**Waits on.** Nothing.

**Files.** src/core2/modules/speech.ts

**Notes.** Filed by Speed, Nov 17. This is the exact part of option (b) in Speed's 04:07Z post on #9747; the growth itself (event audiences reached through every voter who ever heard of a candidate) waits on the CTO's ruling.
