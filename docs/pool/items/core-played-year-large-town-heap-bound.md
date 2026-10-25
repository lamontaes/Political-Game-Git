---
id: core-played-year-large-town-heap-bound
title: "A large town's played year ends over the 2,000 MB bound, so the year check fails by draw (Sandy, Utah: 2,343 MB)"
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

**What.** The golden path's played-world year (tests/golden-path/played-world.node-test.ts, spec M0-13) fails its memory-at-the-end check when the draw lands on a large town. Sandy, Utah (place key 4967440, seed a230b4b0b65c783d3d44852feaf476f7001104f08c59fb42d8a5faa366af2f3f) holds 2,343 MB after one year against the 2,000 MB bound, identically on clean main 51e30128f4 and on a PR branch; its opening alone is 532.6 MiB. Every other check in that run passes, so any PR whose commit draws a town this size goes red on golden-path-year. Find what a large town holds at the end of a year and bring it under the bound, or set the bound by town size with the speed lead's agreement.

**Rules.** Speed: never keep a whole history or scan the whole world every day; what a year keeps must scale with what play reads, not with the town's size times days. One rule, all 56 places: the bound holds for any place drawn from all 56, large towns included, not just the three it was calibrated on.

**Done when.** tests/golden-path/played-world.node-test.ts passes its memory-at-the-end check in Sandy, Utah (place key 4967440, seed a230b4b0b65c783d3d44852feaf476f7001104f08c59fb42d8a5faa366af2f3f) and in two more drawn places of at least 50,000 people, in the played world (buildBenchWorld) the test builds, with the heap before and after named in the PR body and the tables that shrank listed by size.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/state.ts, src/core2/modules/residents.ts

**Notes.** Found by the Words session on Oct 24 when PR 5914's golden-path-year drew Sandy, Utah; reproduced locally on that branch and on clean main with the same seed, both 2,343 MB. Related: core-bench-world-large-town-heap (building a 30,000-person town on the default heap).
