---
id: core-speed-observe-checks-in-play
title: "Every fact a person learns is validated and copied in play"
area: core
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The core API's observe (src/core2/state.ts) runs for every fact anyone learns: each story heard and each of its facts, each conversation, each event a person perceives. In play it still parses the fact's learned-at date, refuses a fact dated after today, and stores a copy of the fact rather than the fact. Its own time is 1.36 s of Long Hill, Connecticut's profiled year (seed m7b), and every caller passes a new object literal, so the copy guards nothing. Run the date checks and the copy only with bookkeeping on, as the owner's rule says, and store the caller's fact in play.

**Rules.** Bookkeeping is a debug switch: validation and copying run in tests and the bench, not in play. No dice: every person's knowledge holds the same facts with the same values. Speed: measured before and after on the same base and machine, both checkouts in one process.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; in a paired run's CPU profile split by checkout, observe's own time falls by more than a third and the year is no slower; the news, knowledge and state tests pass.

**Files.** src/core2/state.ts

**Notes.** Filed Oct 25 by the speed lead; all 39 callers outside tests pass an object literal (grep of api.observe).

Built and measured Oct 25 (speed lead), not shipped: branch `claude/speed-observe-in-play` at b34c71d947 is exact (deep fingerprints identical: Long Hill year one `3350c66a3805f1e8`; Stanardsville years one to three `176370fb6d3c2ba1`, `3ccb0a9002236aa5`, `4be9e9254da3aaf3`), but in a profiled pair of Long Hill's year (152.8 against 150.8 s, 0.987) `observe` falls only from 1.7 to 1.4 s (18 percent), short of this item's third. Most of its time is the write into each person's knowledge map, not the checks or the copy. Recommend dropping the item; claim released.

Dropped by the Oct 25 audit: the speed lead measured it short of its third and recommended dropping it.
