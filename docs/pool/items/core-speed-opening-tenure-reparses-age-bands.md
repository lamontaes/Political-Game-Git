---
id: core-speed-opening-tenure-reparses-age-bands
title: "Giving households their years in place re-reads its age-band tables for every household and year"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/speed-tenure-bands
pr:
after: speed-leadership-organizing-rates-each-pair-once
blocked-on:
lead: speed
model: sonnet
effort: medium
root: rc5-full-detail-every-day
source: Speed, profiling Blockers' slow loading-bar steps at Longwood, Florida (item 3 on #9747), Nov 17
---

**What.** When a new game draws a town, each household is given how many years it has lived in place. The age-band table that rate comes from was parsed again, with a pattern match, for every household and every year. In a large town this held the loading bar on the economy step for about a second. Seen: the bar pauses on "Building the town" in a large town.

**Cause.** Measured: at Longwood, Florida (key 1241250, seed 5f1e2d3c4b5a6978), a CPU profile of the economy stage found `rateAt` in `src/core2/opening-tenure.ts` re-parsing the band labels on each call, about 0.9 s of the 6.8 s stage.

**Fix.** `rateAt` parses each table once and keeps the parsed bands in a `WeakMap` keyed by the table. The old and new functions agree on 37,962 cases. The player sees the loading bar move sooner in large towns.

**Time box.** 1 hour.

**Rules.** Speed: never repeat the same parse for every row. No dice: the records proof shows the same records before and after, by table digest.

**Done when.** At two drawn places, Longwood, Florida (seed 6d4e1b7a2c9f0385) and New London, New Hampshire (seed 1f7b3e9d5a2c8064), `speed:year --proof-out` gives 0 differing tables between main and the branch, and the opening-county-sample test passes. A second session builds a new game in a large town on main and sees the bar move through the economy step.

**Waits on.** Nothing.

**Files.** src/core2/opening-tenure.ts

**Notes.** Filed by Speed, Nov 17. Records proofs: 0 differing tables at Longwood (614 tables, digest e1f887cdf1d94915) and New London (613 tables, digest 23a529c8dff4194d).
