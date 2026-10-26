---
id: core-speed-drive-write-checks-in-play
title: "A drive's daily rewrite checks its source event against what the person knows only with bookkeeping on"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The drives engine (src/core2/modules/drives.ts, writeDrive) rewrites every held drive each day as it fades, and the core's updateDrive (src/core2/state.ts) checks each write's source event against the event list and the person's knowledge, building a fact key string every time. In Johnstown, Ohio (key 3939340, drawn from all 56 by seed band-2026-10-26), on main with every open speed change, updateDrive takes 0.16 s of year one and 2.32 s of year three, 1.78 s of it that knowledge check, as held drives pile up (a drive lives about six half-lives before it retires). The check never fails in play: a drive forms only from an event the person lived through.

**Rules.** Bookkeeping is a debug switch: validation runs in tests and the bench, not in play. Speed: year three within 1.2 times year one. An exact cut keeps every deep fingerprint identical.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) every deep fingerprint is identical before and after; a CPU profile of Johnstown, Ohio's third year (seed band-2026-10-26) shows updateDrive's inclusive time lower; and the drives tests pass with bookkeeping on.

**Files.** src/core2/state.ts

**Notes.** Filed Oct 26 by the speed lead from Johnstown's year one and year three profiles (speed-year-three-within-band). Six open PRs (#5972, #5979, #6010, #6043, #6067, #6096) change state.ts in other hunks; each merges with this change without conflict.
