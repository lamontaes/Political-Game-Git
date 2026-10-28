---
id: core-bench-world-large-town-heap
title: "Building the bench world for a 30,000-person town needs more than Node's default heap (Fountain, Colorado)"
area: core
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** buildBenchWorld with twoLevel on for Fountain, Colorado (place key 0827865, drawn from seed cc33 with purpose voter-groups) runs out of memory in a vitest worker on Node's default heap of about 4 GB, on main 69d62df224. It passes with an 8 GB heap. Any test or command that draws a large place from all 56 inherits this, so specs fail by draw. Find what the opening holds for a large town and bring it under the default heap, or record the ceiling the speed lead accepts.

**Rules.** Speed: a town's year runs under two minutes and the opening must not scan or hold the whole world needlessly; MEMORY-FLAT's ceilings apply to every drawn place. One rule, all 56 places: the largest drawn place must build.

**Done when.** buildBenchWorld with twoLevel on builds Fountain, Colorado (key 0827865) and the largest place in the corpus under Node's default heap, measured after collection and named with seed in the PR body; src/core2/voter-groups.test.ts passes there without NODE_OPTIONS. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/bench/world.ts, src/core2/modules/residents.ts

**Notes.** Found by the M0-M2 lead's voter-groups helper, Oct 24. Belongs with the speed lead's memory work.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `core-played-year-large-town-heap-bound`; close into it and carry any line it lacks there.
