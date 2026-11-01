---
id: core-speed-large-town-year-heap-nightly
title: "Every place nightly: a large town runs out of a 3 GB heap in its first year (Framingham, Massachusetts)"
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

**What.** The Every place nightly runs each place with a 3072 MB heap. On Oct 28 (run 40706056832, run seed 5a7c867eec0d34f1) Framingham, Massachusetts (place 2524960, seed 8592bf2c832a) played year 1 in 172.4 seconds and its worker then died with ERR_WORKER_OUT_OF_MEMORY; on Oct 27 (run 40512841605) place 1727644 in Illinois (seed e5fb09d48217) crashed the same way. Small towns finish two years under 2 GB, so the growth is in something that scales with the town's size or with the days played, and a player in a large town would hit it.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20% slower; never scan the whole world or its history every day, use indexes or act on the day something changed. One rule, all 56 places: the fix holds for the largest towns the draw can pick, named with place and seed.

**Done when.** npm run all-places -- --years 2 --seed 5a7c867eec0d34f1 --only US-MA --heap-mb 3072 finishes both years for Framingham, Massachusetts with its heap printed, and the PR body names by file and line the table or index that grew, with its row counts before and after from moduleTableSizes; a second large drawn place that crashed the same way (place 1727644 in Illinois, seed e5fb09d48217) finishes its two years too, named with its seed.

**Files.** scripts/core2-year/all-places.mjs,scripts/core2-year/all-places-worker.ts,src/core2/module-state.ts

**Notes.** lead: speed. Filed by the standing red-main owner Oct 28 16:30 UTC from the nightly log. Read: OWNER-DECISIONS (through Oct 28 05:30 UTC); searched docs/pool/items for heap out of memory, memory growth, Framingham: none open for a large town's year.

Nov 1 (speed lead): more nightly evidence, all at the nightly's 4,096 MB worker heap. Oct 31 (run 41207372407, run seed ccf3873193e1a818): Chamblee, Georgia (1315172, seed ab93bcad888d) ran out of memory before year 1. Nov 1 (run 41316330982, run seed 67d5d83fdbecbe3c): Colorado 0885760 (seed ddbce77d373e) and Massachusetts 2543755 (seed 15aa69e2b608) ran out of memory before year 1; Hayfield, Virginia, Rosedale Colony, South Dakota, Tualatin, Oregon and Highland Acres, Delaware ran year 2 in 200 to 270 s with 2.3 to 2.5 GB heaps. One cause found in Storrs, Connecticut: every evicted counted household was filled in as full people (5,804 by the end of year 1 from 1,747). The fix, an evicted counted household stays counted (core-evicted-counted-stays-counted, CTO ruling Nov 1 14:20), cut Storrs's first year from 607 s to 208 s. Replay each of these places alone with its nightly world seed on that branch next (the speed-work skill's replay line), with records per table each year, to see what else grows.

Nov 1, 20:20 UTC (speed lead): Chamblee, Georgia (1315172, nightly world seed ab93bcad888d) replayed alone on main 1a2fc71d6e with an 8 GB heap, records per table each year (scratchpad nightly/place.mts). Year 1 ran 208.7 s and ended with a 1,013 MB heap after collection, 2,586 full people and 473,739 records. Year 2 (2026, an election year) ran 851.6 s and ended with 2,815 MB, 3,082 full people and 1,572,958 records. Full people barely grew; the records did. The year-2 growth by table: core.durableLog 29,163 to 360,967; campaigns foldedCauses 618 to 173,072; campaigns doors 36,676 to 151,524; core.relationships 23,400 to 135,432; campaigns pledges 7,044 to 51,519; news.heard 20,459 to 61,055; cashJournal detailedReceipts 2,085 to 40,410; campaigns causeSummaries 315 to 36,260. The doors, pledges and foldedCauses rows are the closed-race fold under way (core-long-run-closed-race-rows-fold); the durable log's mix by kind and visibility is next, from the same replay with the log counted by kind. Colorado 0885760 and Massachusetts 2543755 follow on main, then all three on the evicted-counted branch (PR #7041).
