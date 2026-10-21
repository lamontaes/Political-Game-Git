---
id: core-speed-opelika-year-memory-growth
title: "Opelika, Alabama's year at the sample size takes about 27 minutes and its heap grows from 0.9 GB in July to 4.9 GB by October"
area: core
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/opelika-memory
pr: #5787
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T07:12:50.915Z
---

**What.** A played year of Opelika, Alabama (place 0157048, seed op1) at the sample size, buildBenchWorld two-level, took about 27 minutes on a 4-core container, against the two-minute rule. The first six 30-day months ran in 15 to 23 seconds each; from August the live heap after collection grows from about 0.9 GB to about 4.9 GB by October and the months slow down, and a vitest run of the year runs out of memory at a 5 GB heap. Clean main showed the same curve, so it is not from the change that found it. Find what accumulates from August (a table, an index or a history kept per day) and make it act on the day something changed or drop what nothing reads.

**Rules.** Speed: a town's game year runs in under two minutes and no change makes it more than 20 percent slower; never scan or keep a whole history every day. Replace, never layer: the growing store is fixed at its source, not trimmed after.

**Done when.** A sampling heap profile of the Opelika year (seed op1) before and after names the record that grows by file and function, the year runs in under two minutes with its heap flat after August, and npm run speed:year on the same seed is no slower; the PR names the place, seed and measurements.

**Files.** src/core2/state.ts, src/core2/module-state.ts

**Notes.** Found working world-census-scale-closures-rise (PR #5553), whose pinned Opelika case plays 220 days because of it.
