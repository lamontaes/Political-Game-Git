---
id: core-speed-gc-churn
title: "Garbage collection is 21 percent of a dense town's year (52 of 251 seconds): find what allocates per day"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b, 251 seconds), the garbage collector takes 52 seconds, the largest single line. Something allocates large short-lived arrays, maps or objects every day, such as a per-day copy of a table or a list built and thrown away. Take an allocation profile of the same year, name the three biggest allocators by file and function, and change each to reuse its storage or act on the day something changed.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the wasteful path is deleted, not kept beside the new one.

**Done when.** An allocation profile of npm run speed:year -- --seed m7b --exclusive before and after names the three allocators and shows garbage collection below 10 percent of the year, with the year faster by the same measure and the golden-path suite and the money-balance tests still passing.

**Files.** src/core2/state.ts, src/core2/journal-state.ts, src/core2/module-state.ts, src/core2/life.ts

**Notes.** TODO

**Notes.** Measured Oct 20 (claude/m7-speed), seed m7b, Long Hill, Connecticut, `--trace-gc`: 4,539 scavenges took 32 seconds (about 7 ms each, so many objects survive each one and are copied) and 12 mark-compacts took 0.5 seconds; the heap peaks near 2.5 GB. So the cost is young-generation churn, not old-space marking. A larger young generation helps a little: `--max-semi-space-size=128` ran the year in 169 seconds against 182 to 214 without it (run to run noise is about 10 percent, so repeat before relying on it). Where the game's play process is started (the desktop shell's play API and the bench server) the flag would have to be set there. The lasting fix is fewer allocations per day: take `--heap-prof` or `--sampling-heap-profiler` of the same year to name the three biggest allocators.
