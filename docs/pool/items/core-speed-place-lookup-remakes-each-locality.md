---
id: core-speed-place-lookup-remakes-each-locality
title: "The place lookup builds a town's place record again on every look-up"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/speed-places
pr:
after: speed-leadership-organizing-rates-each-pair-once
blocked-on:
lead: speed
model: sonnet
effort: medium
root: rc5-full-detail-every-day
source: Speed, profiling a new game's build at Longwood, Florida (item 3 on #9747), Nov 17
---

**What.** When a new game draws a town, its people's past moves and its relatives' homes ask the place lookup for towns again and again. Each ask built the town's place record from scratch, so a large town's loading bar held for seconds. Seen: the bar holds on "Building the town" in a large town.

**Cause.** Measured: at Longwood, Florida (key 1241250, seed 5f1e2d3c4b5a6978), a CPU profile of the whole build on main a3c89ba5 put 5.9 s of 53 s under `townWithin` (src/core2/places-elsewhere.ts), 4.0 s of it in `synthesizeNationwidePlace` (src/core2/place-lookup.ts), which `corePlaceByKey` and `corePlaceByJurisdictionId` ran for every look-up of a locality, while counties and territories were already kept.

**Fix.** The lookup keeps each locality's place after making it once (`localityPlace`), as it does for counties and territories. The record is read-only, so the same town comes out. The player sees the loading bar move sooner in large towns.

**Time box.** 1 hour.

**Rules.** Speed: never rebuild a record that cannot change for each look-up. No dice: the records proof shows the same records before and after, by table digest.

**Done when.** At two drawn places (seeds 2c4e6a8b0d1f3957 and 9d8c7b6a5f4e3d21), `speed:year --proof-out` gives 0 differing tables between main and the branch, and the place-lookup test passes. A second session builds a new game in a large town on main and sees "Building the town" hold the bar for less time than before.

**Waits on.** Nothing.

**Files.** src/core2/place-lookup.ts

**Notes.** Filed by Speed, Nov 17. Profile: whole build 53.3 s before, 47.0 s after at Longwood; `townWithin` 5.9 s before, 1.5 s after.
