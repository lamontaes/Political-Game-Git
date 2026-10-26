---
id: gov-press-conflict-stale-on-opening-day
title: "The press-conflict staff index is a day's and misses the press opened later that day"
area: gov
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/press-conflict-cache
pr: #4797
blocked-on:
source: "found while building gov-empty-seat-filled-by-press-staff"
claimed-at: 2026-10-16T18:53:41.158Z
---

**What.** `pressConflict` (`src/core2/press-conflict.ts`) indexes every outlet's staff once a day, keyed by the date. If anything calls it on the opening day before the press has opened its outlets, it caches an empty index, and the press people who appear later the same day are not seen until the next day. In the bench world, calling it right after `buildBenchWorld` returns null for every reporter, editor and owner (36 of them in Anniston, Alabama, seed 3098b616a772abe2), and two days later it names all of them. Key the cache on the press outlets table's contents or clear it when the press opens, so the answer never depends on when in the day it is asked.

**Rules.** An effect is a read: the answer reads the outlets table at the moment it is asked, without scanning the world each call. Speed: no daily scan added. No dice.

**Done when.** In a played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), `pressConflict` names the town's outlet staff on the opening day itself, with their outlet ids, and a test in src/core2/vacancy-press-staff.test.ts removes its two-day advance and still passes.

**Files.** src/core2/press-conflict.ts, src/core2/vacancy-press-staff.test.ts

**Notes.** The test for gov-empty-seat-filled-by-press-staff advances two days to avoid this.
