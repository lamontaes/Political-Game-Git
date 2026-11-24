---
id: core-speed-opening-kin-finds-homes-by-search
title: "Drawing a town's relatives finds each one's home by searching every relatives' household made so far"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/speed-opening-kin
pr:
after: speed-leadership-organizing-rates-each-pair-once
blocked-on:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
source: Speed, profiling Blockers' slow loading-bar steps at Longwood, Florida (item 3 on #9747), Nov 17
---

**What.** When a new game draws a town, it also draws each household's relatives who live elsewhere. To find a relative's home, it searched every relatives' household made so far, so the search grew with the square of the town's size. In a large town the loading bar stood still for seconds while it ran. Seen: the bar holds on "Building the town" for several seconds in a large town.

**Cause.** Measured: at Longwood, Florida (key 1241250, seed 5f1e2d3c4b5a6978), by a CPU profile of the bench build's people stage on `train/nov17` 06499c66, `buildOpeningKin` (src/core2/opening-kin.ts) took 6.3 s of a 12.6 s stage, 3.3 s of it in one inner function. Found in code: `homeOf` in `buildOpeningKin` runs `out.households.find` over every kin household made so far, once for each relative it places.

**Fix.** `buildOpeningKin` keeps each kin household in a map by id as it makes it (`homesById`), and `homeOf` reads the map. It is the same row object, so the same town comes out. The player sees the loading bar move sooner through "Building the town" in large towns.

**Time box.** 2 hours.

**Rules.** Speed: never search a growing list for each item added to it. No dice: the records proof shows the same records before and after, by table digest.

**Done when.** At Longwood, Florida and at a drawn place, `speed:year --proof-out` gives 0 differing tables between main and the branch, and the people stage at Longwood is timed before and after, alternating. A second session builds a new game in a drawn large town on main and sees "Building the town" hold the bar for less time than before.

**Waits on.** Nothing.

**Files.** src/core2/opening-kin.ts

**Notes.** Filed by Speed, Nov 17. Blockers reported the household draw at Longwood holding the bar 5.3 s (03:27Z on #9747).
