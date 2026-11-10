---
id: core-played-year-large-town-heap-bound
title: "A large town's played year ends over the 2,000 MB bound, so the year check fails by draw (Sandy, Utah: 2,343 MB)"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: high
root: rc5-full-detail-every-day
lead: speed
source: added with npm run pool -- add
---

**What.** The golden path's played-world year (tests/golden-path/played-world.node-test.ts, spec M0-13) fails its memory-at-the-end check when the draw lands on a large town. Sandy, Utah (place key 4967440, seed a230b4b0b65c783d3d44852feaf476f7001104f08c59fb42d8a5faa366af2f3f) holds 2,343 MB after one year against the 2,000 MB bound, identically on clean main and on a PR branch; its opening alone is 532.6 MiB. Every other check in that run passes, so any PR whose commit draws a town this size goes red on golden-path-year. Brookside, Delaware (replay 4d50e1f88df997f9) also ran out of an 8 GB heap in src/bench/path-check.ts after 74 minutes (Nov 4). Find what a large town holds at the end of a year and bring it under the bound, or set the bound by town size with the speed lead's agreement.

**Cause.** Measured: Sandy, Utah (place key 4967440, seed a230b4b0b65c783d3d44852feaf476f7001104f08c59fb42d8a5faa366af2f3f), tests/golden-path/played-world.node-test.ts holds 2,343 MB after one year against the 2,000 MB bound, same on clean main and on a PR; opening alone is 532.6 MiB. Brookside, Delaware (replay 4d50e1f88df997f9) ran out of an 8 GB heap in `node --import tsx src/bench/path-check.ts` after 74 minutes (Nov 4).

**Fix.** Take a heap snapshot of Sandy at the end of the year, name the largest tables, and fold or stop writing what play does not read; if the bound genuinely scales with town size, set it by size with the speed lead's agreement (the Speed rule).

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: never keep a whole history or scan the whole world every day; what a year keeps must scale with what play reads, not with the town's size times days. One rule, all 56 places: the bound holds for any place drawn from all 56, large towns included, not just the three it was calibrated on. An effect is a read, not a record: a table nothing reads is folded or not written.

**Done when.** A second session, not the builder, runs tests/golden-path/played-world.node-test.ts in Sandy, Utah (place key 4967440, seed a230b4b0b65c783d3d44852feaf476f7001104f08c59fb42d8a5faa366af2f3f) and in two more drawn places of at least 50,000 people, in the played world the test builds, and its memory-at-the-end check passes in all three. The PR body names the heap before and after and lists the tables that shrank by size.

**Waits on.** Nothing.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/state.ts, src/core2/modules/residents.ts, src/bench/path-check.ts

**Notes.** Found by the Words session on Oct 24 when PR 5914's golden-path-year drew Sandy, Utah; reproduced locally on that branch and on clean main with the same seed, both 2,343 MB. Related: core-bench-world-large-town-heap (building a 30,000-person town on the default heap).

Nov 4 (Lane 1, evidence): the fixed town Brookside, Delaware (replay 4d50e1f88df997f9, `node --import tsx src/bench/path-check.ts` on main 80dd12c83a with NODE_OPTIONS=--max-old-space-size=8192) ran out of its 8 GB heap after 74 minutes (Mark-Compact 7,496 MB to 7,465 MB, 'Ineffective mark-compacts near heap limit'), before printing its place; run alone, twice. The other seven fixed towns ran to the end in 87 to 2,270 seconds.
