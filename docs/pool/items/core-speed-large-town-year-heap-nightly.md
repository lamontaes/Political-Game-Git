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

**Done when.** npm run all-places -- --years 2 --seed 5a7c867eec0d34f1 --only US-MA --heap-mb 3072 finishes both years for Framingham, Massachusetts with its heap printed, and the PR body names by file and line the table or index that grew, with its row counts before and after from moduleTableSizes.

**Files.** scripts/core2-year/all-places.mjs,scripts/core2-year/all-places-worker.ts,src/core2/module-state.ts

**Notes.** lead: speed. Filed by the standing red-main owner Oct 28 16:30 UTC from the nightly log. Read: OWNER-DECISIONS (through Oct 28 05:30 UTC); searched docs/pool/items for heap out of memory, memory growth, Framingham: none open for a large town's year.
