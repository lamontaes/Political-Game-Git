---
id: core-speed-opening-heap-pooled
title: "A dense town's long-lived opening data is held in far fewer objects so garbage collection skips most of it"
area: core
kind: feature
priority: 2
size: L
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Long Hill, Connecticut (seed m7b) takes 203 seconds a game year against the 120-second limit, and about 28 seconds of that is garbage collection. A live-heap profile shows the days add little that stays, so the roughly 900 MB heap is the opening world built before play starts, held as per-person and per-record objects that every major collection traces. Move the opening's long-lived data into columns or pooled arrays (the counted store already does this for people) and keep per-person records only for people filled in, so major collections walk far fewer objects.

**Rules.** Replace, never layer: the old per-record holders are deleted as each moves. One model, two tiers: nothing here changes what any person or household does. Speed: measured on the same machine one process at a time with npm run speed:year -- --seed m7b --exclusive.

**Done when.** npm run speed:year -- --seed m7b --exclusive runs Long Hill's played world for one game year in under 120 seconds in three runs and seed m7a stays within 20 percent of its 52 seconds, with the garbage-collection seconds before and after in the PR body.

**Files.** src/core2/counted-groups.ts,src/core2/module-data.ts,src/core2/choice.ts

**Notes.** TODO

Speed lead, Oct 24: the premise does not hold in play. A `--trace-gc` run of Long Hill, Connecticut (seed m7b, main 185d76d7ce, 64 MiB young generation, the first 60 days after the build) shows no full mark-compact collection of the main heap during play: the last one is during the build (1,024 to 915 MB, 157 ms). Play's garbage collection is 140 young-generation scavenges in 60 days, 2.67 s together (about 19 ms each, roughly 16 s a year, which matches the 21 s the CPU profile charges the collector). So the cost is short-lived allocation and what survives a scavenge, not major collections walking the opening heap; moving the opening into columns would not shorten the year. The cuts that do are in `core-speed-allocation-volume-flat`'s parts. Recommend dropping this item (CTO).
