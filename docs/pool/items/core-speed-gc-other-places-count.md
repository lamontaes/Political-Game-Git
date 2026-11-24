---
id: core-speed-gc-other-places-count
title: "Other places' vote count refills one appeal record per count and reads first place without sorting (garbage collection, records identical)"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: speed/counted-appeal-reuse
pr: #8092
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-10T01:16:07.118Z
---

**What.** An election year allocates about 77 GB (Gunnison UT, key 4932660, seed n8f6, year 4, sampled), and garbage collection is 13 s of it. The largest source is countPlaces, which counts other places' races from the town's sample: each sample voter's appeal record (7.6 GB), a sort of it in countedChoice (5.2 GB) and its entries and values lists (2 GB). Refill one appeal record per count, read first place and the stakes in one pass with no list, and sum housing's counted residents by place once per change to the counts instead of walking every household for every place built in.

**Rules.** Exact (CTO, Nov 9 7:40 p.m.): the same world on the same commit writes the same records before and after (speed-work records proof); only timing differs. One rule, all 56 places. No dice.

**Done when.** speed:year on Gunnison, Utah (key 4932660, seed n8f6) and Dickey, North Dakota (seed n8g7), four years each, on main and the branch on the same commit with --same-records gives identical fingerprints every year, with two alternating timed pairs at Gunnison in the PR body.

**Files.** src/core2/electorate.ts, src/core2/turnout.ts, src/core2/housing-construction.ts

**Notes.** TODO
